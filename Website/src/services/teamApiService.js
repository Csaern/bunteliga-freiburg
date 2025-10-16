import { apiClient } from './apiClient';

/**
 * Ruft alle Teams vom Backend ab.
 */
export const getAllTeams = async () => {
  return apiClient('/api/teams', 'GET');
};