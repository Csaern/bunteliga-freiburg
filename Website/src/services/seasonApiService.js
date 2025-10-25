import { apiClient } from './apiClient'; // Der Import war korrekt, die Verwendung war falsch.

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