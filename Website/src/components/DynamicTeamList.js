import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { db } from '../firebase';
import { API_BASE_URL } from '../services/apiClient';

const DynamicTeamList = ({ title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsData = teamsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })).sort((a, b) => a.name.localeCompare(b.name)); // Alphabetisch sortieren
      
      setTeams(teamsData);
    } catch (error) {
      console.error('Fehler beim Laden der Teams:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="grey.400">Lade Teams...</Typography>
        </Box>
      </Container>
    );
  }

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

      <Paper
        sx={{
          backgroundColor: '#111',
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.grey[800]}`,
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.grey[800]}` }}>
          <Typography sx={{ 
            color: theme.palette.grey[300], 
            fontFamily: 'comfortaa', 
            fontWeight: 'bold', 
            textAlign: "center" 
          }}>
            Alle Teams ({teams.length})
          </Typography>
        </Box>
        
        {teams.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="grey.400">Keine Teams gefunden.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {teams.map((team, index) => {
              const logoSrc = team.logoUrl
                ? (team.logoUrl.startsWith('http') ? team.logoUrl : `${API_BASE_URL}${team.logoUrl}`)
                : null;

              return (
                <ListItem
                  key={team.id}
                  sx={{
                    py: isMobile ? 1.25 : 2,
                    px: isMobile ? 1.5 : 2.5,
                    borderBottom: index === teams.length - 1 ? 'none' : `1px solid ${theme.palette.grey[800]}`,
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: isMobile ? 40 : 56 }}>
                    {logoSrc ? (
                      <Avatar
                        alt={`${team.name} Logo`}
                        src={logoSrc}
                        sx={{
                          width: isMobile ? 28 : 40,
                          height: isMobile ? 28 : 40,
                          border: `2px solid ${team.logoColor || theme.palette.grey[700]}`,
                        }}
                      />
                    ) : (
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
                    )}
                  </ListItemAvatar>
                
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="body1"
                      component="div"
                      onClick={() => navigate(`/team/${team.id}`)}
                      sx={{
                        fontFamily: 'comfortaa',
                        color: theme.palette.grey[100],
                        fontWeight: 'bold',
                        fontSize: isMobile ? '0.8rem' : '1.1rem',
                        lineHeight: 1.3,
                        cursor: 'pointer',
                        '&:hover': {
                          color: '#00A99D',
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {team.name}
                    </Typography>
                    
                    {team.description && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'comfortaa',
                          color: theme.palette.grey[400],
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          mt: 0.5,
                        }}
                      >
                        {team.description}
                      </Typography>
                    )}
                  </Box>
                  
                  {team.foundedYear && (
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'comfortaa',
                          color: theme.palette.grey[500],
                          fontSize: isMobile ? '0.6rem' : '0.8rem',
                        }}
                      >
                        Gegründet {team.foundedYear}
                      </Typography>
                    </Box>
                  )}
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default DynamicTeamList;
