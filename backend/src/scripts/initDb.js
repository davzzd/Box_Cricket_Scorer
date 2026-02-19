const fs = require('fs');
const path = require('path');
const db = require('../db');

const initDb = async () => {
    try {
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema migration...');
        await db.query(sql);
        console.log('Database initialized successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
};

initDb();
