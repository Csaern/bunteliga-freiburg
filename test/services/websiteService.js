const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

class WebsiteService {
    static async getSettings(key) {
        try {
            const doc = await db.collection('websiteSettings').doc(key).get();
            if (!doc.exists) {
                return null;
            }
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error(`Error getting website setting ${key}:`, error);
            throw error;
        }
    }

    static async updateSettings(key, data) {
        try {
            await db.collection('websiteSettings').doc(key).set(data);
            return { id: key, ...data };
        } catch (error) {
            console.error(`Error updating website setting ${key}:`, error);
            throw error;
        }
    }
}

module.exports = WebsiteService;
