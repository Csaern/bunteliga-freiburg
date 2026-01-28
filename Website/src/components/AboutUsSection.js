import React from 'react';
import { Paper, Typography, useTheme } from '@mui/material';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // Keep snow theme for consistency

/**
 * AboutUsSection Component
 * 
 * Renders a single section of the "About Us" page.
 * Uses the native ReactQuill component in read-only mode to ensure 
 * 100% faithful rendering of the editor content.
 */
const AboutUsSection = ({ title, content }) => {
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            sx={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: theme.shape.borderRadius,
                border: `1px solid ${theme.palette.divider}`,
                p: { xs: 3, sm: 5 },
                mb: 4,
                overflow: 'hidden',
                // Minimal overrides to ensure the read-only editor blends in
                '& .quill': {
                    fontFamily: 'Comfortaa',
                },
                '& .ql-container': {
                    fontFamily: 'Comfortaa',
                    fontSize: '1rem',
                    border: 'none !important' // Remove default border of snow theme
                },
                '& .ql-editor': {
                    padding: 0, // Remove default editor padding
                    color: theme.palette.text.primary,
                    fontFamily: 'Comfortaa',
                    textAlign: 'justify',
                    // Let Quill handle the rest
                }
            }}
        >
            {title && (
                <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                        color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black,
                        fontFamily: 'Comfortaa',
                        fontWeight: 700,
                        mb: 2,
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}
                >
                    {title}
                </Typography>
            )}

            <ReactQuill
                value={content}
                readOnly={true}
                theme="snow"
                modules={{ toolbar: false }}
            />
        </Paper>
    );
};

export default AboutUsSection;
