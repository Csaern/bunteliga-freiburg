import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stepper,
    Step,
    StepLabel,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    useTheme,
    useMediaQuery,
    Divider
} from '@mui/material';
import ScoreInput from '../ScoreInput';
import * as bookingApi from '../../services/bookingApiService';
import * as resultApi from '../../services/resultApiService';
import * as teamApi from '../../services/teamApiService';
import AppModal from './AppModal';

const steps = ['Spielauswahl', 'Ergebnis'];

const ReportResultModal = ({ open, onClose, seasonId, teamId, onReportSuccess, initialBookingId }) => {
    const theme = useTheme();
    // fullScreen logic handled by AppModal
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Data
    const [reportOptions, setReportOptions] = useState([]);
    const [teamsMap, setTeamsMap] = useState({});

    // Form
    const [bookingId, setBookingId] = useState('');
    const [homeScore, setHomeScore] = useState('0');
    const [awayScore, setAwayScore] = useState('0');

    // Helper to normalize date (copied from Dashboard or utils if available, mimicking local usage)
    const normalizeDate = (dateVal) => {
        if (!dateVal) return null;
        if (dateVal && typeof dateVal === 'object' && dateVal.seconds) {
            return new Date(dateVal.seconds * 1000);
        }
        if (dateVal && typeof dateVal === 'object' && dateVal._seconds) {
            return new Date(dateVal._seconds * 1000);
        }
        return new Date(dateVal);
    };

    const loadData = useCallback(async () => {
        if (!seasonId || !teamId) return;
        setLoading(true);
        setError('');
        try {
            // Load Teams Map
            const teamsArr = await teamApi.getTeamsForActiveSeason().catch(() => []);
            const map = teamsArr.reduce((acc, t) => {
                acc[t.id] = {
                    name: t.name,
                    logoUrl: t.logoUrl,
                    logoUrlLight: t.logoUrlLight,
                    logoColor: t.logoColor
                };
                return acc;
            }, {});
            setTeamsMap(map);

            // Load Report Options
            const [pastNeedingResult, upcomingBookings] = await Promise.all([
                bookingApi.getBookingsNeedingResultForMyTeam(seasonId),
                bookingApi.getUpcomingBookingsForTeam(seasonId, teamId).catch(() => []),
            ]);

            const confirmedUpcoming = Array.isArray(upcomingBookings)
                ? upcomingBookings.filter(booking => booking.status === 'confirmed')
                : [];

            const combined = [...pastNeedingResult, ...confirmedUpcoming];
            const uniqueById = new Map();
            combined.forEach(booking => {
                if (!booking || !booking.id) return;
                uniqueById.set(booking.id, booking);
            });

            const normalized = Array.from(uniqueById.values())
                .map(booking => {
                    const dateObj = normalizeDate(booking.date);
                    return {
                        ...booking,
                        _dateObj: dateObj,
                        formattedDate: dateObj ? dateObj.toLocaleDateString('de-DE') : '-',
                        formattedTime: dateObj ? dateObj.toTimeString().slice(0, 5) : '',
                    };
                })
                .sort((a, b) => {
                    const timeA = a._dateObj ? a._dateObj.getTime() : 0;
                    const timeB = b._dateObj ? b._dateObj.getTime() : 0;
                    return timeB - timeA;
                });

            setReportOptions(normalized);

            // Logic for auto-selection (Initial ID or Default)
            if (initialBookingId && normalized.find(b => b.id === initialBookingId)) {
                setBookingId(initialBookingId);
                setActiveStep(1); // Auto-jump to step 2 if pre-selected
            } else if (normalized.length > 0 && !bookingId) {
                // Only default select if we are strictly in Step 0 and no ID is set? 
                // Careful here not to override if user went back.
                // But this runs on mount/updates. 
                // If initialBookingId is NOT set, we default to first.
                if (!initialBookingId && !bookingId) {
                    setBookingId(normalized[0].id);
                }
            }

        } catch (err) {
            console.error("Error loading report options:", err);
            setError("Fehler beim Laden der Spiele.");
        } finally {
            setLoading(false);
        }
    }, [seasonId, teamId, bookingId, initialBookingId]);

    useEffect(() => {
        if (open) {
            setActiveStep(0);
            setError('');
            setSuccess('');
            setHomeScore('0');
            setAwayScore('0');
            loadData();
        }
    }, [open, loadData]);

    const handleNext = () => {
        if (activeStep === 0) {
            if (!bookingId) {
                setError("Bitte wähle ein Spiel aus.");
                return;
            }
        }
        setError('');
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
        setError('');
    };

    const handleSubmit = async () => {
        if (homeScore === '' || awayScore === '') {
            setError("Bitte gib beide Ergebnisse ein.");
            return;
        }

        setLoading(true);
        setError('');
        try {
            await resultApi.reportResult(bookingId, {
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                reportedByTeamId: teamId
            });
            setSuccess("Ergebnis erfolgreich gemeldet!");
            setTimeout(() => {
                if (onReportSuccess) onReportSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Error reporting result:", err);
            setError(err.message || "Fehler beim Melden des Ergebnisses.");
        } finally {
            setLoading(false);
        }
    };

    // --- Renders ---

    const renderStep1 = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ fontFamily: 'Comfortaa', textAlign: 'center', mb: 2 }}>
                Wähle das Spiel aus, für das du ein Ergebnis melden möchtest.
            </Typography>

            {reportOptions.length === 0 ? (
                <Typography sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 4 }}>
                    Keine offenen Spiele gefunden.
                </Typography>
            ) : (
                <FormControl fullWidth>
                    <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Spiel auswählen</InputLabel>
                    <Select
                        value={bookingId}
                        label="Spiel auswählen"
                        onChange={(e) => setBookingId(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                            }
                        }}
                    >
                        {reportOptions.map(option => (
                            <MenuItem key={option.id} value={option.id}>
                                {teamsMap[option.homeTeamId]?.name || 'Unbekannt'} vs. {teamsMap[option.awayTeamId]?.name || 'Unbekannt'}
                                {!isMobile && ` - ${option.formattedDate}, ${option.formattedTime}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}
        </Box>
    );

    const renderStep2 = () => {
        const selectedBooking = reportOptions.find(o => o.id === bookingId);
        // Fallback objects if loading or not found, though step 1 validation prevents this
        const homeTeam = selectedBooking ? teamsMap[selectedBooking.homeTeamId] : { name: 'Heim' };
        const awayTeam = selectedBooking ? teamsMap[selectedBooking.awayTeamId] : { name: 'Auswärts' };

        // Ensure logos are present in the team object if they are in the map
        // The detailed map logic in loadData ensures structure is flat: { name, logoUrl... }
        // But ScoreInput expects { name, logoUrl } inside the object passed.
        // teamsMap[id] IS that object. So we are good.

        return (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <Typography variant="body1" sx={{ fontFamily: 'Comfortaa', textAlign: 'center' }}>
                    Trage das Endergebnis ein.
                </Typography>

                <ScoreInput
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    score={{ home: homeScore, away: awayScore }}
                    setScore={(valOrUpdater) => {
                        if (typeof valOrUpdater === 'function') {
                            const current = { home: homeScore, away: awayScore };
                            const next = valOrUpdater(current);
                            setHomeScore(next.home);
                            setAwayScore(next.away);
                        } else {
                            setHomeScore(valOrUpdater.home);
                            setAwayScore(valOrUpdater.away);
                        }
                    }}
                />
            </Box>
        );
    };

    const actionButtons = (
        <>
            <Button onClick={onClose} color="inherit" disabled={loading || success}>
                Abbrechen
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep > 0 && (
                <Button onClick={handleBack} sx={{ mr: 1 }} disabled={loading || success}>
                    Zurück
                </Button>
            )}
            {activeStep < steps.length - 1 ? (
                <Button onClick={handleNext} variant="contained" disabled={loading || success || reportOptions.length === 0}>
                    Weiter
                </Button>
            ) : (
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={loading || success}
                >
                    Melden
                </Button>
            )}
        </>
    );

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Ergebnis melden"
            actions={actionButtons}
            loading={loading}
            minHeight="300px"
        >
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && (
                <>
                    {activeStep === 0 && renderStep1()}
                    {activeStep === 1 && renderStep2()}
                </>
            )}
        </AppModal>
    );
};

export default ReportResultModal;
