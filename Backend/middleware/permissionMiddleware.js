const admin = require('firebase-admin');
const db = admin.firestore();
const teamsCollection = db.collection('teams');
const pitchesCollection = db.collection('pitches'); // NEU

const checkCaptainOfActingTeam = async (req, res, next) => {
    const actingTeamId = req.body.actingTeamId || req.body.requestingTeamId || req.body.teamId;
    const userId = req.user.uid;

    if (!actingTeamId) {
        return res.status(400).json({ message: "Die ID des handelnden Teams fehlt." });
    }

    try {
        const teamDoc = await teamsCollection.doc(actingTeamId).get();
        if (!teamDoc.exists) {
            return res.status(404).json({ message: 'Das handelnde Team wurde nicht gefunden.' });
        }

        const teamData = teamDoc.data();
        // --- DIE KERNÄNDERUNG ---
        // Alt: teamData.captainId !== userId
        // Neu: Prüfen, ob der Benutzer im Array der Kapitäne ist.
        if (!teamData.captainIds || !teamData.captainIds.includes(userId)) {
            return res.status(403).json({ message: 'Du bist kein Kapitän dieses Teams und hast keine Berechtigung für diese Aktion.' });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Fehler bei der Überprüfung der Team-Berechtigung.' });
    }
};

/**
 * Middleware, die prüft, ob der eingeloggte Benutzer der Besitzer des Platzes ist
 * (d.h. Kapitän des zugehörigen Teams) oder ein Admin.
 */
const checkPitchOwnership = async (req, res, next) => {
    // Admins dürfen immer alles
    if (req.user.admin) {
        return next();
    }

    try {
        const { pitchId } = req.params;
        const userTeamId = req.user.teamId; // Aus den Custom Claims des Tokens

        if (!userTeamId) {
            return res.status(403).json({ message: 'Du bist keinem Team zugeordnet und kannst keine Plätze verwalten.' });
        }

        const pitchDoc = await pitchesCollection.doc(pitchId).get();
        if (!pitchDoc.exists) {
            return res.status(404).json({ message: 'Platz nicht gefunden.' });
        }

        // Prüfe, ob die Team-ID des Platzes mit der Team-ID des Benutzers übereinstimmt
        if (pitchDoc.data().teamId !== userTeamId) {
            return res.status(403).json({ message: 'Dieser Platz gehört nicht deinem Team. Du hast keine Berechtigung für diese Aktion.' });
        }

        // Benutzer ist autorisiert
        next();
    } catch (error) {
        res.status(500).json({ message: 'Fehler bei der Überprüfung der Platz-Berechtigung.' });
    }
};

module.exports = { 
    checkCaptainOfActingTeam,
    checkPitchOwnership // NEU
};