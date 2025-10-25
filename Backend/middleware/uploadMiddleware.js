const multer = require('multer');

// KORREKTUR: Wir verwenden memoryStorage, um die Datei im Arbeitsspeicher (als Buffer)
// für die anschließende Verarbeitung mit 'sharp' verfügbar zu machen.
const storage = multer.memoryStorage();

// Filter, um nur Bilddateien zu akzeptieren
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilddateien sind erlaubt!'), false);
  }
};

const upload = multer({ 
  storage: storage, // Hier wird die korrigierte Speicher-Engine verwendet
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // 5 MB Limit
});

module.exports = { upload };