const db = require('../src/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Update matches table
        await db.query(`
            ALTER TABLE matches 
            ADD COLUMN IF NOT EXISTS overs INTEGER DEFAULT 6,
            ADD COLUMN IF NOT EXISTS toss_winner_team VARCHAR(10),
            ADD COLUMN IF NOT EXISTS toss_decision VARCHAR(10);
        `);
        console.log('Matches table updated.');

        // 2. Update balls table
        await db.query(`
            ALTER TABLE balls 
            ADD COLUMN IF NOT EXISTS fielder_id UUID REFERENCES players(id);
        `);
        console.log('Balls table updated.');

        console.log('Migration complete.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
