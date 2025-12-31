const admin = require('firebase-admin');
const db = admin.firestore();
const pitchesCollection = db.collection('pitches');
const path = require('path'); // Hinzugefügt für Dateipfade
const fs = require('fs');   // Hinzugefügt für Dateisystem-Zugriff

class PitchService {

    // KORREKTUR: Lädt nur noch Plätze, die NICHT archiviert sind.
    static async getAllPitches() {
        const snapshot = await pitchesCollection.where('isArchived', '==', false).get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    static async getPitchById(pitchId) {
        const doc = await pitchesCollection.doc(pitchId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    static async createPitch(pitchData, user) {
        const newPitch = {
            name: pitchData.name || '',
            address: pitchData.address || '',
            type: pitchData.type || '',
            notes: pitchData.notes || '',
            teamId: pitchData.teamId || null,
            isVerified: pitchData.isVerified || false,
            weeklyLimit: pitchData.weeklyLimit !== '' && pitchData.weeklyLimit !== null ? Number(pitchData.weeklyLimit) : null,
            isArchived: false, // NEU: Standardwert für neue Plätze
            createdBy: user.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            imageUrl: null,
        };
        const docRef = await pitchesCollection.add(newPitch);
        return { id: docRef.id, ...newPitch };
    }

    static async updatePitch(pitchId, updateData) {
        const pitchRef = pitchesCollection.doc(pitchId);
        const finalUpdateData = { ...updateData };
        if (finalUpdateData.weeklyLimit !== undefined) {
            finalUpdateData.weeklyLimit = (finalUpdateData.weeklyLimit !== '' && finalUpdateData.weeklyLimit !== null)
                ? Number(finalUpdateData.weeklyLimit)
                : null;
        }

        await pitchRef.update({
            ...finalUpdateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const updatedDoc = await pitchRef.get();
        return { id: pitchId, ...updatedDoc.data() };
    }

    // KORREKTUR: Die 'deletePitch'-Funktion wird zur 'archivePitch'-Funktion.
    // Sie löscht nicht mehr, sondern setzt nur noch ein Flag.
    static async archivePitch(pitchId) {
        const pitchRef = pitchesCollection.doc(pitchId);
        const doc = await pitchRef.get();

        if (doc.exists) {
            await pitchRef.update({
                isArchived: true,
                archivedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    static async updatePitchImage(pitchId, filePath) {
        const pitchRef = pitchesCollection.doc(pitchId);
        await pitchRef.update({ imageUrl: filePath });
        const updatedDoc = await pitchRef.get();
        return { id: updatedDoc.id, ...updatedDoc.data() };
    }
}

module.exports = PitchService;