import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, Radio, useTheme, useMediaQuery } from '@mui/material';
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell } from '../Helpers/tableUtils';

const SeasonManager = ({ seasons, fetchData, bookings, results }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const darkInputStyle = {
        '& label.Mui-focused': { color: '#00A99D' },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'grey.700' },
            '&:hover fieldset': { borderColor: 'grey.500' },
            '&.Mui-focused fieldset': { borderColor: '#00A99D' },
        },
        '& .MuiInputBase-input': { color: 'grey.100', colorScheme: 'dark' },
        '& label': { color: 'grey.400' },
    };

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedSeasonId, setSelectedSeasonId] = useState(null);
    const [seasonFormData, setSeasonFormData] = useState({ year: new Date().getFullYear(), name: `Saison ${new Date().getFullYear()}` });

    // NEUE, ROBUSTERE Logik zur Statistik-Berechnung
    const seasonStatsMap = useMemo(() => {
        const stats = new Map();
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        const safeResults = Array.isArray(results) ? results : [];

        // Erstelle eine Liste aller bookingIds, für die es bereits ein Ergebnis gibt
        const resultBookingIds = new Set(safeResults.map(r => r.bookingId));

        // Initialisiere die Statistik für jede Saison
        seasons.forEach(season => {
            stats.set(season.id, { total: 0, played: 0, open: 0 });
        });

        // 1. Zähle "gespielte" und "offene (aus Ergebnissen)" Partien
        safeResults.forEach(result => {
            if (result.seasonId && stats.has(result.seasonId)) {
                const seasonStat = stats.get(result.seasonId);
                if (result.status === 'confirmed') {
                    seasonStat.played++;
                } else {
                    // Zählt Ergebnisse, die nicht bestätigt sind (z.B. pending, rejected) als offen
                    seasonStat.open++;
                }
            }
        });

        // 2. Zähle "offene (aus Buchungen)" Partien
        // Das sind Buchungen, für die es noch kein Ergebnis-Dokument gibt
        safeBookings.forEach(booking => {
            if (booking.seasonId && booking.homeTeamId && booking.awayTeamId && !resultBookingIds.has(booking.id) && stats.has(booking.seasonId)) {
                stats.get(booking.seasonId).open++;
            }
        });

        // 3. Berechne die Gesamtanzahl der Partien als Summe
        stats.forEach(value => {
            value.total = value.played + value.open;
        });

        return stats;
    }, [seasons, bookings, results]);

    const handleOpenCreateModal = () => setIsCreateModalOpen(true);
    const handleCloseCreateModal = () => setIsCreateModalOpen(false);

    const handleCreateSeason = async (e) => {
        e.preventDefault();
        try {
            const seasonsSnap = await getDocs(collection(db, "seasons"));
            const updatePromises = seasonsSnap.docs.map(doc => updateDoc(doc.ref, { isCurrent: false }));
            await Promise.all(updatePromises);
            await addDoc(collection(db, "seasons"), { ...seasonFormData, isCurrent: true, createdAt: serverTimestamp() });
            alert('Saison erfolgreich erstellt!');
            fetchData();
            handleCloseCreateModal();
        } catch (error) { console.error('Fehler:', error); }
    };

    const handleSetCurrentSeason = (seasonId) => {
        setSelectedSeasonId(seasonId);
        setIsConfirmModalOpen(true);
    };

    const confirmSetCurrentSeason = async () => {
        if (!selectedSeasonId) return;
        try {
            const seasonsSnap = await getDocs(collection(db, "seasons"));
            const updatePromises = seasonsSnap.docs.map(doc => updateDoc(doc.ref, { isCurrent: false }));
            await Promise.all(updatePromises);
            await updateDoc(doc(db, "seasons", selectedSeasonId), { isCurrent: true, updatedAt: serverTimestamp() });
            alert('Aktuelle Saison aktualisiert!');
            fetchData();
        } catch (error) { console.error('Fehler:', error); }
        finally { setIsConfirmModalOpen(false); setSelectedSeasonId(null); }
    };

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Saisonverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>
                    Neue Saison erstellen
                </Button>
            </Box>

            <ReusableModal open={isCreateModalOpen} onClose={handleCloseCreateModal} title="Neue Saison erstellen">
                <form onSubmit={handleCreateSeason}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Jahr" type="number" fullWidth required value={seasonFormData.year} onChange={(e) => setSeasonFormData({ ...seasonFormData, year: parseInt(e.target.value) })} sx={darkInputStyle} />
                        <TextField label="Name" fullWidth required value={seasonFormData.name} onChange={(e) => setSeasonFormData({ ...seasonFormData, name: e.target.value })} sx={darkInputStyle} />
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button variant="outlined" onClick={handleCloseCreateModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button>
                            <Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Erstellen</Button>
                        </Box>
                    </Box>
                </form>
            </ReusableModal>

            <ReusableModal open={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Saison wechseln">
                <Box>
                    <Typography sx={{ color: 'grey.200', mb: 3 }}>Möchtest du diese Saison wirklich als aktiv festlegen?</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button variant="outlined" onClick={() => setIsConfirmModalOpen(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button>
                        <Button variant="contained" onClick={confirmSetCurrentSeason} sx={{ backgroundColor: '#00A99D' }}>Bestätigen</Button>
                    </Box>
                </Box>
            </ReusableModal>

            <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}>
                            <StyledTableCell>Jahr</StyledTableCell>
                            <StyledTableCell>Name</StyledTableCell>
                            <StyledTableCell align="center">Partien</StyledTableCell>
                            <StyledTableCell align="center">Gespielt</StyledTableCell>
                            <StyledTableCell align="center">Offen</StyledTableCell>
                            <StyledTableCell align="center">Status</StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {seasons.sort((a, b) => b.year - a.year).map(season => {
                            const stats = seasonStatsMap.get(season.id) || { total: 0, played: 0, open: 0 };
                            return (
                                <TableRow key={season.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                    <StyledTableCell>{season.year}</StyledTableCell>
                                    <StyledTableCell>{season.name}</StyledTableCell>
                                    <StyledTableCell align="center">{stats.total}</StyledTableCell>
                                    <StyledTableCell align="center">{stats.played}</StyledTableCell>
                                    <StyledTableCell align="center">{stats.open}</StyledTableCell>
                                    <StyledTableCell align="center">
                                        <Radio
                                            checked={season.isCurrent}
                                            onChange={() => handleSetCurrentSeason(season.id)}
                                            disabled={season.isCurrent}
                                            sx={{
                                                color: 'grey.500',
                                                '&.Mui-checked': { color: '#FFBF00' },
                                                '&.Mui-disabled': { color: 'grey.800' },
                                                '&.Mui-checked.Mui-disabled': { color: '#FFBF00', opacity: 0.5 }
                                            }}
                                        />
                                    </StyledTableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default SeasonManager;
