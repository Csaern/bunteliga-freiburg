const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Holt die bereits in index.js initialisierte Firestore-Instanz
const db = getFirestore();

const checkAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Fehler bei der Token-Verifizierung:', error);
      res.status(403).send('Unauthorized: Invalid Token');
    }
  } else {
    res.status(401).send('Unauthorized: No Token Provided');
  }
};

const checkCaptain = async (req, res, next) => {
  const uid = req.user.uid;
  const teamId = req.params.teamId || req.body.teamId;

  if (!teamId) {
    return res.status(400).send('Bad Request: Team ID is missing.');
  }

  try {
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).send('Not Found: Team not found.');
    }

    const teamData = teamDoc.data();
    if (teamData.captains && teamData.captains.includes(uid)) {
      next();
    } else {
      res.status(403).send('Forbidden: You are not a captain of this team.');
    }
  } catch (error) {
    console.error('Error in checkCaptain middleware:', error);
    res.status(500).send('Internal Server Error');
  }
};

const checkAdmin = (req, res, next) => {
  // Prüft, ob der Benutzer durch checkAuth verifiziert wurde UND den admin-Claim hat.
  if (req.user && req.user.admin === true) {
    next(); // Ja, ist ein Admin, weiter zur Route.
  } else {
    res.status(403).send('Forbidden: Requires admin privileges.');
  }
};

// Die Funktionen exportieren, damit sie in anderen Dateien verwendet werden können
module.exports = {
  checkAuth,
  checkCaptain,
  checkAdmin, // checkAdmin hier hinzufügen
};