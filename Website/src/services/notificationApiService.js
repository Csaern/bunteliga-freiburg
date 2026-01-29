import { apiClient } from './apiClient';

const notificationApiService = {
    /**
     * Holt alle (ungelesenen) Benachrichtigungen
     */
    getNotifications: async () => {
        return await apiClient('/api/notifications');
    },

    /**
     * Markiert eine Benachrichtigung als gelesen
     */
    markAsRead: async (notificationId) => {
        return await apiClient(`/api/notifications/${notificationId}/read`, 'PUT');
    },

    /**
     * Markiert alle Benachrichtigungen als gelesen
     */
    markAllAsRead: async () => {
        return await apiClient('/api/notifications/read-all', 'PUT');
    }
};

export default notificationApiService;
