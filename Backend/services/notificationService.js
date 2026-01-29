const admin = require('firebase-admin');
const db = admin.firestore();
const emailService = require('./emailService');
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
 * Erstellt eine Benachrichtigung für alle Mitglieder eines Teams und sendet E-Mails.
 */
async function notifyTeam(teamId, type, title, message, relatedData = {}) {
    // 1. In-App Notification erstellen
    const notification = await createNotification(teamId, type, title, message, relatedData);

    // 2. E-Mail Benachrichtigung versenden (async, ohne await, damit der Request nicht blockiert)
    sendEmailNotification(teamId, type, title, message).catch(err => {
        console.error(`[NotificationService] Fehler beim Senden der Email für Team ${teamId}:`, err);
    });

    return notification;
}

/**
 * Sendet E-Mails an Teammitglieder basierend auf ihren Einstellungen.
 * @private
 */
async function sendEmailNotification(teamId, type, title, message) {
    // Mapping von Notification-Types zu User-Settings
    const settingMap = {
        'booking_request_created': 'gameRequests',
        'new_booking_request': 'gameRequests', // Fix: Match type used in bookingService
        'booking_confirmed': 'gameRequests',
        'booking_rejected': 'gameRequests',
        'booking_denied': 'gameRequests', // Fix: Match specific type used in bookingService
        'booking_cancelled': 'gameCancellations',
        'booking_expired': 'gameCancellations', // New mapping
        'result_reported': 'gameResults',
        'result_confirmed': 'gameResults',
        'result_rejected': 'gameResults',
        'admin_result_override': 'gameResults'
    };

    const settingKey = settingMap[type];
    if (!settingKey) {
        // Kein Mapping -> Keine Email (z.B. für interne System-Notifs)
        return;
    }

    try {
        // Hole alle User des Teams
        const usersSnapshot = await db.collection('users').where('teamId', '==', teamId).get();
        if (usersSnapshot.empty) return;

        const usersToNotify = [];
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            // Check if user has settings configured and the specific setting is enabled
            // Default to TRUE if setting is missing? Usually opted-in or default true.
            // Based on UserSettingsModal, default state was true.
            // Let's assume: if emailNotifications object is missing, default is TRUE (to encourage engagement),
            // OR checks logic:
            const prefs = user.emailNotifications || {};
            // If user has never saved settings, prefs[settingKey] is undefined.
            // Let's default to TRUE for these key interactions if undefined.
            const isEnabled = (prefs[settingKey] !== false); // Default true

            if (user.email && isEnabled) {
                usersToNotify.push(user.email);
            }
        });

        if (usersToNotify.length === 0) return;

        console.log(`[NotificationService] Sende Emails für '${type}' an ${usersToNotify.length} Mitglieder von Team ${teamId}.`);

        // Send Emails individual or bcc? Individual better for privacy and potential personalization later.
        // For now, simpler to loop.
        const emailPromises = usersToNotify.map(email => {
            const mailHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #00A99D;">${title}</h2>
                    <p>${message}</p>
                    <hr>
                    <p style="font-size: 12px; color: #888;">
                        Du erhältst diese Email, weil du Benachrichtigungen für <strong>"${settingKey}"</strong> aktiviert hast.
                        <br>
                        Du kannst deine Einstellungen in deinem <a href="${process.env.WEBSITE_URL || 'http://localhost:3000'}/settings">Profil ändern</a>.
                    </p>
                </div>
            `;

            return emailService.sendEmail({
                to: email,
                subject: `[Bunte Liga] ${title}`,
                text: `${title}\n\n${message}`,
                html: mailHtml
            }).catch(e => console.error(`Failed to send mail to ${email}`, e));
        });

        await Promise.all(emailPromises);

    } catch (error) {
        console.error('[NotificationService] Error traversing users for email:', error);
    }
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

