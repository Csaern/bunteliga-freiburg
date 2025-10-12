const multer = require('multer');
const admin = require('firebase-admin');
const path = require('path');

// --- Konfiguration ---
const BUCKET_NAME = 'bunte-liga-freiburg.appspot.com'; // ERSETZE DIES MIT DEINEM BUCKET-NAMEN
const bucket = admin.storage().bucket(`gs://${BUCKET_NAME}`);

// 1. Multer konfigurieren, um die Datei im Speicher zu halten (nicht auf der Festplatte)
const multerStorage = multer.memoryStorage();

// 2. Dateifilter, um nur Bilder zu erlauben
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Fehler: Nur Bilddateien (jpeg, png, webp) sind erlaubt!'));
};

// 3. Die Multer-Instanz erstellen
const upload = multer({
  storage: multerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB Limit
  }
});

// 4. Die eigentliche Middleware, die die Datei zu Firebase hochlädt
const uploadToFirebase = (folder) => {
  return (req, res, next) => {
    if (!req.file) {
      return next(); // Keine Datei zum Hochladen, weiter zur nächsten Middleware
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${uniqueSuffix}${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype
      }
    });

    blobStream.on('error', (err) => {
      console.error(err);
      return next(err);
    });

    blobStream.on('finish', async () => {
      // Die Datei öffentlich zugänglich machen
      await blob.makePublic();
      
      // Die öffentliche URL zur Anfrage hinzufügen, damit die Route sie verwenden kann
      req.file.firebaseUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
      next();
    });

    blobStream.end(req.file.buffer);
  };
};

module.exports = {
  upload,
  uploadToFirebase
};