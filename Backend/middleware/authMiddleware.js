const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Überprüft den Firebase ID Token und hängt ein vollständiges Benutzerobjekt an den Request an.
 * Das Benutzerobjekt ist eine Mischung aus den Auth-Claims und dem Firestore-Dokument.
 */
const checkAuth = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];

  try {
    // 1. Verifiziere den Token von Firebase Auth
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // 2. Hole das zugehörige Benutzerdokument aus Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    let userProfile = {};
    if (userDoc.exists) {
      userProfile = userDoc.data();
    }

    // 3. Kombiniere beides. Die Auth-Daten (besonders die Claims) sind die Wahrheit!
    // Sie überschreiben alles, was eventuell in Firestore steht.
    req.user = {
      ...userProfile,   // Daten aus der DB (teamId, role, etc.)
      ...decodedToken,  // Daten aus dem Token (uid, email, und der wichtige 'admin'-Claim)
    };

    // Zum Debuggen, um das finale Objekt zu sehen
    console.log('Final user object attached to request:', req.user);

    return next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(403).json({ message: 'Unauthorized: Invalid token.' });
  }
};

/**
 * Überprüft, ob der authentifizierte Benutzer Admin-Rechte hat.
 * Muss immer NACH checkAuth aufgerufen werden.
 */
const checkAdmin = (req, res, next) => {
  if (req.user && req.user.admin === true) {
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Requires admin privileges.' });
};

module.exports = { checkAuth, checkAdmin };