const db = require('../db');
const scoringEngine = require('../services/scoringEngine');

exports.createMatch = async (req, res) => {
    let { season_id, overs, team1Overs, team2Overs, toss_winner_team, toss_decision } = req.body;

    // Phase 4: 'overs' (per innings) is the single source of truth. 
    // Fallback to team1Overs if 'overs' not sent (backward combat)
    const finalOvers = overs || team1Overs || 6;

    try {
        if (!season_id) {
            const seasonRes = await db.query('SELECT * FROM seasons WHERE is_active = true LIMIT 1');
            if (seasonRes.rows.length > 0) {
                season_id = seasonRes.rows[0].id;
            } else {
                const newSeason = await db.query('INSERT INTO seasons (name, is_active) VALUES ($1, $2) RETURNING *', ['Season 1', true]);
                season_id = newSeason.rows[0].id;
            }
        }

        const result = await db.query(
            `INSERT INTO matches (season_id, overs, overs_team1, overs_team2, toss_winner_team, toss_decision) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [season_id, finalOvers, finalOvers, finalOvers, toss_winner_team, toss_decision]
        );
        const newMatch = result.rows[0];

        // START OVER 1 (Manual Control)
        // We initialize Over 1. Bowler is NULL initially, user selects later or we can patch it. 
        // For now, let's just create it so ball submission works.
        await db.query(
            `INSERT INTO overs (match_id, innings, over_number, status) VALUES ($1, 1, 1, 'active')`,
            [newMatch.id]
        );

        res.status(201).json(newMatch);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create match' });
    }
};

exports.listPlayers = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM players ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list players' });
    }
};

exports.getMatch = async (req, res) => {
    const { id } = req.params;

    try {
        const matchRes = await db.query('SELECT * FROM matches WHERE id = $1', [id]);
        if (matchRes.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const calculatedState = await scoringEngine.getMatchState(id);
        const playersRes = await db.query('SELECT * FROM match_players mp JOIN players p ON mp.player_id = p.id WHERE mp.match_id = $1', [id]);
        const ballsRes = await db.query('SELECT * FROM balls WHERE match_id = $1 ORDER BY created_at ASC', [id]);

        const matchData = {
            ...matchRes.rows[0],
            players: playersRes.rows,
            balls: ballsRes.rows,
            ...calculatedState
        };

        res.json(matchData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch match' });
    }
};

exports.addPlayerToMatch = async (req, res) => {
    const { id } = req.params;
    const { name, team } = req.body;

    try {
        let playerRes = await db.query('SELECT * FROM players WHERE name = $1', [name]);
        let player;

        if (playerRes.rows.length > 0) {
            player = playerRes.rows[0];
        } else {
            playerRes = await db.query('INSERT INTO players (name) VALUES ($1) RETURNING *', [name]);
            player = playerRes.rows[0];
        }

        await db.query('INSERT INTO match_players (match_id, player_id, team) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, player.id, team]);

        res.status(201).json(player);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add player' });
    }
};

exports.completeMatch = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('UPDATE matches SET status = $1 WHERE id = $2 RETURNING *', ['completed', id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

        const matchState = await scoringEngine.getMatchState(id);
        req.io.emit('matchUpdated', { match_id: id, ...matchState, status: 'completed' });
        req.io.emit('matchCompleted', { match_id: id });

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to complete match' });
    }
};

exports.cancelMatch = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('UPDATE matches SET status = $1 WHERE id = $2 RETURNING *', ['cancelled', id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

        const matchState = await scoringEngine.getMatchState(id);
        req.io.emit('matchUpdated', { match_id: id, ...matchState, status: 'cancelled' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to cancel match' });
    }
};

exports.deleteMatch = async (req, res) => {
    const { id } = req.params;
    console.log(`[DELETE] Request for match_id: ${id}`);
    try {
        // Sequential Delete to handle FK constraints (no CASCADE in schema)
        await db.query(`DELETE FROM balls WHERE match_id = $1`, [id]);
        await db.query(`DELETE FROM overs WHERE match_id = $1`, [id]);
        await db.query(`DELETE FROM match_players WHERE match_id = $1`, [id]);

        const result = await db.query(`DELETE FROM matches WHERE id = $1 RETURNING *`, [id]);

        if (result.rows.length === 0) {
            console.log(`[DELETE] Match ${id} not found.`);
            return res.status(404).json({ error: 'Match not found' });
        }

        // Notify clients? Maybe just for list refresh, socket for match details is irrelevant as it's gone
        req.io.emit('matchDeleted', { match_id: id });

        res.json({ message: 'Match deleted successfully', id });
    } catch (err) {
        console.error('[DELETE] Error:', err);
        res.status(500).json({ error: 'Failed to delete match', details: err.message });
    }
};

exports.listMatches = async (req, res) => {
    let { cursor, limit = 10, season_id } = req.query;
    limit = parseInt(limit);
    if (isNaN(limit) || limit < 1) limit = 10;

    try {
        let query = 'SELECT * FROM matches';
        let params = [];
        let conditions = [];

        if (cursor) {
            conditions.push(`created_at < $${params.length + 1}`);
            params.push(cursor);
        }

        if (season_id) {
            conditions.push(`season_id = $${params.length + 1}`);
            params.push(season_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit + 1); // Fetch one extra to check if there is a next page

        const result = await db.query(query, params);
        const matches = result.rows;

        let nextCursor = null;
        if (matches.length > limit) {
            matches.pop(); // Remove the extra one
            nextCursor = matches[matches.length - 1].created_at;
        }

        // Just return metadata, frontend can fetch details if needed
        res.json({ matches, nextCursor });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list matches' });
    }
};

exports.endOver = async (req, res) => {
    const { id } = req.params;
    const { over_number, innings } = req.body;

    try {
        // Mark current over as completed
        await db.query(
            `UPDATE overs SET status = 'completed' WHERE match_id = $1 AND over_number = $2 AND innings = $3`,
            [id, over_number, innings]
        );

        // Notify
        const matchState = await scoringEngine.getMatchState(id);
        req.io.emit('matchUpdated', { match_id: id, ...matchState });

        res.json({ message: 'Over ended' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to end over' });
    }
};

exports.startOver = async (req, res) => {
    const { id } = req.params;
    const { innings, over_number, bowler_id, striker_id, non_striker_id } = req.body;

    try {
        // Create new over
        const result = await db.query(
            `INSERT INTO overs (match_id, innings, over_number, bowler_id, status) VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
            [id, innings, over_number, bowler_id]
        );

        // Update Match Current Players (Persistence)
        if (striker_id && non_striker_id) {
            await db.query(
                `UPDATE matches SET current_striker_id = $1, current_non_striker_id = $2, current_bowler_id = $3 WHERE id = $4`,
                [striker_id, non_striker_id, bowler_id, id]
            );
        }

        // Notify
        const matchState = await scoringEngine.getMatchState(id);
        req.io.emit('matchUpdated', { match_id: id, ...matchState });

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to start over' });
    }
};

exports.updateCurrentPlayers = async (req, res) => {
    const { id } = req.params;
    const { striker_id, non_striker_id, bowler_id } = req.body;

    try {
        await db.query(
            `UPDATE matches SET current_striker_id = $1, current_non_striker_id = $2, current_bowler_id = $3 WHERE id = $4`,
            [striker_id, non_striker_id, bowler_id, id]
        );

        const matchState = await scoringEngine.getMatchState(id);
        req.io.emit('matchUpdated', { match_id: id, ...matchState });

        res.json({ message: 'Current players updated', current_striker_id: striker_id, current_non_striker_id: non_striker_id, current_bowler_id: bowler_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update players' });
    }
};

exports.startInnings = async (req, res) => {
    const { id } = req.params;
    const { innings } = req.body; // e.g. 2

    try {
        // Just create Over 1 for that innings
        const result = await db.query(
            `INSERT INTO overs (match_id, innings, over_number, status) VALUES ($1, $2, 1, 'active') RETURNING *`,
            [id, innings]
        );

        // RESET Current Players for New Innings
        // This forces the UI to prompt for new selection
        await db.query(
            `UPDATE matches SET current_striker_id = NULL, current_non_striker_id = NULL, current_bowler_id = NULL WHERE id = $1`,
            [id]
        );

        // Notify
        const matchState = await scoringEngine.getMatchState(id);
        req.io.emit('matchUpdated', { match_id: id, ...matchState });

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to start innings' });
    }
};

exports.listSeasons = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM seasons ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list seasons', details: err.message });
    }
};
