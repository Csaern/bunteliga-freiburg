import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import { styled, useTheme } from '@mui/material/styles';
import { Link } from 'react-router-dom';

import HomeIcon from '@mui/icons-material/Home';
import TableViewIcon from '@mui/icons-material/TableView';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PermContactCalendarIcon from '@mui/icons-material/PermContactCalendar';
import ListIcon from '@mui/icons-material/List';
import VpnKeyIcon from '@mui/icons-material/VpnKey'; // NEU: Icon für Login
import LogoutIcon from '@mui/icons-material/Logout'; // NEU: Icon für Logout
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'; // NEU: Icon für Admin

import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../img/logo.png';

// NEUE IMPORTS FÜR AUTHENTIFIZIERUNG
import { useAuth } from '../context/AuthProvider';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';


// Navigationsliste
const pages = [
  { text: 'Home', iconName: 'HomeIcon', path: '/' },
  { text: 'Ergebnisse', iconName: 'TableViewIcon', path: '/ergebnisse' },
  { text: 'Teams', iconName: 'Diversity3Icon', path: '/teams' },
  { text: 'Historiker-Ecke', iconName: 'ScheduleIcon', path: '/historie' },
  { text: 'Regeln', iconName: 'GavelIcon', path: '/regeln' },
  { text: 'Plätze', iconName: 'ScheduleIcon', path: '/plaetze' },
  { text: 'Kontakt', iconName: 'PermContactCalendarIcon', path: '/kontakt' },
];

const iconMap = {
  HomeIcon: HomeIcon,
  TableViewIcon: TableViewIcon,
  Diversity3Icon: Diversity3Icon,
  ScheduleIcon: ScheduleIcon,
  PermContactCalendarIcon: PermContactCalendarIcon,
  DefaultIcon: ListIcon,
  VpnKeyIcon: VpnKeyIcon, // NEU
  LogoutIcon: LogoutIcon, // NEU
  AdminPanelSettingsIcon: AdminPanelSettingsIcon, // NEU
};

// ... (Unveränderte Konstanten: drawerWidth, initialLogoHeight, mobileInitialLogoHeight, etc.) ...
const drawerWidth = 240;
const initialLogoHeight = 65;
const shrunkLogoHeight = 40;
const mobileInitialLogoHeight = 60;
const mobileShrunkLogoHeight = 30;
const appBarBackgroundColor = 'rgba(10, 10, 10, 0.77)';
const appBarBlur = 'blur(8px)';
const colorfulTextPalette = [
  '#00A99D', // Blaugrün
  '#FFBF00', // Gold/Bernstein
  '#3366CC', // Kräftiges Blau
  '#4CAF50', // Sattes Grün
];

const ColorfulText = ({ text }) => {
    // ... (unveränderter Code) ...
    return (
        <Box component="span" sx={{ display: 'inline-flex' }}>
            {text.split('').map((char, index) => (
                <Box
                    component="span"
                    key={index}
                    sx={{ color: colorfulTextPalette[index % colorfulTextPalette.length] }}
                >
                    {char}
                </Box>
            ))}
        </Box>
    );
};


const CustomDrawerHeader = styled('div')(({ theme }) => ({
    // ... (unveränderter Code) ...
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: 'flex-start',
}));


function Header() {
  const navigate = useNavigate();
  const theme = useTheme();
  const location = useLocation(); 
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isShrunk, setIsShrunk] = React.useState(false);
  
  // NEU: Auth Hook verwenden
  const { currentUser } = useAuth(); 

  // Handler zum Abmelden
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Optional: Benutzer zur Startseite oder Login-Seite leiten
      navigate('/'); 
    } catch (error) {
      console.error("Fehler beim Abmelden:", error);
    }
  };


  React.useEffect(() => {
    // ... (unveränderter Scroll-Effekt) ...
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (!isShrunk && scrollY > 150) {
        setIsShrunk(true);
      } else if (isShrunk && scrollY < 100) {
        setIsShrunk(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isShrunk]); 

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const drawerContent = (
    // ... (Drawer Box unverändert) ...
    <Box
        sx={{
            width: drawerWidth,
            backgroundColor: appBarBackgroundColor,
            backdropFilter: appBarBlur,
            color: theme.palette.common.white,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
        }}
    >
        <CustomDrawerHeader sx={{ justifyContent: 'flex-end' }}>
            <IconButton onClick={handleDrawerToggle} sx={{ color: theme.palette.common.white }}>
                {theme.direction === 'rtl' ? <ChevronRightIcon />: <ChevronLeftIcon />}
            </IconButton>
        </CustomDrawerHeader>
        <Divider sx={{ borderColor: theme.palette.grey[850] }} />
        <List sx={{ flexGrow: 1 }}>
          {pages.map((pageItem) => {
            const IconComponent = iconMap[pageItem.iconName] || iconMap.DefaultIcon;
            const isActive = location.pathname === pageItem.path;
            return (
              <ListItem key={pageItem.text} disablePadding>
                <ListItemButton
                  component={Link}
                  to={pageItem.path}
                  onClick={() => {handleDrawerToggle(); }}
                  sx={{ 
                    backgroundColor: isActive ? '#00A99D' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive ? '#FFBF00' : theme.palette.grey[800],
                    },
                    borderRadius: theme.shape.borderRadius,
                    margin: theme.spacing(0.5, 1),
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? theme.palette.common.white : theme.palette.grey[400], minWidth: 'auto', mr: 1.5 }}>
                    {IconComponent ? <IconComponent fontSize="small" /> : null}
                  </ListItemIcon>
                  <ListItemText 
                    primary={pageItem.text} 
                    primaryTypographyProps={{ 
                        fontWeight: isActive ? 'bold' : 'normal',
                        color: isActive ? theme.palette.common.white : theme.palette.grey[300],
                        fontFamily: 'comfortaa',
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
          
          {/* NEU: Dashboard-Button im mobilen Menü */}
          {currentUser && (
            <>
              <Divider sx={{ borderColor: theme.palette.grey[850], mt: 1, mb: 1 }} />
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to="/dashboard"
                  onClick={() => { handleDrawerToggle(); }}
                  sx={{ margin: theme.spacing(0.5, 1), bgcolor: '#9C27B0', '&:hover': { bgcolor: '#7B1FA2' } }}
                >
                  <ListItemIcon sx={{ color: theme.palette.common.white, minWidth: 'auto', mr: 1.5 }}>
                    <AdminPanelSettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Dashboard" 
                    primaryTypographyProps={{ fontWeight: 'bold', color: theme.palette.common.white, fontFamily: 'comfortaa' }} 
                  />
                </ListItemButton>
              </ListItem>
            </>
          )}

          {/* NEU: Login/Logout-Link im mobilen Menü */}
          <Divider sx={{ borderColor: theme.palette.grey[850], mt: 1, mb: 1 }} />
          <ListItem disablePadding>
            {currentUser ? (
                // Wenn angemeldet: Abmelde-Button anzeigen
                <ListItemButton 
                    onClick={() => { handleLogout(); handleDrawerToggle(); }}
                    sx={{ margin: theme.spacing(0.5, 1), bgcolor: theme.palette.error.main, '&:hover': { bgcolor: theme.palette.error.dark } }}
                >
                    <ListItemIcon sx={{ color: theme.palette.common.white, minWidth: 'auto', mr: 1.5 }}>
                        <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                        primary={`Abmelden (${currentUser.email})`} 
                        primaryTypographyProps={{ fontWeight: 'bold', color: theme.palette.common.white, fontFamily: 'comfortaa' }} 
                    />
                </ListItemButton>
            ) : (
                // Wenn abgemeldet: Anmelde-Link anzeigen
                <ListItemButton
                    component={Link}
                    to="/login"
                    onClick={() => { handleDrawerToggle(); }}
                    sx={{ margin: theme.spacing(0.5, 1), bgcolor: '#00A99D', '&:hover': { bgcolor: '#FFBF00' } }}
                >
                    <ListItemIcon sx={{ color: theme.palette.common.white, minWidth: 'auto', mr: 1.5 }}>
                        <VpnKeyIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                        primary="Anmelden / Registrieren" 
                        primaryTypographyProps={{ fontWeight: 'bold', color: theme.palette.common.white, fontFamily: 'comfortaa' }} 
                    />
                </ListItemButton>
            )}
          </ListItem>
        </List>
      </Box>
  );

  return (
    // ... (AppBar unverändert) ...
    <AppBar 
      position="sticky" 
      sx={{ 
          backgroundColor: appBarBackgroundColor, 
          backdropFilter: appBarBlur,
          boxShadow: isShrunk ? theme.shadows[4] : theme.shadows[1],
          borderBottom: `1px solid ${theme.palette.grey[900]}`,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar 
          disableGutters 
          sx={{ 
              position: 'relative',
              minHeight: { 
                  xs: isShrunk ? 48 : 70, 
                  md: isShrunk ? 50 : 90 
              }, 
              transition: theme.transitions.create(['min-height'], { 
                  duration: theme.transitions.duration.short,
              }),
              py: { xs: isShrunk ? 0.25 : 0.5, md: isShrunk ? 0.25 : 0.5 }, 
          }}
        >

          {/* --- Desktop: Linker Teil (Logo/Titel) unverändert --- */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', flexGrow: 1 }}>
             {/* ... (Desktop Logo und Titel Code unverändert) ... */}
              <Box 
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }} 
                onClick={() => navigate('/')}
              >
                <img
                  src={logo} 
                  alt="Bunte Liga Freiburg Logo"
                  style={{ 
                    height: isShrunk ? `${shrunkLogoHeight}px` : `${initialLogoHeight}px`, 
                    width: 'auto', 
                    maxHeight: isShrunk ? shrunkLogoHeight : initialLogoHeight, 
                    objectFit: 'contain',
                    transition: 'height 0.3s ease-in-out, max-height 0.3s ease-in-out',
                  }}
                />
              </Box>
              <Box
                sx={{
                  ml: 1,
                  pt: 0.2, 
                  display: 'flex',
                  alignItems: 'center', 
                  fontFamily: 'comfortaa',
                  fontWeight: 700,
                  color: 'inherit',
                  transition: 'none', 
                  ...(isShrunk ? 
                    { 
                      fontSize: theme.typography.h6.fontSize, 
                      letterSpacing: '.2rem' 
                    } : 
                    { 
                      flexDirection: 'column', 
                      alignItems: 'flex-start' 
                    }
                  ),
                }}
              >
                {isShrunk ? (
                  <Typography variant="h6" component="div" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', letterSpacing: '.2rem', display:'flex', alignItems:'center' }}>
                    BUNTE&nbsp;<ColorfulText text="LIGA" />
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.1 }}>
                    <Typography component="span" variant="h5" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', letterSpacing: '.2rem', color: 'inherit' }}>
                      BUNTE LIGA
                    </Typography>
                    <Typography component="span" variant="h4" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', pt: 0.3, letterSpacing: '0.05em', mt: '-0.1em', lineHeight:1 }}>
                      <ColorfulText text="FREIBURG" />
                    </Typography>
                  </Box>
                )}
              </Box>
          </Box>
          
          {/* --- Mobile: Menü Icon & Mobiler Header unverändert --- */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, zIndex: 1301 }}>
            <IconButton
              size="large"
              aria-label="Menü öffnen"
              onClick={handleDrawerToggle}
              color="inherit"
            >
              <MenuIcon sx={{ fontSize: isShrunk ? '1.6rem' : '1.85rem', transition: 'font-size 0.3s ease-in-out' }} />
            </IconButton>
          </Box>
          {/* ... (Mobiler Header Code unverändert) ... */}
          <Box
            sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none', 
            }}
          >
              <Box 
                  sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer', 
                      pointerEvents: 'auto'
                  }} 
                  onClick={() => navigate('/')}
              >
                  <img
                    src={logo} 
                    alt="Bunte Liga Freiburg Logo Mobile"
                    style={{ 
                      height: `${isShrunk ? mobileShrunkLogoHeight : mobileInitialLogoHeight}px`, 
                      width: 'auto',
                      maxHeight: isShrunk ? mobileShrunkLogoHeight : mobileInitialLogoHeight,
                      objectFit: 'contain',
                      transition: 'none',
                    }}
                  />
                  <Box
                    sx={{
                      ml: 0.5,
                      display: 'flex',
                      alignItems: 'center', 
                      fontFamily: 'comfortaa',
                      fontWeight: 600,
                      color: 'inherit',
                      transition: 'none', 
                        ...(isShrunk ? 
                            { 
                                fontSize: theme.typography.body1.fontSize, 
                                letterSpacing: '0.05rem', 
                                alignItems:'center' 
                            } : 
                            { 
                                flexDirection: 'column', 
                                alignItems: 'center' 
                            }
                        ),
                    }}
                  >
                    {isShrunk ? (
                      <Typography variant="body1" component="div" sx={{ fontFamily: 'inherit', ml: 0.2, fontWeight: 600, letterSpacing: '0.05rem', display:'flex', alignItems:'center'}}>
                        BUNTE&nbsp;<ColorfulText text="LIGA" />
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', lineHeight: 1.0 }}>
                        <Typography component="div" variant="h6" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', letterSpacing: '0.05rem',color: 'inherit', whiteSpace:'nowrap' }}>
                          BUNTE LIGA
                        </Typography>
                        <Typography component="div" variant="h5" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', mb: 0.4 ,ml: 0.2, letterSpacing: '0.07em', mt: '-0.05em', whiteSpace:'nowrap', lineHeight:0.7 }}>
                            <ColorfulText text="FREIBURG" />
                        </Typography>
                      </Box>
                    )}
                  </Box>
              </Box>
          </Box>
          
          {/* --- Drawer unverändert --- */}
          <Drawer
            variant="temporary"
            anchor="left"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                backgroundColor: '#111', 
                backdropFilter: appBarBlur,
                color: theme.palette.common.white,
                borderRight: `1px solid ${theme.palette.grey[800]}` 
              },
            }}
          >
            {drawerContent}
          </Drawer>

          {/* --- Desktop: Navigation Buttons (rechtsbündig) --- */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0}}>
            {pages.map((pageItem) => {
              const isActive = location.pathname === pageItem.path;
              return (
                <Button
                  key={pageItem.text}
                  onClick={() => { navigate(pageItem.path);}}
                  sx={{ 
                    my: isShrunk ? 0.1 : 0.5, 
                    mx: isShrunk ? 0.3 : 0.5, 
                    color: isActive ? theme.palette.common.white : 'rgba(255, 255, 255, 0.75)', 
                    display: 'block',
                    fontFamily: 'comfortaa',
                    fontSize: isShrunk ? '0.78rem' : '0.9rem', 
                    fontWeight: isActive ? 'bold' : 400, 
                    borderBottom: isActive ? `3px solid #FFBF00` : '3px solid transparent',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: theme.palette.common.white, 
                      borderBottom: isActive ? `3px solid #00A99D` : `3px solid rgba(255, 255, 255, 0.15)`,
                    },
                    transition: theme.transitions.create(['margin', 'font-size', 'color', 'border-bottom', 'padding', 'background-color'], {
                      duration: theme.transitions.duration.short, 
                    }),
                    padding: isShrunk ? '4px 10px' : '6px 14px', 
                    minWidth: 'auto', 
                    textTransform: 'none', 
                  }}
                >
                  {pageItem.text}
                </Button>
              );
            })}

            {/* NEU: Desktop Dashboard-Button */}
            {currentUser && (
              <Button 
                component={Link}
                to="/dashboard"
                variant="contained"
                sx={{ 
                  ml: 1, 
                  bgcolor: '#9C27B0', 
                  '&:hover': { bgcolor: '#7B1FA2' },
                  fontSize: isShrunk ? '0.7rem' : '0.8rem',
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                Dashboard
              </Button>
            )}

            {/* NEU: Desktop Login/Logout-Button */}
            <Box sx={{ ml: 1 }}>
                {currentUser ? (
                    <Button 
                        onClick={handleLogout}
                        variant="contained"
                        sx={{ 
                            ml: 1, 
                            bgcolor: theme.palette.error.main, 
                            '&:hover': { bgcolor: theme.palette.error.dark },
                            fontSize: isShrunk ? '0.7rem' : '0.8rem',
                            fontWeight: 700,
                            textTransform: 'none',
                        }}
                    >
                        Logout
                    </Button>
                ) : (
                    <Button 
                        component={Link}
                        to="/login"
                        variant="contained"
                        sx={{ 
                            ml: 1, 
                            bgcolor: '#FFBF00', 
                            '&:hover': { bgcolor: '#00A99D' },
                            fontSize: isShrunk ? '0.7rem' : '0.8rem',
                            fontWeight: 700,
                            textTransform: 'none',
                        }}
                    >
                        Login
                    </Button>
                )}
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default Header;