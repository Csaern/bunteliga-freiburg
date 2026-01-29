import React, { useState } from 'react';
import { Box, Typography, useTheme, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NewsManagement from './NewsManagement';
import RulesManagement from './RulesManagement';
import ClubInfoManagement from './ClubInfoManagement';
import FunctionariesManagement from './FunctionariesManagement';
import AboutUsManagement from './AboutUsManagement';

const WebsiteManager = () => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState('news');

    const handleChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 3 } }}>
            <Typography variant="h3" sx={{
                mb: 4,
                color: theme.palette.primary.main,
                fontWeight: 700,
                fontFamily: 'comfortaa',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
            }}>
                Website
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '1200px', mx: 'auto' }}>
                {/* News Sektion */}
                <Accordion
                    expanded={expanded === 'news'}
                    onChange={handleChange('news')}
                    sx={{
                        borderRadius: '16px !important',
                        overflow: 'hidden',
                        background: 'background.paper',
                        boxShadow: 'none',
                        '&:before': { display: 'none' }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.text.primary }}>
                            News & Aktuelles
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <NewsManagement />
                    </AccordionDetails>
                </Accordion>

                {/* Regeln Sektion */}
                <Accordion
                    expanded={expanded === 'rules'}
                    onChange={handleChange('rules')}
                    sx={{
                        borderRadius: '16px !important',
                        overflow: 'hidden',
                        background: 'background.paper',
                        boxShadow: 'none',
                        '&:before': { display: 'none' }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.text.primary }}>
                            Regelwerk
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <RulesManagement />
                    </AccordionDetails>
                </Accordion>

                {/* Vereinsdaten Sektion */}
                <Accordion
                    expanded={expanded === 'clubinfo'}
                    onChange={handleChange('clubinfo')}
                    sx={{
                        borderRadius: '16px !important',
                        overflow: 'hidden',
                        background: 'background.paper',
                        boxShadow: 'none',
                        '&:before': { display: 'none' }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.text.primary }}>
                            Vereinsdaten
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <ClubInfoManagement />
                    </AccordionDetails>
                </Accordion>

                {/* Funktionäre Sektion */}
                <Accordion
                    expanded={expanded === 'functionaries'}
                    onChange={handleChange('functionaries')}
                    sx={{
                        borderRadius: '16px !important',
                        overflow: 'hidden',
                        background: 'background.paper',
                        boxShadow: 'none',
                        '&:before': { display: 'none' }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.text.primary }}>
                            Funktionäre
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <FunctionariesManagement />
                    </AccordionDetails>
                </Accordion>

                {/* Über uns Sektion */}
                <Accordion
                    expanded={expanded === 'aboutus'}
                    onChange={handleChange('aboutus')}
                    sx={{
                        borderRadius: '16px !important',
                        overflow: 'hidden',
                        background: 'background.paper',
                        boxShadow: 'none',
                        '&:before': { display: 'none' }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.text.primary }}>
                            Über uns
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <AboutUsManagement />
                    </AccordionDetails>
                </Accordion>
            </Box>
        </Box>
    );
};

export default WebsiteManager;
