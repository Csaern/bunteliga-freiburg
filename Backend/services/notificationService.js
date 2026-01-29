const admin = require('firebase-admin');
const db = admin.firestore();
const notificationsCollection = db.collection('notifications');
const teamsCollection = db.collection('teams');

/**
 * Erstellt eine Benachrichtigung für ein Team
 * @param {string} teamId - Die ID des Teams, das die Benachrichtigung erhalten soll
 * @param {string} type - Der Typ der Benachrichtigung (z.B. 'booking_cancelled', 'result_pending', etc.)
 * @param {string} title - Der Titel der Benachrichtigung
 * @param {string} message - Die Nachricht der Benachrichtigung
 * @param {object} relatedData - Zusätzliche Daten (z.B. bookingId, resultId, etc.)
 * @returns {Promise<object>} Die erstellte Benachrichtigung
 */
async function createNotification(teamId, type, title, message, relatedData = {}) {
    const notificationData = {
        teamId,
        type,
        title,
        message,
        relatedData,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await notificationsCollection.add(notificationData);
    return { id: docRef.id, ...notificationData };
}

/**
 * Erstellt eine Benachrichtigung für alle Mitglieder eines Teams
 * @param {string} teamId - Die ID des Teams
 * @param {string} type - Der Typ der Benachrichtigung
 * @param {string} title - Der Titel der Benachrichtigung
 * @param {string} message - Die Nachricht der Benachrichtigung
 * @param {object} relatedData - Zusätzliche Daten
 * @returns {Promise<object>} Die erstellte Benachrichtigung
 */
async function notifyTeam(teamId, type, title, message, relatedData = {}) {
    return await createNotification(teamId, type, title, message, relatedData);
}

/**
 * Holt alle ungelesenen Benachrichtigungen für ein Team
 * @param {string} teamId - Die ID des Teams
 * @returns {Promise<Array>} Array von Benachrichtigungen
 */
async function getUnreadNotificationsForTeam(teamId) {
    const snapshot = await notificationsCollection
        .where('teamId', '==', teamId)
        .where('read', '==', false)
        .get();

    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // In-memory Sortierung, um Index-Abhängigkeit zu vermeiden
    return notifications.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeB - timeA;
    });
}

/**
 * Markiert eine Benachrichtigung als gelesen
 * @param {string} notificationId - Die ID der Benachrichtigung
 * @returns {Promise<void>}
 */
async function markAsRead(notificationId) {
    await notificationsCollection.doc(notificationId).update({
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Markiert alle Benachrichtigungen eines Teams als gelesen
 * @param {string} teamId - Die ID des Teams
 * @returns {Promise<void>}
 */
async function markAllAsReadForTeam(teamId) {
    const snapshot = await notificationsCollection
        .where('teamId', '==', teamId)
        .where('read', '==', false)
        .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
            read: true,
            readAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
}

module.exports = {
    createNotification,
    notifyTeam,
    getUnreadNotificationsForTeam,
    markAsRead,
    markAllAsReadForTeam,
};

