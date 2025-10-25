import { apiClient, apiClientFormData } from './apiClient';

/**
 * Ruft alle Teams vom Backend ab.
 */
export const getAllTeams = async () => {
  return apiClient('/api/teams', 'GET');
};

export const createTeam = async (teamData) => {
  return apiClient('/api/teams', 'POST', teamData);
};

export const updateTeam = async (teamId, teamData) => {
  return apiClient(`/api/teams/${teamId}`, 'PUT', teamData);
};

export const deleteTeam = async (teamId) => {
  return apiClient(`/api/teams/${teamId}`, 'DELETE');
};

export const getTeamsForSeason = async (seasonId) => {
  return apiClient(`/api/teams/season/${seasonId}`, 'GET');
};

/**
 * NEU: Ruft die Teams der automatisch ermittelten, aktiven Saison ab.
 * Benötigt keine Parameter.
 */
export const getTeamsForActiveSeason = async () => {
  return apiClient('/api/teams/active-season', 'GET');
};

export const getPotentialOpponents = async (teamId) => {
  return apiClient(`/api/teams/${teamId}/potential-opponents`, 'GET');
};

// KORREKTUR: Verwendet jetzt die neue, korrekte Funktion für den Logo-Upload
export const uploadTeamLogo = async (teamId, formData) => {
  return apiClientFormData(`/api/teams/${teamId}/logo`, 'POST', formData);
};