import * as React from 'react';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import { SessionProvider, signIn, signOut } from 'next-auth/react';

// Notwendige Typ-Importe
import type { Metadata } from 'next';
import type { Navigation } from '@toolpad/core/AppProvider';

// Imports für Branding und Auth
import Image from 'next/image';
import { Box } from '@mui/material';
import logo from '../data/logo.png';
import { auth } from '../auth';
import theme from '../theme';

export const metadata: Metadata = {
  title: 'Teamboard',
  description: '',
};

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: '',
    title: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    segment: 'employees',
    title: 'Employees',
    icon: <PersonIcon />,
    pattern: 'employees{/:employeeId}*',
  },
];

// Farbpalette für den bunten Titel
const colorfulTextPalette: string[] = [
  '#00A99D',
  '#FFBF00',
  '#3366CC',
  '#4CAF50',
];

// Props für die ColorfulText-Komponente typisieren
interface ColorfulTextProps {
  text: string;
}

const ColorfulText = ({ text }: ColorfulTextProps) => {
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

// Branding-Objekt mit Logo und buntem Titel
const BRANDING = {
  logo: (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Image src={logo} alt="Bunte Liga Freiburg Logo" height={40} priority />
      <Box
        component="span"
        sx={{
          fontFamily: 'comfortaa',
          fontWeight: 600,
          fontSize: '1.25rem',
          whiteSpace: 'nowrap',
          // Fügen Sie diese Zeile hinzu, um die Farbe zu überschreiben:
          color: 'white', 
        }}
      >
        Bunte <ColorfulText text="Liga" />
      </Box>
    </Box>
  ),
  title: '',
};

const AUTHENTICATION = {
  signIn,
  signOut,
};

// Props für die RootLayout-Komponente typisieren
interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await auth();

  return (
    <html lang="en" data-toolpad-color-scheme="dark" suppressHydrationWarning>
       <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionProvider session={session}>
          <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <NextAppProvider
              navigation={NAVIGATION}
              branding={BRANDING}
              session={session}
              authentication={AUTHENTICATION}
              theme={theme}
            >
              {children}
            </NextAppProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}