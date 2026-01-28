import React from 'react';
import { Modal, Paper, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Wiederverwendbare Modal-Komponente
export const ReusableModal = ({ open, onClose, title, children, fullScreen }) => (
    <Modal open={open} onClose={onClose} sx={{ mx: fullScreen ? 0 : { xs: 2 } }}>
        <Paper sx={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: fullScreen ? '100%' : { xs: '90%', sm: 600 },
            height: fullScreen ? '100%' : 'auto', // Full height if fullScreen
            maxHeight: fullScreen ? '100%' : '90vh',
            bgcolor: 'background.paper',
            backdropFilter: 'blur(8px)',
            border: fullScreen ? 'none' : '1px solid',
            borderColor: 'divider',
            borderRadius: fullScreen ? 0 : 3,
            boxShadow: 24, p: { xs: 2, sm: 4 },
            overflowY: 'auto', // Scrollable if needed
            display: 'flex', flexDirection: 'column' // Flex layout for children
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ fontFamily: 'comfortaa', color: 'text.primary' }}>
                    {title}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'grey.400' }}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {children}
            </Box>
        </Paper>
    </Modal>
);