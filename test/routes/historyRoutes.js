const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

// ÖFFENTLICHE ROUTE
router.get('/stats', historyController.getHistoryStats);
router.get('/ewige-tabelle', historyController.getEwigeTabelle);

module.exports = router;
