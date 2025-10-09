import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from '../context/AuthProvider';
import { Container, Box, Typography, Button, Paper, CircularProgress, Alert, useMediaQuery, useTheme } from '@mui/material';


import BookingManager from '../components/Admin/BookingManager';
import UserManager from '../components/Admin/UserManager';
import SeasonManager from '../components/Admin/SeasonManager';
import ResultManager from '../components/Admin/ResultManager';
import TeamManager from '../components/Admin/TeamManager';

const AdminBoard = ({ initialTab = 'bookings' }) => {
    const [pitches, setPitches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [users, setUsers] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [results, setResults] = useState([]);
    const [currentSeason, setCurrentSeason] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [openMatchesCount, setOpenMatchesCount] = useState(0); // NEU: State für offene Partien
    const { isAdmin, currentUser } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));


    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [isAdmin]);

    // NEU: useEffect zur Berechnung offener Partien
    useEffect(() => {
        if (bookings.length > 0) {
            // 1. Finde alle Buchungen, die tatsächlich angesetzte Partien sind (beide Teams gesetzt)
            const scheduledMatches = bookings.filter(b => b.homeTeamId && b.awayTeamId);

            // 2. Erstelle eine Liste aller IDs von Buchungen, für die bereits ein Ergebnis existiert
            const resultBookingIds = new Set(results.map(r => r.bookingId));

            // 3. Finde die Partien, für die noch kein Ergebnis vorliegt
            const open = scheduledMatches.filter(match => !resultBookingIds.has(match.id));

            setOpenMatchesCount(open.length);
        } else {
            setOpenMatchesCount(0);
        }
    }, [bookings, results]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Lade ALLE relevanten Daten-Kollektionen parallel
            const [pitchesSnap, teamsSnap, usersSnap, seasonSnap, bookingsSnap, resultsSnap] = await Promise.all([
                getDocs(collection(db, "pitches")),
                getDocs(collection(db, "teams")),
                getDocs(collection(db, "users")),
                getDocs(collection(db, "seasons")),
                getDocs(collection(db, "bookings")), // Lade ALLE Buchungen, ohne Filter
                getDocs(collection(db, "results"))   // Lade ALLE Ergebnisse, ohne Filter
            ]);

            const pitchesData = pitchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const seasonsData = seasonSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const allBookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const allResults = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Setze die States mit den kompletten Datenlisten
            setPitches(pitchesData);
            setTeams(teamsData);
            setUsers(usersData);
            setSeasons(seasonsData);
            setBookings(allBookings);
            setResults(allResults);

            const current = seasonsData.find(s => s.isCurrent === true);
            setCurrentSeason(current);

        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'Unbekannt';
    const getPitchName = (pitchId) => pitches.find(p => p.id === pitchId)?.name || 'Unbekannt';

    if (!isAdmin) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h5" color="error">Zugriff verweigert</Typography>
                <Typography>Sie haben keine Berechtigung, auf das Adminboard zuzugreifen.</Typography>
            </Box>
        );
    }

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    // Filtere die Daten hier, damit jede Komponente nur das bekommt, was sie braucht
    const bookingsForCurrentSeason = currentSeason ? bookings.filter(b => b.seasonId === currentSeason.id) : [];
    const resultsForCurrentSeason = currentSeason ? results.filter(r => r.seasonId === currentSeason.id) : [];

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'bookings':
                return <BookingManager bookings={bookingsForCurrentSeason} pitches={pitches} teams={teams} currentSeason={currentSeason} fetchData={fetchData} getTeamName={getTeamName} getPitchName={getPitchName} />;
            case 'users':
                return <UserManager users={users} teams={teams} fetchData={fetchData} currentUser={currentUser} getTeamName={getTeamName} />;
            case 'season':
                return <SeasonManager seasons={seasons} fetchData={fetchData}  bookings={bookings} results={results}/>;
            case 'results':
                return <ResultManager results={resultsForCurrentSeason} teams={teams} users={users} currentSeason={currentSeason} currentUser={currentUser} fetchData={fetchData} getTeamName={getTeamName} />;
            case 'teams':
                return <TeamManager teams={teams} onTeamsUpdate={setTeams} />;
            default:
                return null;
        }
    }



    return (
        <Container maxWidth="lg" sx={{ px: isMobile ? 1 : 2 }}>
            <Paper sx={{ 
                p: { xs: 1, sm: 2 }, 
                backgroundColor: 'transparent', // Hintergrund transparent machen
                boxShadow: 'none' // Schatten entfernen
            }}>
                {renderActiveTab()}
            </Paper>
            {currentSeason && (
                <Alert severity="success" sx={{ mt: 2, mx: 1.75, backgroundColor: 'rgba(46, 125, 50, 0.3)', color: '#a5d6a7'}}>
                    <strong>Aktuelle Saison:</strong> {currentSeason.name} ({currentSeason.year})
                </Alert>
            )}
            {/* NEU: Alert für offene Partien */}
            {openMatchesCount > 0 && (
                 <Alert severity="info" sx={{ mt: 2, mx: 1.75, backgroundColor: 'rgba(2, 136, 209, 0.2)', color: '#90caf9' }}>
                    <strong>Offene Partien:</strong> Es gibt {openMatchesCount} angesetzte Spiele, für die noch kein Ergebnis eingetragen wurde.
                </Alert>
            )}
        </Container>
    );
};

export default AdminBoard;

