const admin = require('firebase-admin');
const db = admin.firestore();
const emailService = require('./emailService');
const notificationsCollection = db.collection('notifications');
const teamsCollection = db.collection('teams');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    try {
        fs.mkdirSync(logDir, { recursive: true });
    } catch (e) {
        console.error('Could not create logs directory:', e);
    }
}
const logFilePath = path.join(logDir, 'email_notifications.log');

function logEmail(to, subject, content) {
    const timestamp = new Date().toISOString();
    // Simple sanitization to remove newlines for log file one-liner
    const snippet = content ? content.replace(/\n/g, ' ').substring(0, 150) : '';
    const logEntry = `[${timestamp}] TO: ${to} | SUBJECT: ${subject} | CONTENT_SNIPPET: ${snippet}...\n`;

    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) console.error('Failed to write to email log:', err);
    });
}

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

    // Emit real-time event via Socket.IO
    if (io) {
        // Emit to the specific team room
        console.log(`[NotificationService] Sending event 'notification' to room: '${teamId}'`);

        // Debug: Check if room exists and has members
        const clients = io.sockets.adapter.rooms.get(teamId);
        const memberCount = clients ? clients.size : 0;
        console.log(`[NotificationService] Room '${teamId}' has ${memberCount} members`);

        io.to(teamId).emit('notification', { id: docRef.id, ...notificationData });
        console.log(`[NotificationService] Emitted socket event to team ${teamId}`);
    }

    return { id: docRef.id, ...notificationData };
}

let io = null;

function initSocket(socketIoInstance) {
    io = socketIoInstance;
    console.log('[NotificationService] Socket.IO initialized');
}

/**
 * Broadcasts a global update signal to all connected clients.
 * Used for refreshing tables or fixture lists globally.
 */
function broadcastUpdate(type) {
    if (io) {
        io.emit('global_update', { type, timestamp: Date.now() });
        console.log(`[NotificationService] 🌐 Broadcasted global_update: ${type}`);
    }
}

/**
 * Erstellt eine Benachrichtigung für alle Mitglieder eines Teams und sendet E-Mails.
 */
async function notifyTeam(teamId, type, title, message, relatedData = {}) {
    // 1. In-App Notification erstellen
    const notification = await createNotification(teamId, type, title, message, relatedData);

    // 2. E-Mail Benachrichtigung versenden (async, ohne await, damit der Request nicht blockiert)
    sendEmailNotification(teamId, type, title, message, relatedData).catch(err => {
        console.error(`[NotificationService] Fehler beim Senden der Email für Team ${teamId}:`, err);
    });

    return notification;
}

/**
 * Sendet E-Mails an Teammitglieder basierend auf ihren Einstellungen.
 * @private
 */
async function sendEmailNotification(teamId, type, title, message, relatedData = {}) {
    // Mapping von Notification-Types zu User-Settings
    const settingMap = {
        'booking_request_created': 'gameRequests',
        'new_booking_request': 'gameRequests',
        'booking_confirmed': 'gameRequests',
        'booking_rejected': 'gameRequests',
        'booking_denied': 'gameRequests',
        'booking_cancelled': 'gameCancellations',
        'booking_expired': 'gameCancellations',
        'result_reported': 'gameResults',
        'result_confirmed': 'gameResults',
        'result_rejected': 'gameResults',
        'admin_result_override': 'gameResults'
    };

    const settingKey = settingMap[type];
    if (!settingKey) {
        return;
    }

    try {
        const usersSnapshot = await db.collection('users').where('teamId', '==', teamId).get();
        if (usersSnapshot.empty) return;

        const usersToNotify = [];
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const prefs = user.emailNotifications || {};
            const isEnabled = (prefs[settingKey] !== false);
            if (user.email && isEnabled) {
                usersToNotify.push(user.email);
            }
        });

        if (usersToNotify.length === 0) return;

        console.log(`[NotificationService] Sende Emails für '${type}' an ${usersToNotify.length} Mitglieder von Team ${teamId}.`);

        // --- Build Rich HTML Content ---
        // --- Build Rich HTML Content ---
        const dashboardUrl = `${config.websiteUrl}/dashboard`;

        let introText = '';
        let detailsHtml = '';

        // Helper to get formatted date string
        const getDateStr = (d) => {
            if (!d) return 'Unbekannt';
            try {
                let dateObj;
                if (d && typeof d.toDate === 'function') dateObj = d.toDate();
                else if (d && d._seconds) dateObj = new Date(d._seconds * 1000);
                else dateObj = new Date(d);

                if (isNaN(dateObj.getTime())) return 'Ungültiges Datum';
                return dateObj.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            } catch (e) {
                return 'Fehlerhaftes Datum';
            }
        };

        const getTimeStr = (time, date) => {
            if (time) return time + ' Uhr';
            if (date) {
                try {
                    let dateObj;
                    if (date && typeof date.toDate === 'function') dateObj = date.toDate();
                    else if (date && date._seconds) dateObj = new Date(date._seconds * 1000);
                    else dateObj = new Date(date);

                    if (!isNaN(dateObj.getTime())) {
                        return dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
                    }
                } catch (e) { }
            }
            return '';
        };

        // Determine Intro Text based on Type
        switch (type) {
            case 'new_booking_request':
            case 'booking_request_created':
                introText = `<strong>${relatedData.homeTeamName || 'Ein Team'}</strong> möchte ein Spiel gegen euch bestreiten.`;
                break;
            case 'booking_confirmed':
                introText = `<strong>${relatedData.awayTeamName || 'Der Gegner'}</strong> hat eure Spielanfrage angenommen!`;
                break;
            case 'booking_rejected':
            case 'booking_denied':
                introText = `<strong>${relatedData.awayTeamName || 'Der Gegner'}</strong> hat eure Spielanfrage abgelehnt.`;
                break;
            case 'booking_cancelled':
                introText = `<strong>${relatedData.cancellingTeamName || 'Der Gegner'}</strong> hat das Spiel abgesagt.`;
                break;
            case 'booking_expired':
                introText = `Deine Anfrage ist abgelaufen, da sie nicht rechtzeitig bestätigt wurde.`;
                break;
            case 'result_reported':
                introText = `<strong>${relatedData.reporterName || 'Der Gegner'}</strong> hat ein Ergebnis gemeldet.`;
                break;
            case 'result_confirmed':
                introText = `Das Spielergebnis wurde bestätigt.`;
                break;
            case 'result_rejected':
                introText = `<strong>${relatedData.rejectorName || 'Der Gegner'}</strong> hat das Ergebnis abgelehnt.`;
                break;
            case 'admin_result_override':
                introText = `Ein Administrator hat das Ergebnis korrigiert.`;
                break;
            default:
                introText = message;
        }

        // 1. Booking Details (Anfrage, Bestätigung, Storno, etc.)
        // Wir zeigen diese Details NUR, wenn es kein Ergebis-Event ist (da dort das Ergebnis-Widget reicht)
        if ((relatedData.bookingId || type.includes('booking')) && !type.includes('result')) {
            const dateStr = getDateStr(relatedData.date);
            const timeStr = getTimeStr(relatedData.time, relatedData.date);
            const pitchDisplay = relatedData.pitchName || 'Unbekannter Platz';

            // Determine displayed opponent
            let displayedOpponent = relatedData.homeTeamName || relatedData.awayTeamName || relatedData.cancellingTeamName || 'Gegner';
            if (type === 'new_booking_request') displayedOpponent = relatedData.homeTeamName;
            else if (type === 'booking_confirmed') displayedOpponent = relatedData.awayTeamName;
            else if (type === 'booking_denied') displayedOpponent = relatedData.awayTeamName;
            else if (type === 'booking_cancelled') displayedOpponent = relatedData.cancellingTeamName;


            detailsHtml += `
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; table-layout: fixed;">
                    <tr style="background-color: #e9ecef;">
                        <th colspan="2" style="padding: 10px; text-align: left; color: #495057; border-bottom: 2px solid #dee2e6; font-size: 14px;">Spieldetails</th>
                    </tr>
                    <tr>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #6c757d; width: 35%; font-weight: bold; font-size: 13px;">Gegner:</td>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #212529; font-size: 13px; word-wrap: break-word;">${displayedOpponent}</td>
                    </tr>
                    <tr>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #6c757d; font-weight: bold; font-size: 13px;">Datum:</td>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #212529; font-size: 13px;">${dateStr}</td>
                    </tr>
                    <tr>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #6c757d; font-weight: bold; font-size: 13px;">Uhrzeit:</td>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #212529; font-size: 13px;">${timeStr}</td>
                    </tr>
                    <tr>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #6c757d; font-weight: bold; font-size: 13px;">Ort:</td>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #212529; font-size: 13px; word-wrap: break-word;">${pitchDisplay}</td>
                    </tr>
            `;

            if (relatedData.awayTeamName && type === 'new_booking_request') {
                // Clean up old check
            }

            if (relatedData.reason || relatedData.denialReason || relatedData.cancellationReason) {
                const r = relatedData.reason || relatedData.denialReason || relatedData.cancellationReason;
                detailsHtml += `
                    <tr>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #dc3545; font-weight: bold; font-size: 13px;">Info:</td>
                         <td style="padding: 10px; border-bottom: 1px solid #dee2e6; color: #212529; font-size: 13px; word-wrap: break-word;">${r}</td>
                    </tr>
                `;
            }
            detailsHtml += `</table>`;
        }

        // 2. Result Details
        if (relatedData.resultId || type.includes('result')) {
            const home = relatedData.homeTeamName || 'Heim';
            const away = relatedData.awayTeamName || 'Gast';
            const score = (relatedData.homeScore !== undefined && relatedData.awayScore !== undefined)
                ? `${relatedData.homeScore} : ${relatedData.awayScore}`
                : '- : -';

            if (!detailsHtml) {
                // detailsHtml can be empty if only fallback text is needed, but we handle introText globally now.
            }

            detailsHtml += `
                <div style="margin-top: 15px; text-align: center; padding: 15px; background-color: #eef2f5; border-radius: 8px; border: 1px solid #dee2e6;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6c757d; margin-bottom: 8px;">Ergebnis</div>
                    <div style="font-size: 16px; font-weight: bold; font-family: sans-serif; color: #343a40; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="word-wrap: break-word; max-width: 100%;">${home}</span>
                        <span style="background: #fff; padding: 4px 12px; border-radius: 12px; border: 1px solid #ced4da; color: #000; white-space: nowrap; margin: 5px 0;">${score}</span>
                        <span style="word-wrap: break-word; max-width: 100%;">${away}</span>
                    </div>
                </div>
            `;
        }

        const emailPromises = usersToNotify.map(email => {
            const mailHtml = `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <div style="background-color: #00A99D; padding: 15px; text-align: center;">
                        <h2 style="color: white; margin: 0; font-weight: normal; font-size: 18px;">${title}</h2>
                    </div>
                    
                    <div style="padding: 20px; background-color: #ffffff;">
                        <div style="font-size: 15px; line-height: 1.5; color: #333; margin-bottom: 20px;">
                            ${introText}
                        </div>
                        
                        ${detailsHtml}

                        <div style="margin-top: 25px; text-align: center;">
                            <a href="${dashboardUrl}" style="background-color: #00A99D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block;">Zum Teamboard</a>
                        </div>
                    </div>

                    <div style="padding: 12px; background-color: #f5f5f5; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee;">
                        <p style="margin: 0;">Benachrichtigung für: <strong>"${settingKey}"</strong></p>
                        <p style="margin: 3px 0 0 0;"><a href="${dashboardUrl}/settings" style="color: #666; text-decoration: underline;">Einstellungen</a></p>
                    </div>
                </div>
            `;

            return emailService.sendEmail({
                to: email,
                subject: `[Bunte Liga] ${title}`,
                text: `${title}\n\n${message}\n\nZum Teamboard: ${dashboardUrl}`, // Fallback text
                html: mailHtml
            }).then(() => {
                logEmail(email, `[Bunte Liga] ${title}`, `${title} - ${message}`);
            }).catch(e => {
                console.error(`Failed to send mail to ${email}`, e);
                logEmail(email, `FAILED: [Bunte Liga] ${title}`, `Error: ${e.message}`);
            });
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
    initSocket,
    broadcastUpdate
};

