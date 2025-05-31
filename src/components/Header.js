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

import HomeIcon from '@mui/icons-material/Home';
import TableViewIcon from '@mui/icons-material/TableView';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PermContactCalendarIcon from '@mui/icons-material/PermContactCalendar';
import ListIcon from '@mui/icons-material/List';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../img/logo.png';

const pages = [
  { text: 'Home', iconName: 'HomeIcon', path: '/' },
  { text: 'Ergebnisse', iconName: 'TableViewIcon', path: '/ergebnisse' },
  { text: 'Teams', iconName: 'Diversity3Icon', path: '/teams' },
  { text: 'Historiker-Ecke', iconName: 'ScheduleIcon', path: '/historie' },
  { text: 'Kontakt', iconName: 'PermContactCalendarIcon', path: '/kontakt' },
];

const iconMap = {
  HomeIcon: HomeIcon,
  TableViewIcon: TableViewIcon,
  Diversity3Icon: Diversity3Icon,
  ScheduleIcon: ScheduleIcon,
  PermContactCalendarIcon: PermContactCalendarIcon,
  DefaultIcon: ListIcon,
};

const drawerWidth = 240;
const initialLogoHeight = 58;
const shrunkLogoHeight = 40;
const mobileInitialLogoHeight = 60;
const mobileShrunkLogoHeight = 30;
const appBarBackgroundColor = 'rgba(0, 0, 0, 0.85)';
const appBarBlur = 'blur(8px)';
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

  React.useEffect(() => {
    const handleScroll = () => {
      setIsShrunk(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
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
                  onClick={() => { navigate(pageItem.path); handleDrawerToggle(); }}
                  sx={{ 
                    backgroundColor: isActive ? theme.palette.error.main : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive ? theme.palette.error.dark : theme.palette.grey[800],
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
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
  );

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
          backgroundColor: '#000', 
          backdropFilter: appBarBlur,
          boxShadow: isShrunk ? theme.shadows[4] : theme.shadows[1] 
      }}
    >
      <Container maxWidth="xl">
        <Toolbar 
          disableGutters 
          sx={{ 
            position: 'relative',
            minHeight: { 
                xs: isShrunk ? 48 : 70, 
                md: isShrunk ? 50 : 80 
            }, 
            transition: theme.transitions.create(['min-height'], { // Only min-height for Toolbar itself
              duration: theme.transitions.duration.short,
            }),
            py: { xs: isShrunk ? 0.25 : 0.5, md: isShrunk ? 0.25 : 0.5 }, 
          }}
        >

          {/* --- Desktop --- */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', flexGrow: 1 }}>
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
                  { fontSize: theme.typography.h6.fontSize, letterSpacing: '.2rem' } : 
                  { flexDirection: 'column', alignItems: 'flex-start' } // Align items to start for multi-line
                ),
              }}
            >
              {isShrunk ? (
                <Typography variant="h7" component="div" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', letterSpacing: '.2rem', display:'flex', alignItems:'center' }}>
                  BUNTE&nbsp;<Box component="span" sx={{ color: 'error.main', ml: -0.5}}>LIGA</Box>
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.1 }}>
                  <Typography component="span" variant="h7" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', letterSpacing: '.2rem', color: 'inherit' }}>
                    BUNTE LIGA
                  </Typography>
                  <Typography component="span" variant="h5" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', color: 'error.main', pt: 0.3, letterSpacing: '0.05em', mt: '-0.1em', lineHeight:1 }}>
                    FREIBURG
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          
          {/* --- Mobile: Menü Icon (links) --- */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, zIndex: 1301 /* Bleibt über dem Drawer */ }}>
            <IconButton
              size="large"
              aria-label="Menü öffnen"
              onClick={handleDrawerToggle}
              color="inherit"
            >
              <MenuIcon sx={{ fontSize: isShrunk ? '1.6rem' : '1.85rem', transition: 'font-size 0.3s ease-in-out' }} />
            </IconButton>
          </Box>

          {/* --- Mobile --- */}
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
                    transition: 'all 0.3s ease-in-out',
                     ...(isShrunk ? 
                        { fontSize: theme.typography.body1.fontSize, letterSpacing: '0.05rem', alignItems:'center' } : 
                        { flexDirection: 'column', alignItems: 'center' } 
                    ),
                  }}
                >
                  {isShrunk ? (
                    <Typography variant="body1" component="div" sx={{ fontFamily: 'inherit', ml: 0.2, fontWeight: 600, letterSpacing: '0.05rem', display:'flex', alignItems:'center'}}>
                      BUNTE&nbsp;<Box component="div" sx={{ color: 'error.main', ml: -0.4, fontWeight: 600 }}>LIGA</Box>
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', lineHeight: 1.0 }}>
                      <Typography component="div" variant="h6" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', letterSpacing: '0.05rem',color: 'inherit', whiteSpace:'nowrap' }}>
                        BUNTE LIGA
                      </Typography>
                      <Typography component="div" variant="h5" sx={{ fontFamily: 'inherit', fontWeight: 'inherit', color: 'error.main', mb: 0.4 ,ml: 0.2, letterSpacing: '0.07em', mt: '-0.05em', whiteSpace:'nowrap', lineHeight:0.7 }}>
                        FREIBURG
                      </Typography>
                    </Box>
                  )}
                </Box>
            </Box>
          </Box>
          
          {/* --- Drawer für mobile Navigation --- */}
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
                    borderBottom: isActive ? `3px solid ${theme.palette.error.main}` : '3px solid transparent',
                    borderRadius: '4px 4px 0 0', 
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: theme.palette.common.white, 
                      borderBottom: isActive ? `3px solid ${theme.palette.error.light}` : `3px solid rgba(255, 255, 255, 0.15)`,
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
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default Header;
