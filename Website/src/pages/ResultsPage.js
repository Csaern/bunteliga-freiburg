import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import DynamicFixtureList from '../components/DynamicFixtureList';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import * as seasonApi from '../services/seasonApiService';

const ResultsPage = () => {

  const [allSeasons, setAllSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      const [seasonData, allSeasonsData] = await Promise.all([
        seasonApi.getActiveSeasonPublic().catch(() => null),
        seasonApi.getAllSeasonsPublic().catch(() => [])
      ]);

      // Filtere nur relevante Saisons (nicht planning)
      const availableSeasons = allSeasonsData.filter(s => s.status === 'finished' || s.status === 'active' || s.status === 'inactive');
      // Sortiere nach Name (Jahr) absteigend
      availableSeasons.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      setAllSeasons(availableSeasons);

      // Setze die aktive Saison als Standard, falls vorhanden
      if (seasonData) {

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
    // const selectedSeason = allSeasons.find(s => s.id === newSeasonId);

  };

  if (loading) {
    return (
      <div>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">Lade Tabelle...</Typography>
        </Box>
      </div>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pt: { xs: 1.5, sm: 4 }, pb: 4, px: { xs: 1.5, sm: 3 } }}>
      {/* Season Selector und Liga-Tabelle */}
      <Box sx={{ mb: 3 }}>
        <DynamicLeagueTable
          title={`Liga-Tabelle`}
          form={true}
          seasonId={selectedSeasonId}
          enableSimulation={true}
          disableContainer={true}
          headerControls={
            allSeasons.length > 0 && (
              <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 200 } }}>
                <InputLabel sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>Saison</InputLabel>
                <Select
                  value={selectedSeasonId || ''}
                  onChange={handleSeasonChange}
                  label="Saison"
                  sx={{
                    color: 'text.primary',
                    fontSize: '0.875rem',
                    height: '36px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'divider',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'action.hover',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '& .MuiSelect-icon': {
                      color: 'text.secondary',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                      },
                    },
                  }}
                >
                  {allSeasons.map((season) => (
                    <MenuItem 
                      key={season.id} 
                      value={season.id}
                      sx={{
                        color: season.status === 'active' ? '#FFD700' : 'inherit'
                      }}
                    >
                      {season.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )
          }
        />
      </Box>

      <DynamicFixtureList
        title="Alle Spiele"
        details={true}
        seasonId={selectedSeasonId}
        showType="all"
      />
    </Container>
  );
};

export default ResultsPage;