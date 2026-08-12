const express = require('express');
const router = express.Router();
const HolidayService = require('../services/holidayService');

router.get('/bw', async (req, res) => {
    try {
        const data = await HolidayService.getHolidays();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
