import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Link, Divider, useTheme, Chip, List, ListItem, CircularProgress, Button, useMediaQuery } from '@mui/material';
import { ReusableModal } from '../Helpers/modalUtils';
import ScoreInput from '../ScoreInput';
import { getHeadToHeadResults } from '../../services/resultApiService';
import { API_BASE_URL } from '../../services/apiClient';


const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return '';

    // Robust handling of various date formats (including serialised Firestore Timestamps)
    let d = null;

    if (typeof dateString.toDate === 'function') {
        d = dateString.toDate();
    } else if (dateString instanceof Date) {
        d = dateString;
    } else if (typeof dateString === 'object' && typeof dateString._seconds === 'number') {
        const ms = dateString._seconds * 1000 + (dateString._nanoseconds ? dateString._nanoseconds / 1000000 : 0);
        d = new Date(ms);
    } else {
        d = new Date(dateString);
    }

    if (!d || isNaN(d.getTime())) return '';

    const options = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return d.toLocaleDateString('de-DE', options);
};


const TeamLogo = ({ team, size = 28 }) => {
    const theme = useTheme();
    const [error, setError] = useState(false);

    if (!team) return null;

    const isLightMode = theme.palette.mode === 'light';
    const logoUrlToUse = (isLightMode && team.logoUrlLight) ? team.logoUrlLight : team.logoUrl;
    // Prepend API_BASE_URL if relative path
    const logoUrl = logoUrlToUse ? (logoUrlToUse.startsWith('http') ? logoUrlToUse : `${API_BASE_URL}${logoUrlToUse}`) : null;

    if (error || !logoUrl) {
        return (
            <Avatar
                sx={{
                    width: size,
                    height: size,
                    fontSize: size * 0.5,
                    bgcolor: team.logoColor || theme.palette.grey[700],
                    color: theme.palette.getContrastText(team.logoColor || theme.palette.grey[700])
                }}
            >
                {team.name ? team.name.charAt(0).toUpperCase() : '?'}
            </Avatar>
        );
    }

    return (
        <Box
            component="img"
            src={logoUrl}
            alt={team.name}
            onError={() => setError(true)}
            sx={{
                width: size,
                height: size,
                objectFit: 'contain'
            }}
        />
    );
};

// Helper for formatted match string in H2H list
const formatH2HDate = (dateString) => {
    const formatted = formatDate(dateString, false);
    if (!formatted) return '';
    const parts = formatted.split(',');
    if (parts.length > 1) return parts[1].trim();
    return formatted; // Fallback if no comma
};

const GameDetailsModal = ({ open, onClose, fixture, teams, pitches, handleReportResult, handleCancelBooking }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [h2hResults, setH2HResults] = useState([]);
    const [loadingH2H, setLoadingH2H] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [reportMode, setReportMode] = useState(false);
    const [score, setScore] = useState({ home: '0', away: '0' });
    const [submitting, setSubmitting] = useState(false);

    const homeTeam = teams[fixture?.homeTeamId] || { name: fixture?.homeTeamName || 'Unbekannt' };
    const awayTeam = teams[fixture?.awayTeamId] || { name: fixture?.awayTeamName || 'Unbekannt' };

    // Determine Location and Google Maps Link
    let locationName = fixture?.location || 'Unbekannt';
    if (!fixture?.location && fixture?.pitchId && pitches) {
        const pitch = pitches.find(p => p.id === fixture.pitchId);
        if (pitch) locationName = pitch.name;
    }
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName + ' Freiburg')}`;

    useEffect(() => {
        if (open && fixture?.homeTeamId && fixture?.awayTeamId) {
            setLoadingH2H(true);
            const normalizeId = (id) => id ? String(id).replace(/^(result-|booking-)/, '') : '';
            const normalizedFixtureId = normalizeId(fixture.id);
            const fixtureBookingId = normalizeId(fixture.bookingId);

            getHeadToHeadResults(fixture.homeTeamId, fixture.awayTeamId, normalizedFixtureId)
                .then(results => {
                    // Aggressives Filtern auf dem Frontend als zusätzliche Sicherheit:
                    // Wir entfernen das Spiel, wenn die ID übereinstimmt ODER wenn das Datum identisch ist
                    // (letzteres fängt Fälle ab, in denen die fixture.id eine bookingId ist, r.id aber eine resultId).

                    const filtered = results.filter(r => {
                        const rBaseId = normalizeId(r.id);
                        const rBookingId = normalizeId(r.bookingId);

                        const isSameId = rBaseId === normalizedFixtureId;
                        const isSameBookingId = fixtureBookingId && rBookingId && rBookingId === fixtureBookingId;

                        // Bei Datum nur den Tag vergleichen (Uhrzeit kann variieren)
                        const isSameDate = formatDate(r.date, false) === formatDate(fixture.date, false);

                        return !isSameId && !isSameBookingId && !isSameDate;
                    });
                    setH2HResults(filtered);
                })
                .catch(err => console.error("Failed to load H2H", err))
                .finally(() => setLoadingH2H(false));
        } else {
            setH2HResults([]);
        }
    }, [open, fixture]);

    // Reset confirm state when modal opens/closes or fixture changes
    useEffect(() => {
        if (!open) {
            setConfirmCancel(false);
            setReportMode(false);
            setScore({ home: '0', away: '0' });
            setSubmitting(false);
        }
    }, [open, fixture]);

    if (!fixture) return null;

    const isPlayed = fixture.status === 'confirmed' || fixture.status === 'played' || (fixture.homeScore !== undefined && fixture.homeScore !== null);

    return (
        <ReusableModal open={open} onClose={onClose} title="Spiel-Details">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>

                {/* Header Info */}
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', fontSize: '0.9rem' }}>
                        {formatDate(fixture.date)} Uhr
                    </Typography>
                </Box>

                {/* Matchup Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    {/* Home Team */}
                    <Box
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', cursor: 'pointer' }}
                        onClick={() => { onClose(); navigate(`/team/${fixture.homeTeamId}`); }}
                    >
                        <TeamLogo team={homeTeam} size={56} />
                        <Typography sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2, fontSize: '0.9rem', mt: 1 }}>
                            {homeTeam.name}
                        </Typography>
                    </Box>

                    {/* Score / VS */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                        {isPlayed ? (
                            <Box sx={{
                                bgcolor: theme.palette.action.selected,
                                borderRadius: 50,
                                px: 4,
                                py: 0.5,
                                border: `1px solid ${theme.palette.divider}`,
                                minWidth: '80px',
                                textAlign: 'center'
                            }}>
                                <Typography variant="h5" sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}>
                                    {fixture.homeScore}:{fixture.awayScore}
                                </Typography>
                            </Box>
                        ) : (
                            <Typography variant="h5" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.disabled }}>
                                vs.
                            </Typography>
                        )}
                    </Box>

                    {/* Away Team */}
                    <Box
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', cursor: 'pointer' }}
                        onClick={() => { onClose(); navigate(`/team/${fixture.awayTeamId}`); }}
                    >
                        <TeamLogo team={awayTeam} size={56} />
                        <Typography sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2, fontSize: '0.9rem', mt: 1 }}>
                            {awayTeam.name}
                        </Typography>
                    </Box>
                </Box>

                {/* Location */}
                <Box sx={{ textAlign: 'center' }}>
                    <Link
                        href={mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontFamily: 'Comfortaa',
                            color: theme.palette.primary.main,
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' }
                        }}
                    >
                        📍 {locationName}
                    </Link>
                </Box>

                <Divider />

                {/* Content Section: H2H or Cancellation Confirmation */}
                {confirmCancel ? (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                        <Typography sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, mb: 1, fontWeight: 'bold' }}>
                            Spiel wirklich absagen?
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary }}>
                            Der Termin wird dadurch für andere Teams freigegeben.
                        </Typography>
                    </Box>
                ) : reportMode ? (
                    <Box sx={{ py: 2 }}>
                        <ScoreInput
                            homeTeam={homeTeam}
                            awayTeam={awayTeam}
                            score={score}
                            setScore={setScore}
                            hideTeamInfo={true}
                        />
                    </Box>
                ) : (
                    /* H2H Section */
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, mb: 1 }}>
                            Letzte Begegnungen
                        </Typography>


                        {loadingH2H ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : h2hResults.length > 0 ? (
                            <List dense disablePadding>
                                {h2hResults.map(res => {
                                    // Try to match with the main fixture teams first (to ensure we have logos)
                                    let hTeam = teams[res.homeTeamId];
                                    if (!hTeam && res.homeTeamId === fixture.homeTeamId) hTeam = homeTeam;
                                    if (!hTeam && res.homeTeamId === fixture.awayTeamId) hTeam = awayTeam;
                                    if (!hTeam) hTeam = { name: res.homeTeamName };

                                    let aTeam = teams[res.awayTeamId];
                                    if (!aTeam && res.awayTeamId === fixture.homeTeamId) aTeam = homeTeam;
                                    if (!aTeam && res.awayTeamId === fixture.awayTeamId) aTeam = awayTeam;
                                    if (!aTeam) aTeam = { name: res.awayTeamName };

                                    const isFriendly = res.isFriendly === true; // Check friendly status

                                    const homeWin = parseInt(res.homeScore) > parseInt(res.awayScore);
                                    const awayWin = parseInt(res.awayScore) > parseInt(res.homeScore);

                                    return (
                                        <ListItem key={res.id} sx={{
                                            px: 0,
                                            py: 1,
                                            display: 'grid',
                                            gridTemplateColumns: '80px 1fr auto 1fr', // Date | Home | Score | Away
                                            alignItems: 'center',
                                            fontSize: '0.85rem',
                                            gap: 1
                                        }}>
                                            {/* Date */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                                    {formatH2HDate(res.date || res.createdAt)}
                                                </Typography>
                                                {isFriendly && (
                                                    <Chip
                                                        label="F"
                                                        size="small"
                                                        sx={{
                                                            height: '16px',
                                                            fontSize: '0.65rem',
                                                            bgcolor: '#FFD700',
                                                            color: '#000',
                                                            fontWeight: 'bold',
                                                            mt: 0.5
                                                        }}
                                                    />
                                                )}
                                            </Box>

                                            {/* Home Team (Right Aligned) */}
                                            <Box
                                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, overflow: 'hidden', cursor: 'pointer' }}
                                                onClick={() => { onClose(); navigate(`/team/${res.homeTeamId}`); }}
                                            >
                                                <Typography sx={{
                                                    fontWeight: homeWin ? 'bold' : 'normal',
                                                    color: res.homeTeamId === fixture.homeTeamId ? theme.palette.text.primary : theme.palette.text.secondary,
                                                    textAlign: 'right',
                                                    fontSize: '0.8rem',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {hTeam.name}
                                                </Typography>
                                                <TeamLogo team={hTeam} size={28} />
                                            </Box>

                                            {/* Score (Center) */}
                                            <Box sx={{
                                                bgcolor: theme.palette.action.hover,
                                                px: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 'bold',
                                                minWidth: '50px',
                                                textAlign: 'center',
                                                fontSize: '0.9rem',
                                                py: 0.5
                                            }}>
                                                {res.homeScore}:{res.awayScore}
                                            </Box>

                                            {/* Away Team (Left Aligned) */}
                                            <Box
                                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, overflow: 'hidden', cursor: 'pointer' }}
                                                onClick={() => { onClose(); navigate(`/team/${res.awayTeamId}`); }}
                                            >
                                                <TeamLogo team={aTeam} size={28} />
                                                <Typography sx={{
                                                    fontWeight: awayWin ? 'bold' : 'normal',
                                                    color: res.awayTeamId === fixture.homeTeamId ? theme.palette.text.primary : theme.palette.text.secondary,
                                                    textAlign: 'left',
                                                    fontSize: '0.8rem',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {aTeam.name}
                                                </Typography>
                                            </Box>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        ) : (
                            <Typography variant="body2" sx={{ color: theme.palette.text.disabled, textAlign: 'center', py: 2 }}>
                                Keine vorherigen Begegnungen gefunden.
                            </Typography>
                        )}
                        {/* H2H closing tags */}
                    </Box>
                )}

                {/* Action Buttons */}
                {(fixture.bookingId && (handleReportResult || handleCancelBooking)) && (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1, pt: 2, borderTop: '1px solid', borderColor: theme.palette.divider }}>
                        {handleReportResult && !confirmCancel && (
                            reportMode ? (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="inherit"
                                        onClick={() => setReportMode(false)}
                                        disabled={submitting}
                                        sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider }}
                                    >
                                        Zurück
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={async () => {
                                            setSubmitting(true);
                                            try {
                                                await handleReportResult({ homeScore: score.home, awayScore: score.away });
                                                // Close or reset is handled by parent or reset effect, but strictly we might want to wait
                                            } catch (e) {
                                                setSubmitting(false);
                                            }
                                        }}
                                        disabled={submitting || score.home === '' || score.away === ''}
                                        sx={{ bgcolor: theme.palette.primary.main }}
                                    >
                                        {submitting ? '...' : 'Melden'}
                                    </Button>
                                </>
                            ) : (
                                !confirmCancel && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => setReportMode(true)}
                                        sx={{ bgcolor: theme.palette.primary.main }}
                                    >
                                        Erg. melden
                                    </Button>
                                )
                            )
                        )}

                        {handleCancelBooking && !reportMode && (
                            confirmCancel ? (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="inherit"
                                        onClick={() => setConfirmCancel(false)}
                                        sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider }}
                                    >
                                        Zurück
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        onClick={handleCancelBooking}
                                    >
                                        Absagen
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => setConfirmCancel(true)}
                                >
                                    Absagen
                                </Button>
                            )
                        )}
                    </Box>
                )}
            </Box>
        </ReusableModal>
    );
};

export default GameDetailsModal;
