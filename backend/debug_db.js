const db = require('./src/db');

async function checkMatchStatus() {
    try {
        console.log("Checking recent match status...");
        const res = await db.query('SELECT id, status, created_at FROM matches ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length > 0) {
            console.log("Most Recent Match:", res.rows[0]);
        } else {
            console.log("No matches found.");
        }
    } catch (e) {
        console.error("Query Failed!", e);
    }
}

checkMatchStatus();
