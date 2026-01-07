import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import getTheme from '../theme';

export const ColorModeContext = React.createContext({ toggleColorMode: () => { } });

export const ColorModeProvider = ({ children }) => {
    const [mode, setMode] = React.useState('dark');

    React.useEffect(() => {
        const savedMode = localStorage.getItem('themeMode');
        if (savedMode) {
            setMode(savedMode);
        }
    }, []);

    const colorMode = React.useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => {
                    const newMode = prevMode === 'light' ? 'dark' : 'light';
                    localStorage.setItem('themeMode', newMode);
                    return newMode;
                });
            },
        }),
        [],
    );

    const theme = React.useMemo(() => getTheme(mode), [mode]);

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};
