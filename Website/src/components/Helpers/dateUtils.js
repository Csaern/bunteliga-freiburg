export const formatGermanDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Berlin'
        });
    } catch (e) {
        return dateString;
    }
};

export const getRequestExpiryInfo = (booking, expiryDays = 3) => {
    if (!booking) return null;

    // Fallback: Use requestedAt, then createdAt
    const requestedAt = booking.requestedAt || booking.createdAt;
    if (!requestedAt) return null;

    try {
        let reqDate;
        if (requestedAt && typeof requestedAt.toDate === 'function') {
            reqDate = requestedAt.toDate();
        } else if (requestedAt && typeof requestedAt._seconds === 'number') {
            reqDate = new Date(requestedAt._seconds * 1000 + (requestedAt._nanoseconds || 0) / 1000000);
        } else {
            reqDate = new Date(requestedAt);
        }

        if (!reqDate || isNaN(reqDate.getTime())) return null;

        const now = new Date();
        const expiryMillis = expiryDays * 24 * 60 * 60 * 1000;
        const diff = (reqDate.getTime() + expiryMillis) - now.getTime();

        if (diff <= 0) return 'Abgelaufen';

        const hoursTotal = Math.floor(diff / (1000 * 60 * 60));
        const minutesTotal = Math.floor(diff / (1000 * 60));

        const days = Math.floor(hoursTotal / 24);
        const hours = hoursTotal % 24;
        const minutes = minutesTotal % 60;

        if (days > 0) {
            return `Läuft ab in: ${days} ${days === 1 ? 'Tag' : 'Tage'}, ${hours} ${hours === 1 ? 'Std' : 'Std'}`;
        } else if (hours > 0) {
            return `Läuft ab in: ${hours} ${hours === 1 ? 'Std' : 'Std'}, ${minutes} ${minutes === 1 ? 'Min' : 'Min'}`;
        } else {
            return `Läuft ab in: ${minutes} ${minutes === 1 ? 'Min' : 'Min'}`;
        }
    } catch (e) {
        return null;
    }
};

export const formatDateForSearch = (dateString) => {
    try {
        const d = new Date(dateString);
        const year = d.getFullYear();
        const shortYear = year.toString().slice(-2);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const paddedMonth = month.toString().padStart(2, '0');
        const paddedDay = day.toString().padStart(2, '0');
        return [`${paddedDay}.${paddedMonth}.${year}`, `${paddedDay}.${paddedMonth}.${shortYear}`];
    } catch (e) {
        return [dateString];
    }
};

/**
 * Formatiert ein Datum oder einen Zeitstempel in die deutsche Zeit (Europe/Berlin).
 * Gibt z.B. "HH:MM" zurück.
 */
export const formatTime = (dateInput) => {
    if (!dateInput) return '';
    try {
        const date = new Date(dateInput);
        return new Intl.DateTimeFormat('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Berlin',
        }).format(date);
    } catch (e) {
        return '';
    }
};

/**
 * Erstellt ein Date-Objekt, das einem spezifischen Datum und einer Uhrzeit in Berlin entspricht.
 * Dies ist notwendig, um unabhängig von der Browser-Zeitzone den korrekten Timestamp zu erzeugen.
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} timeStr - 'HH:MM'
 */
export const createBerlinDate = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;

    // Basis: Wir interpretieren die Eingabe als UTC
    const utcBase = new Date(`${dateStr}T${timeStr}:00.000Z`);

    // Prüffunktion: Was ist die Zeit dieses Timestamps in Berlin?
    const checkBerlinTime = (d) => {
        return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Berlin',
            hour12: false
        }).format(d);
    };

    // Was ist das in Berlin?
    const berlinStr = checkBerlinTime(utcBase); // z.B. "12:00" (wenn Berlin +2)
    const [berlinH, berlinM] = berlinStr.split(':').map(Number);
    const [targetH, targetM] = timeStr.split(':').map(Number);

    // Differenz in Minuten
    const targetMinutes = targetH * 60 + targetM;
    const berlinMinutes = berlinH * 60 + berlinM;

    let diffMinutes = targetMinutes - berlinMinutes;
    // Korrektur für Tagesüberlauf
    if (diffMinutes > 720) diffMinutes -= 1440;
    if (diffMinutes < -720) diffMinutes += 1440;

    // Addiere Differenz zu UTC Base
    return new Date(utcBase.getTime() + diffMinutes * 60000);
};