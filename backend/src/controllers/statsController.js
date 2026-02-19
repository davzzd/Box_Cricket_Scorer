const db = require('../db');
const scoringEngine = require('../services/scoringEngine');

exports.getSeasonStats = async (req, res) => {
    try {
        const seasonRes = await db.query('SELECT * FROM seasons WHERE is_active = true LIMIT 1');
        if (seasonRes.rows.length === 0) return res.status(404).json({ error: 'No active season' });
        const seasonId = seasonRes.rows[0].id;

        // Fetch Completed and Cancelled Matches for this season (but only count stats for Completed)
        const matchesRes = await db.query(
            'SELECT * FROM matches WHERE season_id = $1 AND status = $2 ORDER BY created_at ASC',
            [seasonId, 'completed']
        );
        const matches = matchesRes.rows;
        if (matches.length === 0) return res.json([]);

        const matchIds = matches.map(m => m.id);

        // Fetch All Balls
        const ballsRes = await db.query('SELECT * FROM balls WHERE match_id = ANY($1)', [matchIds]);
        const allBalls = ballsRes.rows;

        // Fetch All Match Players
        const matchPlayersRes = await db.query('SELECT mp.*, p.name FROM match_players mp JOIN players p ON mp.player_id = p.id WHERE mp.match_id = ANY($1)', [matchIds]);
        // Map: MatchID -> PlayerID -> Team ('A' or 'B')
        const playerTeamMap = {};
        matchPlayersRes.rows.forEach(mp => {
            if (!playerTeamMap[mp.match_id]) playerTeamMap[mp.match_id] = {};
            playerTeamMap[mp.match_id][mp.player_id] = mp.team;
        });

        // Initialize Stats Map
        const stats = {};
        const initPlayer = (id, name) => {
            if (!stats[id]) {
                stats[id] = {
                    id, name, matches: 0, wins: 0, losses: 0,
                    runs: 0, wickets: 0, dismissals: 0, catches: 0,
                    netImpactScore: 0
                };
            }
        };

        // 1. Process Matches for Result (Wins/Losses)
        // We need to calculate scores for each match to determine winner
        matches.forEach(match => {
            const matchBalls = allBalls.filter(b => b.match_id === match.id);
            // Calculate Scores
            const calcScore = (inning) => {
                const iBalls = matchBalls.filter(b => b.innings === inning);
                return iBalls.reduce((acc, b) => {
                    let run = (b.runs_taken > 0 ? (b.wall_value || 0) + b.runs_taken : 0); // Batsman Runs
                    if (b.is_wide || b.is_no_ball) run += 2; // Extras
                    if (b.is_dismissal) run -= 5;
                    return acc + run;
                }, 0);
            };

            // Determine Batting Order (Team A vs Team B)
            // Team 1 = 'A', Team 2 = 'B'
            let team1BattingFirst = true;
            if (match.toss_winner_team === 'A') {
                team1BattingFirst = match.toss_decision === 'bat';
            } else {
                team1BattingFirst = match.toss_decision === 'bowl';
            }

            const i1Score = calcScore(1);
            const i2Score = calcScore(2);

            const team1Score = team1BattingFirst ? i1Score : i2Score; // Team A
            const team2Score = team1BattingFirst ? i2Score : i1Score; // Team B

            let winnerTeam = null; // 'A' or 'B'
            if (team1Score > team2Score) winnerTeam = 'A';
            else if (team2Score > team1Score) winnerTeam = 'B';

            // Assign Wins/Losses/Matches
            if (playerTeamMap[match.id]) {
                Object.entries(playerTeamMap[match.id]).forEach(([pid, team]) => {
                    // Initialize player if not exists (using name from map)
                    const pName = matchPlayersRes.rows.find(p => p.player_id === pid)?.name;
                    initPlayer(pid, pName);

                    stats[pid].matches++;
                    if (winnerTeam) {
                        if (team === winnerTeam) stats[pid].wins++;
                        else stats[pid].losses++;
                    }
                });
            }
        });

        // 2. Process Balls for Individual Stats
        allBalls.forEach(ball => {
            // Batsman Runs
            if (ball.striker_id) {
                // Ensure player exists in stats (might count even if not in match_players strictly? Should be there)
                // We rely on match loops initialization, but safety check:
                if (!stats[ball.striker_id]) {
                    // Need name? Just use ID if name missing or fetch if needed
                    // Assume match loop covered it
                }

                if (stats[ball.striker_id]) {
                    const runComponent = ball.runs_taken > 0 ? (ball.wall_value || 0) + ball.runs_taken : 0;
                    stats[ball.striker_id].runs += runComponent;
                    if (ball.is_dismissal) stats[ball.striker_id].dismissals++;
                }
            }

            // Bowler Wickets
            if (ball.is_dismissal && ball.bowler_id && stats[ball.bowler_id]) {
                stats[ball.bowler_id].wickets++;
            }

            // Catches
            if (ball.is_dismissal && ball.dismissal_type === 'catch' && ball.fielder_id && stats[ball.fielder_id]) {
                stats[ball.fielder_id].catches++;
            }
        });

        // 3. Calculate Derived Stats
        Object.values(stats).forEach(p => {
            p.netImpactScore = p.runs - (5 * p.dismissals) + (5 * p.wickets);
            p.avgRuns = p.matches > 0 ? (p.runs / p.matches).toFixed(1) : 0;
        });

        // Sort
        const sortedStats = Object.values(stats).sort((a, b) => b.netImpactScore - a.netImpactScore);
        res.json(sortedStats);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to calc stats' });
    }
};


exports.getMatchStats = async (req, res) => {
    const { id } = req.params;
    try {
        const matchState = await scoringEngine.getMatchState(id);
        const { result, team1Score, team2Score, innings1, innings2 } = matchState;

        // Fetch Match Details for Overs Limit
        const matchInfoRes = await db.query('SELECT * FROM matches WHERE id = $1', [id]);
        const matchInfo = matchInfoRes.rows[0];
        const getOversLimit = (inn) => {
            if (inn === 1) return parseInt(matchInfo.overs_team1 || matchInfo.overs);
            return parseInt(matchInfo.overs_team2 || matchInfo.overs);
        };

        // Fetch players and balls
        const ballsRes = await db.query('SELECT * FROM balls WHERE match_id = $1 ORDER BY created_at ASC', [id]);
        const balls = ballsRes.rows;

        const playersRes = await db.query('SELECT mp.*, p.name FROM match_players mp JOIN players p ON mp.player_id = p.id WHERE mp.match_id = $1', [id]);
        const players = playersRes.rows;

        const pStats = {};
        // Init Players
        players.forEach(p => {
            pStats[p.player_id] = {
                id: p.player_id,
                name: p.name,
                team: p.team,
                runs: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                wickets: 0,
                runsConceded: 0,
                maidens: 0,
                oversBowled: 0,
                ballsBowled: 0, // Track legal balls bowled
                catches: 0,
                dismissals: 0,
                dots: 0
            };
        });

        const matchStats = {
            totalSixes: 0,
            totalFours: 0,
            totalDots: 0,
            totalWickets: 0,
            totalExtras: 0
        };

        // Track runs conceded per over to calculate maidens
        // Map: bowlerId -> { innings -> { overIndex -> runs } }
        const overStats = {};

        // Track valid balls per innings to determine Last Over
        const inningsValidBalls = { 1: 0, 2: 0 };

        balls.forEach(ball => {
            const runsOffBat = ball.runs_taken > 0 ? (ball.wall_value || 0) + ball.runs_taken : 0;
            // Strict Wall Value for Boundaries (as per user request)
            // If it's a wall hit, wall_value should be > 0.
            const isFour = ball.wall_value === 4;
            const isSix = ball.wall_value === 6;

            const isWide = ball.is_wide;
            const isNoBall = ball.is_no_ball;
            const extraRuns = (isWide || isNoBall) ? 2 : 0;
            const totalRuns = runsOffBat + extraRuns; // Runs against bowler for this ball

            // Determine if ball counts as a legal delivery (for over progression)
            const inn = ball.innings;
            const limit = getOversLimit(inn);
            const currentValid = inningsValidBalls[inn] || 0;

            // Check if we are in the last over
            // Logic: floor(valid / 6) gives completed overs. If == limit - 1, we are in final over.
            const isLastOver = Math.floor(currentValid / 6) >= (limit - 1);

            let isBallCounted = false;
            if (isLastOver) {
                // Final Over: Wides/No-Balls do NOT count
                if (!isWide && !isNoBall) isBallCounted = true;
            } else {
                // Normal Over: Wides/No-Balls DO count
                isBallCounted = true;
            }

            if (isBallCounted) {
                inningsValidBalls[inn] = currentValid + 1;
            }

            // Batting Stats
            if (pStats[ball.striker_id]) {
                pStats[ball.striker_id].runs += runsOffBat;

                // Use isBallCounted (which includes Wides/NBs in normal overs) for balls faced
                if (isBallCounted) {
                    pStats[ball.striker_id].ballsFaced++;
                    if (runsOffBat === 0) {
                        pStats[ball.striker_id].dots++;
                        matchStats.totalDots++;
                    }
                }

                if (isFour) {
                    pStats[ball.striker_id].fours++;
                    matchStats.totalFours++;
                }
                if (isSix) {
                    pStats[ball.striker_id].sixes++;
                    matchStats.totalSixes++;
                }

                if (ball.is_dismissal) {
                    pStats[ball.striker_id].dismissals++;
                    matchStats.totalWickets++;
                }
            }

            // Bowling Stats
            if (ball.bowler_id && pStats[ball.bowler_id]) {
                pStats[ball.bowler_id].runsConceded += totalRuns;

                if (isBallCounted) {
                    pStats[ball.bowler_id].ballsBowled++;
                }

                if (ball.is_dismissal && ball.dismissal_type !== 'run_out') {
                    pStats[ball.bowler_id].wickets++;
                }

                // Track Over Stats for Maidens
                if (!overStats[ball.bowler_id]) overStats[ball.bowler_id] = {};
                // Use a unique key for innings + over (e.g., "1-0" for Innings 1, Over 0)
                const overKey = `${ball.innings}-${ball.over_number}`; // balls usually have over_number? Check schema.
                // Assuming ball has over_number (0-indexed or 1-indexed)
                if (overStats[ball.bowler_id][overKey] === undefined) {
                    overStats[ball.bowler_id][overKey] = 0;
                }
                overStats[ball.bowler_id][overKey] += totalRuns;
            }

            // Fielding
            if (ball.is_dismissal && ball.dismissal_type === 'catch' && ball.fielder_id && pStats[ball.fielder_id]) {
                pStats[ball.fielder_id].catches++;
            }

            if (extraRuns > 0) matchStats.totalExtras += extraRuns;
        });

        // Post-process Maidens & Overs
        Object.keys(pStats).forEach(pid => {
            const p = pStats[pid];
            if (p.ballsBowled > 0 || overStats[pid]) {
                // Calculate Overs (e.g. 1.2)
                const validBalls = p.ballsBowled || 0; // standard balls (no wides/NB)
                const overs = Math.floor(validBalls / 6);
                const balls = validBalls % 6;
                p.oversBowled = `${overs}.${balls}`;
            }

            if (overStats[pid]) {
                const overs = overStats[pid];
                Object.values(overs).forEach(runs => {
                    if (runs === 0) p.maidens++;
                });
            }
        });

        const playerList = Object.values(pStats);

        // Determine Batting Order
        const team1BattingFirst = (matchInfo.toss_winner_team === 'A' && matchInfo.toss_decision === 'bat') ||
            (matchInfo.toss_winner_team === 'B' && matchInfo.toss_decision === 'bowl');

        const i1BattingTeam = team1BattingFirst ? 'A' : 'B';
        const i2BattingTeam = team1BattingFirst ? 'B' : 'A';

        res.json({
            matchId: id,
            result: result || { winner: 'TBD', margin: '-' },
            // Team Scores from scoringEngine are reliable
            team1Score: matchState.team1Score,
            team2Score: matchState.team2Score,
            innings1: { ...matchState.innings1, battingTeam: i1BattingTeam },
            innings2: { ...matchState.innings2, battingTeam: i2BattingTeam },
            matchStats,
            topScorers: [...playerList].sort((a, b) => b.runs - a.runs).slice(0, 5),
            topWicketTakers: [...playerList].sort((a, b) => b.wickets - a.wickets).slice(0, 5),
            topFielders: [...playerList].sort((a, b) => b.catches - a.catches).slice(0, 5),
            fullStats: playerList,
            balls: balls // Include raw balls for history
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get match stats' });
    }
};

exports.getPlayerStats = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Fetch Player
        const playerRes = await db.query('SELECT * FROM players WHERE id = $1', [id]);
        if (playerRes.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
        const player = playerRes.rows[0];

        // 2. Fetch Completed Matches for this Player
        const matchesRes = await db.query(`
            SELECT m.*, mp.team 
            FROM matches m
            JOIN match_players mp ON m.id = mp.match_id
            WHERE mp.player_id = $1 AND m.status = 'completed'
            ORDER BY m.created_at DESC
        `, [id]);

        const matches = matchesRes.rows;
        const matchIds = matches.map(m => m.id);

        // 3. Init Stats Container (New Structure)
        const stats = {
            core: {
                matchesPlayed: matches.length,
                matchesWon: 0,
                matchesLost: 0
            },
            batting: {
                totalRuns: 0,
                totalBallsFaced: 0,
                totalDismissals: 0,
                highestScore: 0,
                totalFours: 0,
                totalSixes: 0
            },
            bowling: {
                totalBallsBowled: 0,
                totalWicketsTaken: 0,
                totalRunsConceded: 0,
                totalWides: 0,
                totalNoBalls: 0,
                totalMaidens: 0
            },
            fielding: {
                catches: 0,
                runOuts: 0
            }
        };

        if (matches.length > 0) {
            // 4. Fetch All Balls
            const ballsRes = await db.query(`
                SELECT * FROM balls 
                WHERE match_id = ANY($1) 
                ORDER BY created_at ASC
            `, [matchIds]);
            const allBalls = ballsRes.rows;

            // Iterate matches to calc detailed stats
            for (const match of matches) {
                const matchBalls = allBalls.filter(b => b.match_id === match.id);

                // ... (Winner calc logic skipped, assumed same) ... 
                const calcScore = (inning) => {
                    return matchBalls.filter(b => b.innings === inning).reduce((acc, b) => {
                        let run = (b.runs_taken > 0 ? (b.wall_value || 0) + b.runs_taken : 0);
                        if (b.is_wide || b.is_no_ball) run += 2;
                        if (b.is_dismissal) run -= 5;
                        return acc + run;
                    }, 0);
                };

                // Logic for Toss/Batting Order
                let team1BattingFirst = true;
                if (match.toss_winner_team === 'A') team1BattingFirst = match.toss_decision === 'bat';
                else team1BattingFirst = match.toss_decision === 'bowl';

                const i1Score = calcScore(1);
                const i2Score = calcScore(2);
                const teamAScore = team1BattingFirst ? i1Score : i2Score;
                const teamBScore = team1BattingFirst ? i2Score : i1Score;

                let winner = null;
                if (teamAScore > teamBScore) winner = 'A';
                else if (teamBScore > teamAScore) winner = 'B';

                if (winner) {
                    if (match.team === winner) stats.core.matchesWon++;
                    else stats.core.matchesLost++;
                }


                // --- Calculate Individual Stats ---
                let mRuns = 0;
                let mBatted = false;

                // Track Over runs for this match for this player (bowling)
                const overRuns = {}; // overKey -> runs

                matchBalls.forEach(b => {
                    const runsOffBat = b.runs_taken > 0 ? (b.wall_value || 0) + b.runs_taken : 0;
                    const isWide = b.is_wide;
                    const isNoBall = b.is_no_ball;
                    const extraRuns = (isWide || isNoBall) ? 2 : 0;
                    const totalBallRuns = runsOffBat + extraRuns;

                    // Batting
                    if (b.striker_id === id) {
                        mBatted = true;
                        if (!b.is_wide) stats.batting.totalBallsFaced++;

                        stats.batting.totalRuns += runsOffBat;
                        mRuns += runsOffBat;

                        // Strict Boundaries
                        if (b.wall_value === 4) stats.batting.totalFours++;
                        if (b.wall_value === 6) stats.batting.totalSixes++;

                        if (b.is_dismissal && b.dismissed_player_id === id) {
                            stats.batting.totalDismissals++;
                        }
                    }
                    if (b.non_striker_id === id && b.is_dismissal && b.dismissed_player_id === id) {
                        stats.batting.totalDismissals++;
                        mBatted = true;
                    }

                    // Bowling
                    if (b.bowler_id === id) {
                        if (!b.is_wide && !b.is_no_ball) stats.bowling.totalBallsBowled++;
                        if (b.is_wide) stats.bowling.totalWides++;
                        if (b.is_no_ball) stats.bowling.totalNoBalls++;

                        stats.bowling.totalRunsConceded += totalBallRuns;

                        if (b.is_dismissal) {
                            if (b.dismissal_type !== 'run_out') stats.bowling.totalWicketsTaken++;
                        }

                        // Track for Maiden
                        // Assuming 'innings' and 'over_number' are present
                        const oKey = `${b.innings}-${b.over_number}`;
                        if (!overRuns[oKey]) overRuns[oKey] = 0;
                        overRuns[oKey] += totalBallRuns;
                    }

                    // Fielding
                    if (b.is_dismissal && b.fielder_id === id) {
                        if (b.dismissal_type === 'catch') stats.fielding.catches++;
                        if (b.dismissal_type === 'run_out') stats.fielding.runOuts++;
                    }
                });

                // Calc Maidens for this match
                Object.values(overRuns).forEach(runs => {
                    if (runs === 0) stats.bowling.totalMaidens++;
                });

                if (mBatted) {
                    if (mRuns > stats.batting.highestScore) stats.batting.highestScore = mRuns;
                }
            }
        }

        // 5. Derived Metrics

        // Batting
        // Net Impact = totalRuns - (5 * totalDismissals)
        stats.batting.netImpact = stats.batting.totalRuns - (5 * stats.batting.totalDismissals);

        // Net Runs Per Ball = netImpact / totalBallsFaced
        stats.batting.netRunsPerBall = stats.batting.totalBallsFaced > 0
            ? parseFloat((stats.batting.netImpact / stats.batting.totalBallsFaced).toFixed(2))
            : 0;

        // Bowling
        stats.bowling.totalMaidens = stats.bowling.totalMaidens || 0; // Ensure init

        // Bowling Impact = (5 * totalWicketsTaken) - totalRunsConceded
        stats.bowling.bowlingImpact = (5 * stats.bowling.totalWicketsTaken) - stats.bowling.totalRunsConceded;

        // Runs Conceded Per Ball = totalRunsConceded / totalBallsBowled
        stats.bowling.runsPerBall = stats.bowling.totalBallsBowled > 0
            ? parseFloat((stats.bowling.totalRunsConceded / stats.bowling.totalBallsBowled).toFixed(2))
            : 0;

        res.json({
            player: { id: player.id, name: player.name },
            ...stats
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch player stats', details: err.message });
    }
};
