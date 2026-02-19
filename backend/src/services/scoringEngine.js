const db = require('../db');

const getMatchState = async (matchId) => {
    // Helper to rebuild state from balls
    const ballsRes = await db.query('SELECT * FROM balls WHERE match_id = $1 ORDER BY created_at ASC', [matchId]);
    const balls = ballsRes.rows;

    let innings1Score = 0;
    let innings1Wickets = 0;
    let innings1Overs = 0;

    let innings2Score = 0;
    let innings2Wickets = 0;
    let innings2Overs = 0;

    // Logic to calculate score based on special rules
    // Rule: Normal Over (Wide=1 ball), Final Over (Wide=0 balls)
    // Runs: wall_value + runs_taken + (is_wide/no_ball ? 2 : 0) - (is_dismissal ? 5 : 0)

    const calculateInnings = (inningBalls, totalOvers) => {
        let score = 0;
        let wickets = 0;
        let validBalls = 0;

        inningBalls.forEach(ball => {
            // Rule: If runs_taken = 0, then wall_value score is ignored.
            const runComponent = ball.runs_taken > 0 ? (ball.wall_value || 0) + ball.runs_taken : 0;
            let ballRuns = runComponent;

            // Extras
            if (ball.is_wide || ball.is_no_ball) {
                ballRuns += 2;
            }

            // Dismissals
            if (ball.is_dismissal) {
                ballRuns -= 5;
                wickets += 1;
            }

            score += ballRuns;

            // Ball Counting Logic
            const isLastOver = Math.floor(validBalls / 6) >= totalOvers - 1;

            if (isLastOver) {
                // Final Over Rules: Wide/No-ball do NOT count
                if (!ball.is_wide && !ball.is_no_ball) {
                    validBalls++;
                }
            } else {
                // Normal Over Rules: Wide/No-ball COUNT as 1 ball
                validBalls++;
            }
        });

        return { score, wickets, overs: Math.floor(validBalls / 6) + "." + (validBalls % 6) };
    };

    // Calculate Inning 1
    const i1Balls = balls.filter(b => b.innings === 1);
    const matchRes = await db.query('SELECT overs_team1, overs_team2 FROM matches WHERE id = $1', [matchId]);
    const { overs_team1, overs_team2 } = matchRes.rows[0];

    const i1Stats = calculateInnings(i1Balls, overs_team1);

    // Calculate Inning 2
    const i2Balls = balls.filter(b => b.innings === 2);
    const i2Stats = calculateInnings(i2Balls, overs_team2);

    // Get Active Over Info
    const activeOverRes = await db.query(
        `SELECT * FROM overs WHERE match_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [matchId]
    );

    let activeState = null;
    if (activeOverRes.rows.length > 0) {
        activeState = activeOverRes.rows[0]; // { innings, over_number, bowler_id ... }
    } else {
        // If no active over, check last completed over to infer state?
        // Or return null - meaning "Between Overs" or "Completed"
        const lastOverRes = await db.query(
            `SELECT * FROM overs WHERE match_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [matchId]
        );
        if (lastOverRes.rows.length > 0) {
            const last = lastOverRes.rows[0];
            activeState = { ...last, status: 'completed' };
        }
    }

    // Determine Batting Order & Result
    const matchInfo = matchRes.rows[0];
    let team1BattingFirst = true; // Team 1 = Team A
    if (matchInfo.toss_winner_team === 'A') {
        team1BattingFirst = matchInfo.toss_decision === 'bat';
    } else {
        team1BattingFirst = matchInfo.toss_decision === 'bowl';
    }

    const team1Score = team1BattingFirst ? i1Stats.score : i2Stats.score;
    const team2Score = team1BattingFirst ? i2Stats.score : i1Stats.score;

    let result = null;
    if ((activeState && activeState.status === 'completed') || matchInfo.status === 'completed') {
        if (team1Score > team2Score) {
            result = { winner: 'Team A', margin: `${team1Score - team2Score} runs` };
        } else if (team2Score > team1Score) {
            result = { winner: 'Team B', margin: `${team2Score - team1Score} runs` };
        } else {
            result = { winner: 'Match Drawn', margin: 'Scores Tied' };
        }
    }

    return {
        innings1: i1Stats,
        innings2: i2Stats,
        lastBall: balls[balls.length - 1],
        activeState,
        team1Score,
        team2Score,
        result
    };
};

const submitBall = async (req, res) => {
    const { match_id, innings, striker_id, non_striker_id, bowler_id, wall_value, runs_taken, is_wide, is_no_ball, is_dismissal, dismissed_player_id, dismissal_type, fielder_id } = req.body;

    try {
        // 1. Get Active Over
        const activeOverRes = await db.query(
            `SELECT * FROM overs WHERE match_id = $1 AND innings = $2 AND status = 'active' ORDER BY over_number DESC LIMIT 1`,
            [match_id, innings]
        );

        if (activeOverRes.rows.length === 0) {
            return res.status(400).json({ error: 'No active over found. Please start an over.' });
        }

        const activeOver = activeOverRes.rows[0];
        const over_number = activeOver.over_number;

        // 2. Count Balls in this over to determine ball_number
        const ballsRes = await db.query(
            `SELECT count(*) FROM balls WHERE match_id = $1 AND innings = $2 AND over_number = $3`,
            [match_id, innings, over_number]
        );
        const ball_number = parseInt(ballsRes.rows[0].count) + 1;

        // 3. Insert Ball
        const result = await db.query(
            `INSERT INTO balls (match_id, innings, over_number, ball_number, striker_id, non_striker_id, bowler_id, wall_value, runs_taken, is_wide, is_no_ball, is_dismissal, dismissed_player_id, dismissal_type, fielder_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
            [match_id, innings, over_number, ball_number, striker_id, non_striker_id, activeOver.bowler_id || bowler_id, wall_value, runs_taken, is_wide, is_no_ball, is_dismissal, dismissed_player_id, dismissal_type, fielder_id]
        );

        // 4. Update Match State & Notify
        const matchState = await getMatchState(match_id);

        // Update Persistence (Current Players)
        // Auto-Swap Logic:
        // If runs_taken is odd, swap striker and non-striker.
        // NOTE: This applies to valid balls. For now, we assume users manage wicket swaps manually via the new locked UI if complex.
        // But for normal runs, we autoswap.

        let nextStrikerId = striker_id;
        let nextNonStrikerId = non_striker_id;

        const totalRuns = (runs_taken || 0); // Wall value usually doesn't involve running, but if they ran? 
        // User said "odd run". Usually implies physical runs. 
        // If they hit a 4 (wall), they don't swap. If they run 1 or 3, they swap.
        // What if they run 1 + Overthrow 4? = 5 runs? They swap.
        // So we look at `runs_taken` specifically which tracks physical running + overthrows.
        // `wall_value` is separate boundary runs.

        if (totalRuns % 2 !== 0) {
            nextStrikerId = non_striker_id;
            nextNonStrikerId = striker_id;
        }

        // If it was a dismissal, providing a "Who is new striker" API is complex here.
        // For now, if dismissal, we might leave as is or set to NULL?
        // User asked for "Run Out" details.
        // If dismissal, we probably shouldn't auto-set the *next* striker blindly if the striker got out.
        // But for "Odd Run" request, it's mostly for normal play.
        // Let's apply swap logic. If someone got out, the frontend might override/prompt anyway.
        // Actually, if it's a wicket, the `striker_id` persists as the one who WAS striker.
        // The frontend detects `lastBall.is_dismissal` and prompts?
        // Let's stick to "Auto-Swap on Odd Runs" for now. Catch edge cases later.

        await db.query(
            `UPDATE matches SET current_striker_id = $1, current_non_striker_id = $2, current_bowler_id = $3 WHERE id = $4`,
            [nextStrikerId, nextNonStrikerId, bowler_id, match_id]
        );

        req.io.emit('matchUpdated', { match_id, ...matchState });
        req.io.emit('ballAdded', result.rows[0]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit ball' });
    }
};

const updateBall = async (req, res) => {
    const { id, match_id } = req.params;
    const { wall_value, runs_taken, is_wide, is_no_ball, is_dismissal, dismissed_player_id, dismissal_type, fielder_id } = req.body;

    try {
        const result = await db.query(
            `UPDATE balls SET 
             wall_value = $1, runs_taken = $2, is_wide = $3, is_no_ball = $4, is_dismissal = $5, dismissed_player_id = $6, dismissal_type = $7, fielder_id = $8
             WHERE id = $9 AND match_id = $10 RETURNING *`,
            [wall_value, runs_taken, is_wide, is_no_ball, is_dismissal, dismissed_player_id, dismissal_type, fielder_id, id, match_id]
        );

        const matchState = await getMatchState(match_id);
        req.io.emit('matchUpdated', { match_id, ...matchState });
        // We might want to emit a generic 'refresh' or specific 'ballUpdated'
        req.io.emit('ballEdited', result.rows[0]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update ball' });
    }
};

const deleteBall = async (req, res) => {
    const { id, match_id } = req.params;

    try {
        const result = await db.query(
            `DELETE FROM balls WHERE id = $1 AND match_id = $2 RETURNING *`,
            [id, match_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ball not found' });
        }

        const matchState = await getMatchState(match_id);
        req.io.emit('matchUpdated', { match_id, ...matchState });
        // Emit specific event if needed, or just matchUpdated covers it
        req.io.emit('ballDeleted', { id, match_id });

        res.json({ message: 'Ball deleted', id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete ball' });
    }
};

module.exports = {
    getMatchState,
    submitBall,
    updateBall,
    deleteBall
};
