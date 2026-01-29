import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { Container, Box, Typography, Paper, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import * as seasonApi from '../services/seasonApiService';
import * as teamApi from '../services/teamApiService';
import * as userApi from '../services/userApiService';
import * as bookingApi from '../services/bookingApiService';
import * as resultApi from '../services/resultApiService';

import BookingManager from '../components/Admin/BookingManager';
import UserManager from '../components/Admin/UserManager';
import SeasonManager from '../components/Admin/SeasonManager';
import ResultManager from '../components/Admin/ResultManager';
import TeamManager from '../components/Admin/TeamManager';
import PitchManager from '../components/Admin/PitchManager';
import GeneralSettings from '../components/Admin/GeneralSettings';

const AdminBoard = ({ initialTab = 'bookings' }) => {
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

            // 1. Zuerst die aktive Saison laden, da andere Daten davon abhängen können
            const activeSeason = await seasonApi.getActiveSeason().catch(() => null);
            setCurrentSeason(activeSeason);

            // 2. Alle anderen Basis-Daten parallel über die API laden
            const [
                usersData,
                teamsData,
                seasonsData
            ] = await Promise.all([
                userApi.getAllUsers().catch(() => []),
                teamApi.getAllTeams().catch(() => []),
                seasonApi.getAllSeasons().catch(() => [])
            ]);

            setUsers(usersData);
            setTeams(teamsData);
            setSeasons(seasonsData);

            // 3. Saison-spezifische Daten laden (nur wenn eine Saison aktiv ist)
            if (activeSeason) {
                const [
                    bookingsData,
                    resultsData
                ] = await Promise.all([
                    bookingApi.getBookingsForSeason(activeSeason.id).catch(() => []),
                    resultApi.getResultsForSeason(activeSeason.id).catch(() => [])
                ]);
                setBookings(bookingsData);
                setResults(resultsData);
            }

        } catch (err) {
            console.error("Fehler beim Laden der Admin-Daten:", err);
        } finally {
            setLoading(false);
        }
    };

    const getTeamName = (teamId) => teams.find(t => String(t.id) === String(teamId))?.name || 'Unbekannt';
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
            case 'general':
            case 'website':
                return <GeneralSettings />;
            default:
                return null;
        }
    }



    return (
        <Container maxWidth="lg" sx={{ px: isMobile ? 1 : 2, py: isMobile ? 1 : 3 }}>
            {renderActiveTab()}
        </Container>
    );
};

export default AdminBoard;

