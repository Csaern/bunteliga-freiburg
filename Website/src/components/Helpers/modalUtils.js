import React from 'react';
import { Modal, Paper, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Wiederverwendbare Modal-Komponente
export const ReusableModal = ({ open, onClose, title, children }) => (
    <Modal open={open} onClose={onClose} sx={{ mx: { xs: 2 } }}>
        <Paper sx={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 600 },
            bgcolor: 'background.paper', // Use theme background
            backdropFilter: 'blur(8px)',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            boxShadow: 24, p: { xs: 2, sm: 4 },
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ fontFamily: 'comfortaa', color: 'text.primary' }}>
                    {title}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'grey.400' }}>
                    <CloseIcon />
                </IconButton>
            </Box>
            {children}
        </Paper>
    </Modal>
);