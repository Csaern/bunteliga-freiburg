import { apiClient } from './apiClient';
import { publicApiClient } from './apiClient';

/**
 * Holt alle Buchungen für eine bestimmte Saison (Admin-Route).
 * @param {string} seasonId Die ID der Saison.
 */
export const getBookingsForSeason = (seasonId) => {
    return apiClient(`/api/bookings/season/${seasonId}`, 'GET');
};

/**
 * NEU: Holt alle verfügbaren Buchungen für eine bestimmte Saison (öffentlich, ohne Authentifizierung).
 * @param {string} seasonId Die ID der Saison.
 */
export const getAvailableBookingsForSeason = (seasonId) => {
    return publicApiClient(`/api/bookings/public/available/${seasonId}`, 'GET');
};

// NEU: Öffentliche Route – alle Buchungen (inkl. belegter) für eine Saison
export const getPublicBookingsForSeason = (seasonId) => {
    return publicApiClient(`/api/bookings/public/season/${seasonId}`, 'GET');
};

// NEU: Funktion zum Prüfen von Bulk-Slots
export const bulkCheckSlots = (checkData) => {
    return apiClient('/api/bookings/bulk-check', 'POST', checkData);
};

/**
 * Erstellt massenhaft verfügbare Spieltermine (Admin-Route).
 * @param {object} bulkData Die Daten aus dem Formular.
 */
export const bulkCreateSlots = async (data) => {
    return apiClient('/api/bookings/bulk-create', 'POST', data);
};

export const checkSingleSlot = async (data) => {
    return apiClient('/api/bookings/check-single', 'POST', data);
};

export const getBookingsNeedingResult = async (seasonId) => {
    return apiClient(`/api/bookings/needs-result/${seasonId}`);
};


export const createBooking = async (data) => {
    return apiClient('/api/bookings/create', 'POST', data);
};

// NEU: Funktion zum Erstellen einer Buchung mit optionaler Ersetzung einer alten.
export const createBookingWithOverwrite = async (newBookingData, oldBookingId) => {
    return apiClient('/api/bookings/create-with-overwrite', 'POST', { newBookingData, oldBookingId });
};

export const updateBooking = async (bookingId, data) => {
    return apiClient(`/api/bookings/${bookingId}`, 'PUT', data);
};

/**
 * Löscht eine Buchung als Admin (Admin-Route).
 * @param {string} bookingId Die ID der zu löschenden Buchung.
 */
export const adminDeleteBooking = (bookingId) => {
    return apiClient(`/api/bookings/admin/${bookingId}`, 'DELETE');
};

/**
 * Erstellt eine einzelne Buchung als Admin (Admin-Route).
 * @param {object} bookingData Die Daten aus dem Formular.
 */
export const adminCreateBooking = (bookingData) => {
    return apiClient('/api/bookings/admin/create', 'POST', bookingData);
};

/**
 * Aktualisiert eine einzelne Buchung als Admin (Admin-Route).
 * @param {string} bookingId Die ID der zu aktualisierenden Buchung.
 * @param {object} updateData Die neuen Daten.
 */
export const adminUpdateBooking = (bookingId, updateData) => {
    return apiClient(`/api/bookings/admin/${bookingId}`, 'PUT', updateData);
};

// Team: Buchungen ohne Ergebnis für mein Team
export const getBookingsNeedingResultForMyTeam = (seasonId) => {
    const q = encodeURIComponent(seasonId);
    return apiClient(`/api/bookings/needs-result/my-team?seasonId=${q}`, 'GET');
};

// NEU: Bevorstehende Spiele für mein Team
export const getUpcomingBookingsForMyTeam = (seasonId) => {
    const q = encodeURIComponent(seasonId);
    return apiClient(`/api/bookings/upcoming/my-team?seasonId=${q}`, 'GET');
};

// NEU: Bevorstehende Spiele für ein angegebenes Team (explizite teamId)
export const getUpcomingBookingsForTeam = (seasonId, teamId) => {
    const s = encodeURIComponent(seasonId);
    const t = encodeURIComponent(teamId);
    return apiClient(`/api/bookings/upcoming/team/${t}?seasonId=${s}`, 'GET');
};

// Team: Buchung absagen
export const cancelBooking = (bookingId, reason = '') => {
    return apiClient(`/api/bookings/${bookingId}/cancel`, 'POST', { reason });
};

// Team: Buchung anfragen
export const requestBookingSlot = (bookingId, homeTeamId, awayTeamId, friendly = false) => {
    return apiClient(`/api/bookings/${bookingId}/request`, 'POST', { homeTeamId, awayTeamId, friendly });
};

// Team: Auf Buchungsanfrage reagieren
export const respondToBookingRequest = (bookingId, action, reason = '') => {
    return apiClient(`/api/bookings/${bookingId}/action`, 'POST', { action, reason });
};