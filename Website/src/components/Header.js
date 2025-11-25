import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
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
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery'; // Added import
import { Link } from 'react-router-dom';

import HomeIcon from '@mui/icons-material/Home';
import TableViewIcon from '@mui/icons-material/TableView';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PermContactCalendarIcon from '@mui/icons-material/PermContactCalendar';
import GavelIcon from '@mui/icons-material/Gavel';
import ListIcon from '@mui/icons-material/List';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InsightsIcon from '@mui/icons-material/Insights';
import StyleIcon from '@mui/icons-material/Style';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StadiumIcon from '@mui/icons-material/Stadium';
import ArticleIcon from '@mui/icons-material/Article';


import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../img/logo.png';

import { useAuth } from '../context/AuthProvider';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';


const pages = [
  { text: 'Home', iconName: 'HomeIcon', path: '/' },
  { text: 'Ergebnisse', iconName: 'TableViewIcon', path: '/ergebnisse' },
  { text: 'Teams', iconName: 'Diversity3Icon', path: '/teams' },
  { text: 'Historiker-Ecke', iconName: 'ScheduleIcon', path: '/historie' },
  { text: 'Regeln', iconName: 'GavelIcon', path: '/regeln' },
  { text: 'Über uns', iconName: 'ScheduleIcon', path: '/ueberuns' },
];

const adminPages = [
  { text: 'Übersicht', path: '/admin/dashboard', iconName: 'DashboardIcon' },
  { text: 'Buchungen', path: '/admin/bookings', iconName: 'EventIcon' },
  { text: 'Benutzer', path: '/admin/users', iconName: 'GroupIcon' },
  { text: 'Saisons', path: '/admin/season', iconName: 'EmojiEventsIcon' },
  { text: 'Ergebnisse', path: '/admin/results', iconName: 'InsightsIcon' },
  { text: 'Teams', path: '/admin/teams', iconName: 'StyleIcon' },
  { text: 'Plätze', path: '/admin/pitches', iconName: 'StadiumIcon' },
];

const teamboardPages = [
  { text: 'Übersicht', path: '/dashboard', iconName: 'DashboardIcon' },
  { text: 'Platz buchen', path: '/platzreservierung', iconName: 'EventIcon' },
];

const iconMap = {
  HomeIcon: HomeIcon,
  ArticleIcon: ArticleIcon,
  TableViewIcon: TableViewIcon,
  Diversity3Icon: Diversity3Icon,
  ScheduleIcon: ScheduleIcon,
  PermContactCalendarIcon: PermContactCalendarIcon,
  GavelIcon: GavelIcon,
  DefaultIcon: ListIcon,
  VpnKeyIcon: VpnKeyIcon,
  LogoutIcon: LogoutIcon,
  AdminPanelSettingsIcon: AdminPanelSettingsIcon,
  EventIcon: EventIcon,
  GroupIcon: GroupIcon,
  EmojiEventsIcon: EmojiEventsIcon,
  InsightsIcon: InsightsIcon,
  StyleIcon: StyleIcon,
  DashboardIcon: DashboardIcon,
  StadiumIcon: StadiumIcon,
};

const drawerWidth = 240;
const initialLogoHeight = 65;
const shrunkLogoHeight = 40;
const mobileInitialLogoHeight = 60;
const mobileShrunkLogoHeight = 30;
const appBarBackgroundColor = 'rgba(10, 10, 10, 0.77)';
const appBarBlur = 'blur(8px)';
const colorfulTextPalette = [
  '#00A99D', // theme.palette.primary.main
  '#FFBF00', // theme.palette.secondary.main
  '#3366CC',
  '#4CAF50',
];

const ColorfulText = ({ text }) => {
  return (
    <Box component="span" sx={{ display: 'inline-flex' }}>
      {text.split('').map((char, index) => (
        <Box component="span" key={index} sx={{ color: colorfulTextPalette[index % colorfulTextPalette.length] }}>
          {char}
        </Box>
      ))}
    </Box>
  );
};

const CustomDrawerHeader = styled('div')(({ theme }) => ({
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
  const [adminMenuAnchorEl, setAdminMenuAnchorEl] = React.useState(null);
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = React.useState(false);
  const [teamboardMenuAnchorEl, setTeamboardMenuAnchorEl] = React.useState(null);
  const [mobileTeamboardMenuOpen, setMobileTeamboardMenuOpen] = React.useState(false);

  // Custom breakpoint for mobile menu activation at 850px
  const isMobile = useMediaQuery('(max-width:850px)');

  const { currentUser, isAdmin, teamId } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) { console.error("Fehler beim Abmelden:", error); }
  };

  const handleAdminMenuOpen = (event) => setAdminMenuAnchorEl(event.currentTarget);
  const handleAdminMenuClose = () => setAdminMenuAnchorEl(null);
  const handleMobileAdminMenuToggle = () => setMobileAdminMenuOpen(!mobileAdminMenuOpen);

  const handleTeamboardMenuOpen = (event) => setTeamboardMenuAnchorEl(event.currentTarget);
  const handleTeamboardMenuClose = () => setTeamboardMenuAnchorEl(null);
  const handleMobileTeamboardMenuToggle = () => setMobileTeamboardMenuOpen(!mobileTeamboardMenuOpen);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (!isShrunk && scrollY > 150) setIsShrunk(true);
      else if (isShrunk && scrollY < 100) setIsShrunk(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isShrunk]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const isTeamboardActive = teamboardPages.some(page => location.pathname.startsWith(page.path));

  const drawerContent = (
    <Box
      sx={{
        width: drawerWidth,
        backgroundColor: appBarBackgroundColor,
        backdropFilter: appBarBlur,
        color: theme.palette.common.white,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden', // Prevent horizontal scrollbar
        '&::-webkit-scrollbar': { display: 'none' },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      <CustomDrawerHeader sx={{ justifyContent: 'flex-end' }}>
        <IconButton onClick={handleDrawerToggle} sx={{ color: theme.palette.common.white }}>
          {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </CustomDrawerHeader>
      <Divider sx={{ borderColor: theme.palette.grey[850] }} />

      <List>
        {currentUser && teamId && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={handleMobileTeamboardMenuToggle} sx={{ margin: theme.spacing(0.5, 1) }}>
                <ListItemIcon sx={{ color: theme.palette.common.white, minWidth: 'auto', mr: 1.5 }}><DashboardIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Teamboard" primaryTypographyProps={{ fontWeight: 'bold', color: theme.palette.common.white }} />
                {mobileTeamboardMenuOpen ? <ExpandLess sx={{ color: 'white' }} /> : <ExpandMore sx={{ color: 'white' }} />}
              </ListItemButton>
            </ListItem>
            <Collapse in={mobileTeamboardMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {teamboardPages.map((page) => {
                  const isActive = location.pathname === page.path;
                  return (
                    <ListItem key={page.text} disablePadding sx={{ pl: 4 }}>
                      <ListItemButton component={Link} to={page.path} onClick={handleDrawerToggle}
                        sx={{
                          backgroundColor: isActive ? 'rgba(255, 191, 0, 0.2)' : 'transparent',
                          borderRadius: theme.shape.borderRadius, margin: theme.spacing(0.5, 1),
                        }}
                      >
                        <ListItemText primary={page.text} primaryTypographyProps={{ fontSize: '0.9rem', color: isActive ? theme.palette.secondary.main : 'inherit' }} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </>
        )}

        {isAdmin && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={handleMobileAdminMenuToggle} sx={{ margin: theme.spacing(0.5, 1) }}>
                <ListItemIcon sx={{ color: theme.palette.common.white, minWidth: 'auto', mr: 1.5 }}><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Admin" primaryTypographyProps={{ fontWeight: 'bold', color: theme.palette.common.white }} />
                {mobileAdminMenuOpen ? <ExpandLess sx={{ color: 'white' }} /> : <ExpandMore sx={{ color: 'white' }} />}
              </ListItemButton>
            </ListItem>
            <Collapse in={mobileAdminMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {adminPages.map((page) => {
                  const isActive = location.pathname === page.path;
                  return (
                    <ListItem key={page.text} disablePadding sx={{ pl: 4 }}>
                      <ListItemButton component={Link} to={page.path} onClick={handleDrawerToggle}
                        sx={{
                          backgroundColor: isActive ? 'rgba(255, 191, 0, 0.2)' : 'transparent',
                          borderRadius: theme.shape.borderRadius, margin: theme.spacing(0.5, 1),
                        }}
                      >
                        <ListItemText primary={page.text} primaryTypographyProps={{ fontSize: '0.9rem', color: isActive ? theme.palette.secondary.main : 'inherit' }} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </>
        )}

        {pages.map((pageItem) => {
          const IconComponent = iconMap[pageItem.iconName] || iconMap.DefaultIcon;
          const isActive = location.pathname === pageItem.path;
          return (
            <ListItem key={pageItem.text} disablePadding>
              <ListItemButton component={Link} to={pageItem.path} onClick={handleDrawerToggle}
                sx={{
                  backgroundColor: isActive ? 'rgba(255, 191, 0, 0.2)' : 'transparent',
                  '&:hover': { backgroundColor: theme.palette.grey[800] },
                  borderRadius: theme.shape.borderRadius, margin: theme.spacing(0.5, 1),
                }}
              >
                <ListItemIcon sx={{ color: isActive ? theme.palette.secondary.main : theme.palette.grey[400], minWidth: 'auto', mr: 1.5 }}>
                  {IconComponent ? <IconComponent fontSize="small" /> : null}
                </ListItemIcon>
                <ListItemText primary={pageItem.text} primaryTypographyProps={{ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? theme.palette.secondary.main : theme.palette.grey[300] }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ marginTop: 'auto' }}>
        <Divider sx={{ borderColor: theme.palette.grey[850], mt: 1, mb: 0 }} />
        <ListItem disablePadding>
          {currentUser ? (
            <ListItemButton onClick={() => { handleLogout(); handleDrawerToggle(); }} sx={{ margin: 0, width: '100%', borderRadius: 0, bgcolor: theme.palette.error.main, '&:hover': { bgcolor: theme.palette.error.dark } }}>
              <ListItemIcon sx={{ color: theme.palette.common.white, minWidth: 'auto', mr: 1.5 }}><LogoutIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={`Abmelden`} secondary={currentUser.email} primaryTypographyProps={{ fontWeight: 'bold', color: theme.palette.common.white }} secondaryTypographyProps={{
                fontSize: '0.7rem',
                color: theme.palette.grey[300],
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} />
            </ListItemButton>
          ) : (
            <ListItemButton component={Link} to="/login" onClick={handleDrawerToggle} sx={{ margin: 0, width: '100%', borderRadius: 0, bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.secondary.main } }}>
              <ListItemIcon sx={{ color: theme.palette.common.white, minWidth: 'auto', mr: 1.5 }}><VpnKeyIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Anmelden" primaryTypographyProps={{ fontWeight: 'bold', color: theme.palette.common.white }} />
            </ListItemButton>
          )}
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <AppBar position="sticky" sx={{ backgroundColor: appBarBackgroundColor, backdropFilter: appBarBlur, boxShadow: isShrunk ? theme.shadows[4] : theme.shadows[1], borderBottom: `1px solid ${theme.palette.grey[900]}` }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ position: 'relative', minHeight: { xs: isShrunk ? 48 : 70, md: isShrunk ? 50 : 90 }, transition: theme.transitions.create(['min-height'], { duration: theme.transitions.duration.short }), py: { xs: isShrunk ? 0.25 : 0.5, md: isShrunk ? 0.25 : 0.5 } }}>
          <Box sx={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/')}>
              <img src={logo} alt="Bunte Liga Freiburg Logo" style={{ height: isShrunk ? `${shrunkLogoHeight}px` : `${initialLogoHeight}px`, width: 'auto', maxHeight: isShrunk ? shrunkLogoHeight : initialLogoHeight, objectFit: 'contain', transition: 'height 0.3s ease-in-out, max-height 0.3s ease-in-out' }} />
            </Box>
            <Box sx={{ ml: 1, pt: 0.2, display: 'flex', alignItems: 'center', fontWeight: 700, color: 'inherit', transition: 'none', ...(isShrunk ? { fontSize: theme.typography.h6.fontSize, letterSpacing: '.2rem' } : { flexDirection: 'column', alignItems: 'flex-start' }) }}>
              {isShrunk ? (
                <Typography variant="h6" component="div" sx={{ fontWeight: 'inherit', letterSpacing: '.2rem', display: 'flex', alignItems: 'center' }}>BUNTE&nbsp;<ColorfulText text="LIGA" /></Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.1 }}>
                  <Typography component="span" variant="h5" sx={{ fontWeight: 'inherit', letterSpacing: '.2rem', color: 'inherit' }}>BUNTE LIGA</Typography>
                  <Typography component="span" variant="h4" sx={{ fontWeight: 'inherit', pt: 0.3, letterSpacing: '0.05em', mt: '-0.1em', lineHeight: 1 }}><ColorfulText text="FREIBURG" /></Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: isMobile ? 'flex' : 'none', zIndex: 1301 }}>
            <IconButton size="large" aria-label="Menü öffnen" onClick={handleDrawerToggle} color="inherit">
              <MenuIcon sx={{ fontSize: isShrunk ? '1.6rem' : '1.85rem', transition: 'font-size 0.3s ease-in-out' }} />
            </IconButton>
          </Box>

          <Box sx={{ display: isMobile ? 'flex' : 'none', alignItems: 'center', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', pointerEvents: 'auto' }} onClick={() => navigate('/')}>
              <img src={logo} alt="Bunte Liga Freiburg Logo Mobile" style={{ height: `${isShrunk ? mobileShrunkLogoHeight : mobileInitialLogoHeight}px`, width: 'auto', maxHeight: isShrunk ? mobileShrunkLogoHeight : mobileInitialLogoHeight, objectFit: 'contain', transition: 'none' }} />
              <Box sx={{ ml: 0.5, display: 'flex', alignItems: 'center', fontWeight: 600, color: 'inherit', transition: 'none', ...(isShrunk ? { fontSize: theme.typography.body1.fontSize, letterSpacing: '0.05rem', alignItems: 'center' } : { flexDirection: 'column', alignItems: 'center' }) }}>
                {isShrunk ? (
                  <Typography variant="body1" component="div" sx={{ ml: 0.2, fontWeight: 600, letterSpacing: '0.05rem', display: 'flex', alignItems: 'center', fontFamily: 'Comfortaa' }}>BUNTE&nbsp;<ColorfulText text="LIGA" /></Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', lineHeight: 1.0 }}>
                    <Typography component="div" variant="h6" sx={{ fontWeight: 'inherit', letterSpacing: '0.05rem', color: 'inherit', whiteSpace: 'nowrap' }}>BUNTE LIGA</Typography>
                    <Typography component="div" variant="h5" sx={{ fontWeight: 'inherit', mb: 0.4, ml: 0.2, letterSpacing: '0.07em', mt: '-0.05em', whiteSpace: 'nowrap', lineHeight: 0.7 }}><ColorfulText text="FREIBURG" /></Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>


          <Drawer variant="temporary" anchor="left" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: '#111', backdropFilter: appBarBlur, color: theme.palette.common.white, borderRight: `1px solid ${theme.palette.grey[800]}` } }}>
            {drawerContent}
          </Drawer>

          <Box sx={{ display: isMobile ? 'none' : 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
            {pages.map((pageItem) => {
              const isActive = location.pathname === pageItem.path;
              return (
                <Button key={pageItem.text} onClick={() => navigate(pageItem.path)}
                  sx={{ my: isShrunk ? 0.1 : 0.5, mx: isShrunk ? 0.3 : 0.5, color: isActive ? theme.palette.secondary.main : 'rgba(255, 255, 255, 0.75)', display: 'block', fontSize: isShrunk ? '0.78rem' : '0.9rem', fontWeight: isActive ? 'bold' : 400, borderBottom: isActive ? `3px solid ${theme.palette.secondary.main}` : '3px solid transparent', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: theme.palette.common.white, borderBottom: `3px solid rgba(255, 255, 255, 0.15)` }, transition: theme.transitions.create(['margin', 'font-size', 'color', 'border-bottom', 'padding', 'background-color'], { duration: theme.transitions.duration.short }), padding: isShrunk ? '4px 10px' : '6px 14px', minWidth: 'auto', textTransform: 'none' }}
                >
                  {pageItem.text}
                </Button>
              );
            })}

            {currentUser && teamId && (
              <>
                <Button id="teamboard-menu-button" onClick={handleTeamboardMenuOpen}
                  sx={{ my: isShrunk ? 0.1 : 0.5, mx: isShrunk ? 0.3 : 0.5, color: isTeamboardActive ? theme.palette.secondary.main : 'rgba(255, 255, 255, 0.75)', display: 'block', fontSize: isShrunk ? '0.78rem' : '0.9rem', fontWeight: isTeamboardActive ? 'bold' : 400, borderBottom: isTeamboardActive ? `3px solid ${theme.palette.secondary.main}` : '3px solid transparent', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: theme.palette.common.white, borderBottom: `3px solid rgba(255, 255, 255, 0.15)` }, transition: theme.transitions.create(['margin', 'font-size', 'color', 'border-bottom', 'padding', 'background-color'], { duration: theme.transitions.duration.short }), padding: isShrunk ? '4px 10px' : '6px 14px', minWidth: 'auto', textTransform: 'none' }}
                >
                  Teamboard
                </Button>
                <Menu id="teamboard-menu" anchorEl={teamboardMenuAnchorEl} open={Boolean(teamboardMenuAnchorEl)} onClose={handleTeamboardMenuClose} MenuListProps={{ 'aria-labelledby': 'teamboard-menu-button' }} PaperProps={{ sx: { backgroundColor: '#333', color: 'white' } }}>
                  {teamboardPages.map((page) => (
                    <MenuItem key={page.text} onClick={() => { handleTeamboardMenuClose(); navigate(page.path); }} sx={{ '&:hover': { backgroundColor: 'rgba(255, 191, 0, 0.2)' } }}>
                      {page.text}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}

            {isAdmin && (
              <>
                <Button id="admin-menu-button" aria-controls={Boolean(adminMenuAnchorEl) ? 'admin-menu' : undefined} aria-haspopup="true" aria-expanded={Boolean(adminMenuAnchorEl) ? 'true' : undefined} onClick={handleAdminMenuOpen}
                  sx={{ my: isShrunk ? 0.1 : 0.5, mx: isShrunk ? 0.3 : 0.5, color: location.pathname.startsWith('/admin') ? theme.palette.secondary.main : 'rgba(255, 255, 255, 0.75)', display: 'block', fontSize: isShrunk ? '0.78rem' : '0.9rem', fontWeight: location.pathname.startsWith('/admin') ? 'bold' : 400, borderBottom: location.pathname.startsWith('/admin') ? `3px solid ${theme.palette.secondary.main}` : '3px solid transparent', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: theme.palette.common.white, borderBottom: `3px solid rgba(255, 255, 255, 0.15)` }, transition: theme.transitions.create(['margin', 'font-size', 'color', 'border-bottom', 'padding', 'background-color'], { duration: theme.transitions.duration.short }), padding: isShrunk ? '4px 10px' : '6px 14px', minWidth: 'auto', textTransform: 'none' }}
                >
                  Admin
                </Button>
                <Menu id="admin-menu" anchorEl={adminMenuAnchorEl} open={Boolean(adminMenuAnchorEl)} onClose={handleAdminMenuClose} MenuListProps={{ 'aria-labelledby': 'admin-menu-button' }} PaperProps={{ sx: { backgroundColor: '#333', color: 'white' } }}>
                  {adminPages.map((page) => (
                    <MenuItem key={page.text} onClick={() => { handleAdminMenuClose(); navigate(page.path); }} sx={{ '&:hover': { backgroundColor: 'rgba(255, 191, 0, 0.2)' } }}>
                      {page.text}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}

            <Box sx={{ ml: 1 }}>
              {currentUser ? (
                <Button onClick={handleLogout} variant="contained"
                  sx={{ ml: 1, bgcolor: theme.palette.error.main, '&:hover': { bgcolor: theme.palette.error.dark }, fontSize: isShrunk ? '0.7rem' : '0.8rem', fontWeight: 700, textTransform: 'none', borderRadius: '16px' }}
                >
                  Logout
                </Button>
              ) : (
                <Button component={Link} to="/login" variant="contained"
                  sx={{ ml: 1, bgcolor: theme.palette.secondary.main, '&:hover': { bgcolor: theme.palette.primary.main }, fontSize: isShrunk ? '0.7rem' : '0.8rem', fontWeight: 700, textTransform: 'none', borderRadius: '16px' }}
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
