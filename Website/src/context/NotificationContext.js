import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from './AuthProvider';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!currentUser || !currentUser.teamId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        // Listener für ungelesene Benachrichtigungen des eigenen Teams
        const q = query(
            collection(db, 'notifications'),
            where('teamId', '==', currentUser.teamId),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // In-memory Sortierung
            notifs.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
                return timeB - timeA;
            });

            setNotifications(notifs);
            setUnreadCount(notifs.length);
        }, (error) => {
            console.error("Firestore notification listener error:", error);
        });

        return () => unsubscribe();
    }, [currentUser]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};
