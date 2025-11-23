import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, FormControl, InputLabel, Select, MenuItem, useTheme, useMediaQuery } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import DynamicFixtureList from '../components/DynamicFixtureList';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import { db } from '../firebase';
import * as seasonApi from '../services/seasonApiService';

const ResultsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentSeason, setCurrentSeason] = useState(null);
  const [allSeasons, setAllSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      const [seasonData, seasonsSnap] = await Promise.all([
        seasonApi.getActiveSeasonPublic().catch(() => null),
        getDocs(collection(db, 'seasons'))
      ]);
      
      const allSeasonsData = seasonsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Filtere nur finished und active Saisons (nicht planning)
      const availableSeasons = allSeasonsData.filter(s => s.status === 'finished' || s.status === 'active');
      // Sortiere nach Name (Jahr) absteigend
      availableSeasons.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      setAllSeasons(availableSeasons);
      
      // Setze die aktive Saison als Standard, falls vorhanden
      if (seasonData) {
        setCurrentSeason(seasonData);
        setSelectedSeasonId(seasonData.id);
      } else if (availableSeasons.length > 0) {
        // Falls keine aktive Saison, nimm die erste verfügbare
        setSelectedSeasonId(availableSeasons[0].id);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Saisons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonChange = (event) => {
    const newSeasonId = event.target.value;
    setSelectedSeasonId(newSeasonId);
    const selectedSeason = allSeasons.find(s => s.id === newSeasonId);
    setCurrentSeason(selectedSeason || null);
  };

  if (loading) {
    return (
      <div>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="grey.400">Lade Ergebnisse...</Typography>
        </Box>
      </div>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      {/* Season Selector und Liga-Tabelle */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          {allSeasons.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: 'grey.400', fontSize: '0.875rem' }}>Saison</InputLabel>
              <Select
                value={selectedSeasonId || ''}
                onChange={handleSeasonChange}
                label="Saison"
                sx={{
                  color: 'grey.100',
                  fontSize: '0.875rem',
                  height: '36px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'grey.700',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'grey.500',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00A99D',
                  },
                  '& .MuiSelect-icon': {
                    color: 'grey.400',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#333',
                      color: 'grey.200',
                    },
                  },
                }}
              >
                {allSeasons.map((season) => (
                  <MenuItem key={season.id} value={season.id}>
                    {season.name} {season.status === 'active' ? '(Aktiv)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        <DynamicLeagueTable 
          title={`Liga-Tabelle`}
          form={true} 
          seasonId={selectedSeasonId}
        />
      </Box>
      
      <DynamicFixtureList 
        title="Alle Spiele" 
        details={false} 
        seasonId={selectedSeasonId}
        showType="all"
      />
    </Container>
  );
};

export default ResultsPage;