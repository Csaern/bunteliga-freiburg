import { apiClient, apiClientFormData } from './apiClient';
import { publicApiClient } from './apiClient';

/**
 * Ruft alle Teams vom Backend ab.
 */
export const getAllTeams = async () => {
  return apiClient('/api/teams', 'GET');
};

/**
 * NEU: Ruft alle Teams vom Backend ab (öffentlich, ohne Authentifizierung).
 */
export const getAllTeamsPublic = async () => {
  return publicApiClient('/api/teams', 'GET');
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

/**
 * NEU: Ruft die Teams der automatisch ermittelten, aktiven Saison ab (öffentlich, ohne Authentifizierung).
 */
export const getTeamsForActiveSeasonPublic = async () => {
  return publicApiClient('/api/teams/active-season', 'GET');
};

export const getPotentialOpponents = async (teamId, isFriendly = false) => {
  return apiClient(`/api/teams/${teamId}/potential-opponents?isFriendly=${isFriendly}`, 'GET');
};

export const getTeamByIdPublic = async (teamId) => {
  return publicApiClient(`/api/teams/${teamId}`, 'GET');
};

export const uploadTeamLogo = async (teamId, formData, type = 'dark') => {
  return apiClientFormData(`/api/teams/${teamId}/logo?type=${type}`, 'POST', formData);
};

export const getTeamStats = async (teamId, seasonId) => {
  return publicApiClient(`/api/teams/${teamId}/stats/${seasonId}`, 'GET');
};

export const addCaptainToTeam = async (teamId, userId) => {
  return apiClient(`/api/teams/${teamId}/captains`, 'POST', { userId });
};

export const removeCaptainToTeam = async (teamId, userId) => {
  return apiClient(`/api/teams/${teamId}/captains/${userId}`, 'DELETE');
};

export const removeCaptainFromTeam = async (teamId, userId) => {
  return apiClient(`/api/teams/${teamId}/captains/${userId}`, 'DELETE');
};

export const generateTeamApiKey = async () => {
  return apiClient('/api/v1/my-team/api-key', 'POST');
};

export const revokeTeamApiKey = async () => {
  return apiClient('/api/v1/my-team/api-key', 'DELETE');
};
