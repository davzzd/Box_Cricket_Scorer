const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        console.log('Creating overs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS overs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                match_id UUID REFERENCES matches(id),
                innings INTEGER NOT NULL,
                over_number INTEGER NOT NULL,
                bowler_id UUID REFERENCES players(id),
                status VARCHAR(20) DEFAULT 'active', -- active, completed
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Overs table created successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
