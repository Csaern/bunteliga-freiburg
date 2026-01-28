
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Paper,
    IconButton,
    useTheme,

    Alert,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import * as websiteApi from '../../services/websiteApiService';
import { ReusableModal } from '../Helpers/modalUtils';
import AboutUsSection from '../AboutUsSection';

const AboutUsManagement = () => {
    const theme = useTheme();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Edit/Add state
    const [isEditing, setIsEditing] = useState(false);
    const [currentSection, setCurrentSection] = useState(null); // { id, title, content }

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await websiteApi.getSettings('about-us');
            if (data && Array.isArray(data.sections)) {
                setSections(data.sections);
            } else {
                setSections([]);
            }
        } catch (err) {
            console.error('Failed to load about-us data', err);
            setError('Fehler beim Laden der Daten.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentSection) return;
        setSaving(true);
        try {
            let updatedSections = [...sections];

            if (currentSection.id) {
                // Update existing
                updatedSections = updatedSections.map(s => s.id === currentSection.id ? currentSection : s);
            } else {
                // Add new
                updatedSections.push({
                    ...currentSection,
                    id: Date.now().toString(), // Simple ID generation
                });
            }

            await websiteApi.updateSettings('about-us', { sections: updatedSections });
            setSections(updatedSections);
            setIsEditing(false);
            setCurrentSection(null);
        } catch (err) {
            console.error('Failed to save', err);
            setError('Fehler beim Speichern.');
        } finally {
            setSaving(false);
        }
    };

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState(null);

    const handleDeleteClick = (id) => {
        setSectionToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!sectionToDelete) return;
        try {
            const updatedSections = sections.filter(s => s.id !== sectionToDelete);
            await websiteApi.updateSettings('about-us', { sections: updatedSections });
            setSections(updatedSections);
            setDeleteDialogOpen(false);
            setSectionToDelete(null);
        } catch (err) {
            console.error('Failed to delete', err);
            setError('Fehler beim Löschen.');
        }
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
        setSectionToDelete(null);
    };

    const startEdit = (section) => {
        setCurrentSection(section);
        setIsEditing(true);
    };

    const startAdd = () => {
        setCurrentSection({ title: '', content: '' });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setCurrentSection(null);
    };

    // Quill formatting modules
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['clean']
        ],
    };

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="body1" color="text.secondary">
                    Hier kannst du die Inhalte der "Über uns" Seite verwalten. Nutze den Editor für Formatierungen.
                </Typography>
                {!isEditing && (
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={startAdd}
                        sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}
                    >
                        Neuen Abschnitt
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* List of Sections (only visible when not editing) */
                !isEditing && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {sections.length === 0 && (
                            <Typography color="text.secondary" align="center">Keine Abschnitte vorhanden.</Typography>
                        )}
                        {sections.map((section, index) => (
                            <Accordion key={section.id || index} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
                                <AccordionSummary
                                    expandIcon={<ExpandMore />}
                                    aria-controls={`panel${index}-content`}
                                    id={`panel${index}-header`}
                                    sx={{ flexDirection: 'row-reverse', '& .MuiAccordionSummary-content': { alignItems: 'center', justifyContent: 'space-between', ml: 2 } }}
                                >
                                    <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', fontWeight: 600 }}>
                                        {section.title || '(Ohne Titel)'}
                                    </Typography>
                                    <Box>
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(section); }} sx={{ mr: 1 }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteClick(section.id); }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default', p: 3 }}>
                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>Vorschau:</Typography>
                                    <AboutUsSection
                                        title={section.title}
                                        content={section.content}
                                    />
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                )}

            {/* Editor Form */}
            {isEditing && currentSection && (
                <Paper sx={{ p: 3, mt: 2, borderRadius: 2, border: '1px solid', borderColor: 'secondary.main' }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Comfortaa', mb: 2 }}>
                        {currentSection.id ? 'Abschnitt bearbeiten' : 'Neuer Abschnitt'}
                    </Typography>

                    <TextField
                        fullWidth
                        label="Titel (Optional)"
                        value={currentSection.title}
                        onChange={(e) => setCurrentSection({ ...currentSection, title: e.target.value })}
                        sx={{ mb: 3 }}
                    />

                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Inhalt</Typography>
                    <Box sx={{
                        mb: 3,
                        '& .quill': {
                            height: '300px',
                            display: 'flex',
                            flexDirection: 'column'
                        },
                        '& .ql-container': {
                            flex: 1,
                            borderBottomLeftRadius: '8px',
                            borderBottomRightRadius: '8px',
                            fontSize: '1rem', // Default font size
                            fontFamily: 'inherit'
                        },
                        '& .ql-toolbar': {
                            borderTopLeftRadius: '8px',
                            borderTopRightRadius: '8px',
                        }
                    }}>
                        <ReactQuill
                            theme="snow"
                            value={currentSection.content}
                            onChange={(content) => setCurrentSection({ ...currentSection, content })}
                            modules={modules}
                            style={{ height: '250px' }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 6 }}>
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Abbrechen
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={saving}
                            sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}
                        >
                            {saving ? 'Speichert...' : 'Speichern'}
                        </Button>
                    </Box>
                </Paper>
            )}
            {/* Delete Confirmation Modal */}
            <ReusableModal
                open={deleteDialogOpen}
                onClose={cancelDelete}
                title="Abschnitt löschen"
            >
                <Typography sx={{ mb: 3, fontFamily: 'Comfortaa', color: 'text.primary' }}>
                    Möchtest du diesen Abschnitt wirklich unwiderruflich löschen?
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={cancelDelete}
                        sx={{ fontFamily: 'Comfortaa', borderColor: 'divider', color: 'text.secondary' }}
                    >
                        Abbrechen
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}
                    >
                        Löschen
                    </Button>
                </Box>
            </ReusableModal>
        </Box>
    );
};

export default AboutUsManagement;
