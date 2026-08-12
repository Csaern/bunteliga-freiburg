import { apiClient, publicApiClient } from './apiClient';

/**
 * Holt die SC Freiburg Heimspiele (öffentlich)
 */
export const getScFreiburgHomeGames = () => {
    return publicApiClient('/api/scfreiburg/home-games', 'GET');
};

/**
 * Holt die Feiertage und Schulferien für BW (öffentlich)
 */
export const getBWHolidays = () => {
    return publicApiClient('/api/holidays/bw', 'GET');
};

/**
 * Spiel auf offiziellem Ligaplatz (oder mehreren) anfragen.
 * payload: { slotId, homeTeamId, awayTeamId, friendly }
 */
export const requestOfficialMatch = (payload) => {
    return apiClient('/api/matches/request-official', 'POST', payload);
};

/**
 * Individuelles Spiel (eigener Platz, custom time) anlegen.
 * payload: { pitchId, homeTeamId, awayTeamId, seasonId, date, time, duration, friendly }
 */
export const createCustomMatch = (payload) => {
    return apiClient('/api/matches/create-custom', 'POST', payload);
};
