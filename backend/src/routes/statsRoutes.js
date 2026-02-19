const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// Match Stats (Summary)
router.get('/match/:id', statsController.getMatchStats);

// Season Stats (Leaderboard) - :season_id can be 'active'
router.get('/:season_id', statsController.getSeasonStats);

// Player Profile Stats
router.get('/player/:id', statsController.getPlayerStats);

module.exports = router;
