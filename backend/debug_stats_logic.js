const db = require('./src/db');
require('dotenv').config();

async function debugStats() {
    try {
        // 1. Get a completed match
        const matchRes = await db.query("SELECT id, toss_winner_team, toss_decision FROM matches WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1");
        if (matchRes.rows.length === 0) {
            console.log("No completed matches found.");
            return;
        }
        const match = matchRes.rows[0];
        console.log("Match ID:", match.id);
        console.log("Toss:", match.toss_winner_team, match.toss_decision);

        // 2. Logic from statsController
        const team1BattingFirst = (match.toss_winner_team === 'A' && match.toss_decision === 'bat') ||
            (match.toss_winner_team === 'B' && match.toss_decision === 'bowl');

        console.log("Team 1 Batting First?", team1BattingFirst);
        const i1BattingTeam = team1BattingFirst ? 'A' : 'B';
        const i2BattingTeam = team1BattingFirst ? 'B' : 'A';
        console.log("I1 Batting:", i1BattingTeam);
        console.log("I2 Batting:", i2BattingTeam);

        // 3. Check Players and Teams
        const playersRes = await db.query('SELECT mp.player_id, mp.team, p.name FROM match_players mp JOIN players p ON mp.player_id = p.id WHERE mp.match_id = $1', [match.id]);
        console.log("\nPlayers found:", playersRes.rows.length);
        const teamAPlayers = playersRes.rows.filter(p => p.team === 'A');
        const teamBPlayers = playersRes.rows.filter(p => p.team === 'B');
        console.log("Team A Count:", teamAPlayers.length);
        console.log("Team B Count:", teamBPlayers.length);

        if (teamAPlayers.length > 0) console.log("Sample Team A Player:", JSON.stringify(teamAPlayers[0]));
        if (teamBPlayers.length > 0) console.log("Sample Team B Player:", JSON.stringify(teamBPlayers[0]));

        console.log("Full Player List Teams:", playersRes.rows.map(p => p.team));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debugStats();
