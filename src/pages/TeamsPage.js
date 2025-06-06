import * as React from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Paper,
  Container,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

// Neu: useState für den Dropdown-Status
import { useState } from 'react';

// Angepasste Hilfsfunktion zur Datenerstellung (nur ID, LogoFarbe, Name)
const createTeamData = (
  id,
  logoColor,
  name
) => {
  return {
    id, // ID ist gut für den List-Key
    logoColor,
    name,
  };
};

// Angepasste Teamdaten (reduziert)
const teamData = [
  createTeamData(1, '#D32F2F', 'Rakete Freiburg'),
  createTeamData(2, '#757575', 'Die 2. Wahl'),
  createTeamData(3, '#5D4037', 'Lokomotive Littenweiler'),
  createTeamData(4, '#C2185B', 'Red Sea'),
  createTeamData(5, '#00796B', 'Wurschtwecklebombers'),
  createTeamData(6, '#FBC02D', 'Latinos Freiburg'),
  createTeamData(7, '#388E3C', 'Soccerfield Rockers'),
  createTeamData(8, '#1976D2', 'Dynamo Tresen'),
];

const TeamList = ({ title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const currentYear = new Date().getFullYear();
  const [selectedSeason, setSelectedSeason] = useState('all');

  const seasonOptions = [
    { value: 'all', label: 'Alle Teams' },
    { value: currentYear.toString(), label: `Saison ${currentYear}` },
    { value: (currentYear - 1).toString(), label: `Saison ${currentYear - 1}` },
    { value: (currentYear - 2).toString(), label: `Saison ${currentYear - 2}` },
    { value: (currentYear - 3).toString(), label: `Saison ${currentYear - 3}` },
  ];

  const handleSeasonChange = (event) => {
    setSelectedSeason(event.target.value);
    // Hier würde später der Datenbankaufruf mit der gewählten Saison erfolgen
    console.log("Ausgewählte Saison:", event.target.value);
  };

  const displayedTeams = teamData;
  const currentSelectionLabel = seasonOptions.find(opt => opt.value === selectedSeason)?.label || '';

  return (
    <Container maxWidth="md" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        sx={{
          mb: 2,
          mt: 2,
          color: '#00A99D',
          fontWeight: 700,
          fontFamily: 'comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </Typography>

      {/* Saison-Filter Dropdown */}
      <FormControl 
        fullWidth={isMobile}
        sx={{ 
          mb: 2, 
          minWidth: isMobile ? 'auto' : 200,
          '& .MuiInputLabel-root': {
            color: theme.palette.grey[400],
            fontFamily: 'comfortaa',
            fontSize: isMobile ? '0.9rem' : '1rem',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#00A99D',
          },
          '& .MuiSelect-select': {
            color: theme.palette.grey[100],
            fontFamily: 'comfortaa',
            fontSize: isMobile ? '0.9rem' : '1rem',
            py: isMobile ? 1.25 : 1.5,
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: theme.palette.grey[700] },
            '&:hover fieldset': { borderColor: theme.palette.grey[500] },
            '&.Mui-focused fieldset': { borderColor: '#00A99D' },
          },
          '& .MuiSvgIcon-root': { color: theme.palette.grey[400] }
        }}
        variant="outlined"
      >
        <InputLabel id="season-select-label">Saison auswählen</InputLabel>
        <Select
          labelId="season-select-label"
          id="season-select"
          value={selectedSeason}
          label="Saison auswählen"
          onChange={handleSeasonChange}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: theme.palette.grey[800],
                color: theme.palette.grey[200],
                fontFamily: 'comfortaa',
                '& .MuiMenuItem-root': {
                    fontFamily: 'comfortaa',
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(0, 169, 157, 0.2)',
                        '&:hover': {
                           backgroundColor: 'rgba(0, 169, 157, 0.3)',
                        }
                    }
                },
              },
            },
          }}
        >
          {seasonOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Paper
        sx={{
          backgroundColor: '#111',
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.grey[800]}`,
        }}
      >
        {/* Dynamischer Header innerhalb der Liste */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.grey[800]}` }}>
            <Typography sx={{ color: theme.palette.grey[300], fontFamily: 'comfortaa', fontWeight: 'bold', textAlign: "center" }}>
                {currentSelectionLabel}
            </Typography>
        </Box>
        <List disablePadding>
          {displayedTeams.map((team, index) => (
            <ListItem
              key={team.id}
              sx={{
                py: isMobile ? 1.25 : 2, // Padding angepasst
                px: isMobile ? 1.5 : 2.5,
                borderBottom: index === displayedTeams.length - 1 ? 'none' : `1px solid ${theme.palette.grey[800]}`,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ListItemAvatar sx={{ minWidth: isMobile? 40 : 56 }}>
                <Avatar
                  alt={`${team.name} Logo`}
                  sx={{
                    width: isMobile ? 28 : 40,
                    height: isMobile ? 28 : 40,
                    fontSize: isMobile ? '0.8rem' : '1rem',
                    color: theme.palette.getContrastText(team.logoColor || theme.palette.grey[700]),
                    backgroundColor: team.logoColor || theme.palette.grey[700],
                    fontFamily: 'comfortaa',
                    fontWeight: 'bold',
                  }}
                >
                  {team.name.substring(0, 1).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="body1" // Einheitliche Variante für einfachere Steuerung
                  component="div"
                  sx={{
                    fontFamily: 'comfortaa',
                    color: theme.palette.grey[100],
                    fontWeight: 'bold',
                    fontSize: isMobile ? '0.8rem' : '1.1rem', // Kleinere Schrift mobil
                    lineHeight: 1.3,
                  }}
                >
                  {team.name}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default TeamList;
