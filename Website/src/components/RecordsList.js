import * as React from 'react';
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Box,
  Typography,
  Avatar,
  useTheme,
  Container,
  useMediaQuery,
} from '@mui/material';

// Hilfsfunktion zur Erstellung der Rekord-Daten
const createRecordData = (id, recordTitle, teamName, teamLogoColor, value) => {
  return {
    id,
    recordTitle,
    teamName,
    teamLogoColor,
    value,
  };
};

// Beispieldaten für die Rekordliste
const recordsData = [
  createRecordData(1, 'Meiste Titel', 'Dynamo Tresen', '#1976D2', 4),
  createRecordData(2, 'Meiste Siege in einer Saison', 'Rakete Freiburg', '#D32F2F', 28),
  createRecordData(3, 'Meiste Tore in einer Saison', 'Lokomotive Littenweiler', '#5D4037', 102),
  createRecordData(4, 'Wenigste Gegentore', 'Die 2. Wahl', '#757575', 19),
  createRecordData(5, 'Längste Siegesserie', 'Red Sea', '#C2185B', '15 Spiele'),
  createRecordData(6, 'Höchster Sieg', 'Wurschtwecklebombers', '#00796B', '11:0'),
];

const RecordsList = ({ title = "Unnütze Fakten" }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="lg" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        sx={{
          mb: 3,
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
        {/* Die Table wird nur noch für die Desktop-Ansicht verwendet */}
        {isMobile ? (
          // Mobile Ansicht: Eine Liste von Boxen statt einer Tabelle
          <Box>
            {recordsData.map((record, index) => (
              <Box 
                key={record.id}
                sx={{ 
                  p: 2,
                  borderBottom: index === recordsData.length - 1 ? 'none' : `1px solid ${theme.palette.grey[800]}`,
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
                }}
              >
                <Typography sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontWeight: 600, fontSize: '0.9rem', mb: 2, textAlign: "center" }}>
                  {record.recordTitle}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      alt={`${record.teamName} Logo`}
                      sx={{
                        width: 28,
                        height: 28,
                        mr: 1.5,
                        fontSize: '0.7rem',
                        color: theme.palette.getContrastText(record.teamLogoColor || theme.palette.grey[700]),
                        backgroundColor: record.teamLogoColor || theme.palette.grey[700],
                      }}
                    >
                      {record.teamName.substring(0, 1).toUpperCase()}
                    </Avatar>
                    <Typography noWrap sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[200], fontSize: '0.8rem' }}>
                      {record.teamName}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontWeight: 'bold', fontSize: '1rem' }}>
                    {record.value}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          // Desktop Ansicht: Die bekannte Tabelle ohne Header
          <TableContainer>
            <Table aria-label="Tabelle der Rekorde">
              {/* TableHead wurde entfernt */}
              <TableBody>
                {recordsData.map((record) => (
                  <TableRow
                    key={record.id}
                    sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}
                  >
                    <TableCell sx={{ width: '35%', borderBottomColor: 'grey.800', py: 1.5 }}>
                      <Typography sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontWeight: 600, fontSize: '0.9rem' }}>
                        {record.recordTitle}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '40%', borderBottomColor: 'grey.800', py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          alt={`${record.teamName} Logo`}
                          sx={{
                            width: 32,
                            height: 32,
                            mr: 1.5,
                            fontSize: '0.8rem',
                            color: theme.palette.getContrastText(record.teamLogoColor || theme.palette.grey[700]),
                            backgroundColor: record.teamLogoColor || theme.palette.grey[700],
                          }}
                        >
                          {record.teamName.substring(0, 1).toUpperCase()}
                        </Avatar>
                        <Typography noWrap sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[200], fontSize: '0.9rem' }}>
                          {record.teamName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ width: '25%', borderBottomColor: 'grey.800', py: 1.5 }}>
                      <Typography sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontWeight: 'bold', fontSize: '1rem' }}>
                        {record.value}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default RecordsList;
