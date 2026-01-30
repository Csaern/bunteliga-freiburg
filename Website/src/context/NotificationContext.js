import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { io } from 'socket.io-client';
import { Snackbar, Alert } from '@mui/material';
import { API_BASE_URL } from '../services/apiClient';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);
export const useNotification = useNotifications; // Alias for backward compatibility

export const NotificationProvider = ({ children }) => {
    console.log('NotificationProvider Render Start');
    const { currentUser, teamId } = useAuth(); // Correctly get teamId from AuthContext
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [socket, setSocket] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [lastNotification, setLastNotification] = useState(null);
    const [lastGlobalUpdate, setLastGlobalUpdate] = useState(null);

    // 1. Socket.IO Connection
    useEffect(() => {
        const newSocket = io(API_BASE_URL); // Backend URL dynamic from apiClient
        setSocket(newSocket);

        // Global Update Listener
        newSocket.on('global_update', (data) => {
            console.log('🌐 [NotificationContext] Global update signal:', data);
            setLastGlobalUpdate(data);
        });

        return () => newSocket.close();
    }, []);

    // 2. Room Management & Event Listener
    useEffect(() => {
        if (!socket || !teamId) {
            console.log('[NotificationContext] Skipping room join - socket or teamId missing', { socket: !!socket, teamId });
            return;
        }

        // Join Team Room
        console.log(`[NotificationContext] 🟢 Joining room for team: ${teamId}`);
        socket.emit('join_team', teamId);

        // Listen for new notifications
        const handleNotification = (data) => {
            console.log('✅ [NotificationContext] Incoming socket data:', data);

            // Short & Crisp messages for the Snackbar as requested
            let snackMsg = data.title;
            const rd = data.relatedData || {};

            switch (data.type) {
                case 'new_booking_request':
                    snackMsg = `${rd.homeTeamName || 'Ein Team'} hat eine Spielanfrage gesendet.`;
                    break;
                case 'booking_confirmed':
                    snackMsg = `${rd.awayTeamName || 'Der Gegner'} hat eure Spielanfrage angenommen.`;
                    break;
                case 'booking_denied':
                    snackMsg = `${rd.awayTeamName || 'Der Gegner'} hat eure Spielanfrage abgelehnt.`;
                    break;
                case 'booking_cancelled':
                case 'admin_booking_cancelled':
                    snackMsg = `Ein Spiel wurde abgesagt.`;
                    break;
                case 'result_reported':
                    snackMsg = `${rd.reporterName || 'Der Gegner'} hat ein Ergebnis gemeldet.`;
                    break;
                case 'result_confirmed':
                    snackMsg = `Ein Spielergebnis wurde bestätigt.`;
                    break;
                default:
                    snackMsg = data.message || data.title;
            }

            setSnackbarMessage(snackMsg);
            setSnackbarOpen(true);
            setLastNotification(Date.now());
        };

        socket.on('notification', handleNotification);

        return () => {
            console.log(`[NotificationContext] 🔴 Leaving room for team: ${teamId}`);
            socket.off('notification', handleNotification);
            socket.emit('leave_team', teamId);
        };
    }, [socket, teamId]);


    // 3. Firestore Listener (keeps list in sync)
    useEffect(() => {
        if (!currentUser || !teamId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('teamId', '==', teamId),
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
    }, [currentUser, teamId]);

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, socket, lastNotification, lastGlobalUpdate }}>
            {children}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity="info" sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
};
