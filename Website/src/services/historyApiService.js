import { publicApiClient } from './apiClient';

/**
 * Service für historische Statistiken.
 */

export const getHistoryStatsPublic = async () => {
    return publicApiClient('/api/history/stats', 'GET');
};
