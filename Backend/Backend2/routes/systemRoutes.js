const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

// All routes require Admin privileges
router.use(checkAuth, checkAdmin);

router.get('/config/email', systemController.getEmailConfig);
router.post('/config/email', systemController.saveEmailConfig);
router.post('/config/email/test', systemController.testEmailConfig);

module.exports = router;
