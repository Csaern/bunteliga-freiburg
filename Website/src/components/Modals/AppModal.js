import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme,
    useMediaQuery
} from '@mui/material';

const AppModal = ({
    open,
    onClose,
    title,
    children,
    actions,
    loading = false,
    fullScreenMobile = true,
    maxWidth = 'sm',
    minHeight = '450px' // Default minHeight for content
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isFullScreen = fullScreenMobile && isMobile;

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth={maxWidth}
            fullScreen={isFullScreen}
        >
            <DialogTitle sx={{ fontFamily: 'Comfortaa', fontWeight: 700 }}>
                {title}
            </DialogTitle>
            <DialogContent dividers sx={{ minHeight: isFullScreen ? 'auto' : minHeight, display: 'flex', flexDirection: 'column' }}>
                {children}
            </DialogContent>
            {actions && (
                <DialogActions sx={{ p: 2 }}>
                    {actions}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default AppModal;
