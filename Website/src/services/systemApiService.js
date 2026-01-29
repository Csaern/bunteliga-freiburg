import { apiClient } from './apiClient';

export const getEmailConfig = async () => {
    try {
        const data = await apiClient('/api/system/config/email');
        return data;
    } catch (error) {
        throw error;
    }
};

export const saveEmailConfig = async (config) => {
    try {
        const data = await apiClient('/api/system/config/email', 'POST', config);
        return data;
    } catch (error) {
        throw error;
    }
};

export const testEmailConfig = async (config, recipient) => {
    try {
        const data = await apiClient('/api/system/config/email/test', 'POST', { config, recipient });
        return data;
    } catch (error) {
        throw error;
    }
};

