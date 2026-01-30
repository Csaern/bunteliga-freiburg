import { apiClient } from './apiClient';
import { publicApiClient } from './apiClient';

/**
 * Ein Service, der alle API-Aufrufe für Saisons bündelt.
 * KORREKTUR: Verwendet die apiClient-Funktion jetzt auf die richtige Weise.
 */

export const getAllSeasons = async () => {
    return apiClient('/api/seasons', 'GET');
};

export const createSeason = async (seasonData) => {
    return apiClient('/api/seasons', 'POST', seasonData);
};

export const updateSeason = async (seasonId, seasonData) => {
    return apiClient(`/api/seasons/${seasonId}`, 'PUT', seasonData);
};

// --- AKTIONEN ---

export const finishSeason = async (seasonId) => {
    return apiClient(`/api/seasons/${seasonId}/finish`, 'PUT');
};

export const setCurrentSeason = async (seasonId) => {
    return apiClient(`/api/seasons/${seasonId}/set-current`, 'POST');
};

export const archiveSeason = async (seasonId) => {
    return apiClient(`/api/seasons/${seasonId}/archive`, 'PUT');
};

export const evaluateSeason = async (seasonId) => {
    return apiClient(`/api/seasons/${seasonId}/evaluate`, 'PUT');
};

export const deleteSeason = async (seasonId) => {
    return apiClient(`/api/seasons/${seasonId}`, 'DELETE');
};

// Aktive Saison (authentifiziert)
export const getActiveSeason = async () => {
    return apiClient('/api/seasons/active', 'GET');
};

// NEU: Aktive Saison (öffentlich, ohne Authentifizierung)
export const getActiveSeasonPublic = async () => {
    return publicApiClient('/api/seasons/public/active', 'GET');
};

// Alle Saisons (öffentlich)
export const getAllSeasonsPublic = async () => {
    return publicApiClient('/api/seasons/public/list', 'GET');
};

// Einzelne Saison (öffentlich)
export const getSeasonByIdPublic = async (seasonId) => {
    return publicApiClient(`/api/seasons/public/${seasonId}`, 'GET');
};

// Tabelle einer Saison (öffentlich)
export const getTablePublic = async (seasonId, simulated = false) => {
    const query = simulated ? '?simulated=true' : '';
    return publicApiClient(`/api/seasons/public/${seasonId}/table${query}`, 'GET');
};