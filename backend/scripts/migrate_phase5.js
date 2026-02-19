const db = require('../src/db');

const migrate = async () => {
    try {
        console.log('Adding current player columns to matches table...');
        await db.query(`
            ALTER TABLE matches 
            ADD COLUMN IF NOT EXISTS current_striker_id UUID REFERENCES players(id),
            ADD COLUMN IF NOT EXISTS current_non_striker_id UUID REFERENCES players(id),
            ADD COLUMN IF NOT EXISTS current_bowler_id UUID REFERENCES players(id);
        `);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
