const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const scoringEngine = require('../services/scoringEngine');

// Routes
router.post('/', matchController.createMatch);
router.get('/', matchController.listMatches);
router.get('/seasons', matchController.listSeasons);
router.get('/players', matchController.listPlayers);
router.get('/:id', matchController.getMatch);
router.post('/:id/players', matchController.addPlayerToMatch);
router.post('/:id/balls', (req, res) => scoringEngine.submitBall(req, res));
router.put('/:match_id/balls/:id', (req, res) => scoringEngine.updateBall(req, res));
router.delete('/:match_id/balls/:id', (req, res) => scoringEngine.deleteBall(req, res));
router.post('/:id/end-over', matchController.endOver);
router.post('/:id/start-over', matchController.startOver);
router.post('/:id/start-innings', matchController.startInnings);
router.post('/:id/complete', matchController.completeMatch);
router.post('/:id/cancel', matchController.cancelMatch);
router.put('/:id/current-players', matchController.updateCurrentPlayers); // New Endpoint
router.delete('/:id', matchController.deleteMatch);

module.exports = router;
