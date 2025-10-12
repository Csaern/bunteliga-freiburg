const express = require('express');
const router = express.Router();
const pitchService = require('../services/pitchService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
const { upload, uploadToFirebase } = require('../middleware/uploadMiddleware');

router.post('/', checkAuth, async (req, res) => {
    try {
        const pitchData = {
            ...req.body,
            createdBy: req.user.uid,
            isVerified: false,
        };
        const newPitch = await pitchService.createPitch(pitchData);
        res.status(201).json(newPitch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post(
  '/:pitchId/image',
  checkAuth,
  checkAdmin,
  upload.single('pitchImage'),
  uploadToFirebase('pitch-images'),
  async (req, res) => {
    try {
      if (!req.file || !req.file.firebaseUrl) {
        return res.status(400).json({ message: 'Keine Datei hochgeladen oder Upload fehlgeschlagen.' });
      }
      
      const { pitchId } = req.params;
      const imageUrl = req.file.firebaseUrl;

      const result = await pitchService.updatePitchImage(pitchId, imageUrl);
      res.status(200).json(result);

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;