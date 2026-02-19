const db = require('../src/db');

const migrate = async () => {
    try {
        console.log('Creating overs table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS overs (
                id SERIAL PRIMARY KEY,
                match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
                innings INTEGER DEFAULT 1,
                over_number INTEGER NOT NULL,
                bowler_id INTEGER REFERENCES players(id),
                status TEXT DEFAULT 'active', -- 'active', 'completed'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add index for faster lookups
        await db.query(`CREATE INDEX IF NOT EXISTS idx_overs_match_active ON overs(match_id, status);`);

        console.log('Overs table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
