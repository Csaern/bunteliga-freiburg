import { apiClient } from './apiClient';

/**
 * Ein Service, der alle API-Aufrufe für Saisons bündelt.
 * JETZT VERBUNDEN MIT DEM ECHTEN BACKEND.
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

export const finishSeason = async (seasonId) => {
  return apiClient(`/api/seasons/${seasonId}/finish`, 'POST');
};

// Diese Funktion wird für den Radio-Button im SeasonManager benötigt
export const setCurrentSeason = async (seasonId) => {
    return apiClient(`/api/seasons/${seasonId}/set-current`, 'POST');
};

// NEU: Funktion zum Archivieren hinzufügen
export const archiveSeason = async (seasonId) => {
    return apiClient(`/api/seasons/${seasonId}/archive`, 'PUT');
};