import { useState, useEffect } from 'react';
import { collection, getDocs, query, } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from '../context/AuthProvider';
import { Container, Box, Typography, Paper, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import * as seasonApi from '../services/seasonApiService';

import BookingManager from '../components/Admin/BookingManager';
import UserManager from '../components/Admin/UserManager';
import SeasonManager from '../components/Admin/SeasonManager';
import ResultManager from '../components/Admin/ResultManager';
import TeamManager from '../components/Admin/TeamManager';
import PitchManager from '../components/Admin/PitchManager';
import WebsiteManager from '../components/Admin/WebsiteManager';

const AdminBoard = ({ initialTab = 'bookings' }) => {
    // HINWEIS: Der 'pitches'-State wird hier nicht mehr benötigt.
    const [teams, setTeams] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [users, setUsers] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [results, setResults] = useState([]);
    const [currentSeason, setCurrentSeason] = useState(null);
    const [loading, setLoading] = useState(true);


    const { isAdmin, currentUser } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));




    useEffect(() => {
        if (isAdmin) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [isAdmin]);



    const fetchData = async () => {
        try {
            setLoading(true);
            const usersCollection = collection(db, "users");
            const teamsCollection = collection(db, "teams");
            const bookingsCollection = collection(db, "bookings");
            // HINWEIS: Die Abfrage für 'pitches' wird entfernt.
            const seasonsCollection = query(collection(db, "seasons"));
            const resultsCollection = collection(db, "results");

            const [
                usersSnapshot,
                teamsSnapshot,
                bookingsSnapshot,
                seasonsSnapshot,
                resultsSnapshot,
                activeSeasonData
            ] = await Promise.all([
                getDocs(usersCollection),
                getDocs(teamsCollection),
                getDocs(bookingsCollection),
                getDocs(seasonsCollection),
                getDocs(resultsCollection),
                seasonApi.getActiveSeason().catch(() => null) // Lade aktive Saison über API
            ]);

            const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // HINWEIS: Das Setzen des 'pitches'-State wird entfernt.
            const seasonsData = seasonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const resultsData = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setUsers(usersData);
            setTeams(teamsData);
            setBookings(bookingsData);
            setSeasons(seasonsData);
            setResults(resultsData);

            // KORREKTUR: Verwende die aktive Saison von der API (status === 'active')
            // statt nach isCurrent zu suchen
            setCurrentSeason(activeSeasonData);

        } catch (err) {
            console.error("Fehler beim Laden der Admin-Daten:", err);
        } finally {
            setLoading(false);
        }
    };

    const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'Unbekannt';
    // HINWEIS: getPitchName wird hier nicht mehr benötigt, da BookingManager das selbst lösen muss.

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
        switch (initialTab) {
            case 'bookings':
                // HINWEIS: 'pitches' wird hier nicht mehr übergeben.
                return <BookingManager bookings={bookingsForCurrentSeason} teams={teams} currentSeason={currentSeason} fetchData={fetchData} getTeamName={getTeamName} />;
            case 'users':
                return <UserManager users={users} teams={teams} fetchData={fetchData} currentUser={currentUser} getTeamName={getTeamName} />;
            case 'season':
                return <SeasonManager seasons={seasons} fetchData={fetchData} bookings={bookings} results={results} />;
            case 'results':
                return <ResultManager results={resultsForCurrentSeason} teams={teams} users={users} currentSeason={currentSeason} currentUser={currentUser} fetchData={fetchData} getTeamName={getTeamName} />;
            case 'teams':
                return <TeamManager teams={teams} onTeamsUpdate={setTeams} />;
            // KORREKTUR: Der PitchManager wird jetzt korrekt aufgerufen.
            // Er lädt seine Plätze selbst über die API.
            // Er erhält die 'teams'-Liste nur, um die Teamnamen anzuzeigen.
            case 'pitches':
                return <PitchManager teams={teams} />;
            case 'website':
                return <WebsiteManager />;
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
        </Container>
    );
};

export default AdminBoard;

