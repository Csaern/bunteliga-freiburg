import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    Alert,
    Tooltip,
    Chip,
    useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import AppModal from '../Modals/AppModal';
import * as websiteApi from '../../services/websiteApiService';

const defaultLeagueRules = [
    { rule: 'Spielmodus', description: 'Jedes Team spielt im Laufe einer Saison einmal gegen jedes andere Team der Liga.' },
    { rule: 'Punktesystem', description: 'Für einen Sieg gibt es {{pointsForWin}} Punkte, für ein Unentschieden {{pointsForDraw}} Punkt(e).' },
    { rule: 'Tabellenplatzierung', description: 'Bei Punktgleichheit entscheiden folgende Kriterien in dieser Reihenfolge: {{rankingCriteria}}.' },
    { rule: 'Meisterschaftsentscheid', description: 'Bei Punktgleichheit auf dem ersten Platz am Saisonende ist ein Entscheidungsspiel oder -turnier zwischen den betroffenen Teams vorgesehen.' },
    { rule: 'Spielwertung', description: 'Teams, die nicht mindestens 50% ihrer Spiele absolviert haben, werden aus der Wertung genommen. Ihre bisherigen Ergebnisse werden annulliert.' },
    { rule: 'Spielabsagen', description: 'Spielabsagen müssen möglichst 48 Stunden vor dem geplanten Anpfiff erfolgen. Sagt ein Team zum dritten Mal ein Spiel ab, wird dieses mit 0:2 gegen das absagende Team gewertet.' }
];

const defaultGameRules = [
    { rule: 'Schiedsrichter', description: 'Es wird grundsätzlich ohne Schiedsrichter gespielt. Fair Play ist das oberste Gebot.' },
    { rule: 'Foulspiel', description: 'Der gefoulte Spieler entscheidet selbst, ob ein Foul vorlag und ruft dieses aus.' },
    { rule: 'Abseits', description: 'Die Abseitsregel wird durch den jeweils letzten Abwehrspieler ("letzter Mann") angezeigt und entschieden.' },
    { rule: 'Wechsel', description: 'Es darf unbegrenzt und fliegend gewechselt werden. Bereits ausgewechselte Spieler dürfen wieder eingewechselt werden.' },
    { rule: 'Rückpass', description: 'Es gibt keine Rückpassregel. Ein Rückpass darf vom Torhüter aufgenommen werden.' }
];

const RuleSection = ({ title, type, rulesList, editState, loading, currentTheme, isMobile, onAdd, onEdit, onSave, onCancel, onDelete, onUpdateField, onFocusField }) => {
    const desktopView = (
        <TableContainer component={Paper} sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Regel</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Beschreibung</TableCell>
                        <TableCell sx={{ width: '100px' }} align="right">Aktionen</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rulesList.map((item, index) => {
                        const isEditing = editState && editState.type === type && editState.index === index;
                        const displayData = isEditing ? editState.data : item;

                        return (
                            <TableRow key={`${type}-${index}`} sx={{ height: '60px' }}>
                                <TableCell sx={{ verticalAlign: 'top', pt: 2 }}>
                                    {isEditing ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            variant="standard"
                                            value={displayData.rule}
                                            onFocus={(e) => onFocusField('rule', e.target)}
                                            onChange={(e) => onUpdateField('rule', e.target.value)}
                                            sx={{ '& .MuiInputBase-input': { fontFamily: 'comfortaa' } }}
                                        />
                                    ) : (
                                        <Typography sx={{ fontFamily: 'comfortaa', fontSize: '0.9rem', fontWeight: 600 }}>{item.rule}</Typography>
                                    )}
                                </TableCell>
                                <TableCell sx={{ verticalAlign: 'top', pt: 2 }}>
                                    {isEditing ? (
                                        <TextField
                                            fullWidth
                                            multiline
                                            size="small"
                                            variant="standard"
                                            value={displayData.description}
                                            onFocus={(e) => onFocusField('description', e.target)}
                                            onChange={(e) => onUpdateField('description', e.target.value)}
                                            sx={{ '& .MuiInputBase-input': { fontFamily: 'comfortaa' } }}
                                        />
                                    ) : (
                                        <Typography sx={{ fontFamily: 'comfortaa', fontSize: '0.85rem', color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                                            {item.description}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                        {isEditing ? (
                                            <>
                                                <Tooltip title="Speichern">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => onSave(type, index)}
                                                            disabled={loading}
                                                        >
                                                            <CheckIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Abbrechen">
                                                    <IconButton size="small" onClick={onCancel}>
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <>
                                                <Tooltip title="Bearbeiten">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => onEdit(type, index, item)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Löschen">
                                                    <IconButton size="small" color="error" onClick={() => onDelete(type, index)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const mobileView = (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rulesList.map((item, index) => {
                const isEditing = editState && editState.type === type && editState.index === index;
                const displayData = isEditing ? editState.data : item;

                return (
                    <Paper key={`${type}-${index}`} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', background: 'rgba(255,255,255,0.02)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flexGrow: 1 }}>
                                {isEditing ? (
                                    <TextField
                                        fullWidth
                                        label="Regel"
                                        size="small"
                                        variant="outlined"
                                        value={displayData.rule}
                                        onFocus={(e) => onFocusField('rule', e.target)}
                                        onChange={(e) => onUpdateField('rule', e.target.value)}
                                        sx={{ mb: 2, '& .MuiInputBase-input': { fontFamily: 'comfortaa' } }}
                                    />
                                ) : (
                                    <Typography sx={{ fontFamily: 'comfortaa', fontSize: '0.9rem', fontWeight: 600, color: currentTheme.palette.primary.main }}>
                                        {item.rule}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', ml: 1 }}>
                                {isEditing ? (
                                    <>
                                        <IconButton size="small" color="success" onClick={() => onSave(type, index)} disabled={loading}>
                                            <CheckIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={onCancel}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </>
                                ) : (
                                    <>
                                        <IconButton size="small" color="primary" onClick={() => onEdit(type, index, item)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => onDelete(type, index)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </>
                                )}
                            </Box>
                        </Box>
                        <Box>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    multiline
                                    label="Beschreibung"
                                    size="small"
                                    variant="outlined"
                                    value={displayData.description}
                                    onFocus={(e) => onFocusField('description', e.target)}
                                    onChange={(e) => onUpdateField('description', e.target.value)}
                                    sx={{ '& .MuiInputBase-input': { fontFamily: 'comfortaa' } }}
                                />
                            ) : (
                                <Typography sx={{ fontFamily: 'comfortaa', fontSize: '0.85rem', color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                                    {item.description}
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                );
            })}
        </Box>
    );

    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontFamily: 'comfortaa', color: currentTheme.palette.text.primary, fontSize: isMobile ? '1rem' : '1.25rem' }}>
                    {title}
                </Typography>
                <Button
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={() => onAdd(type)}
                    sx={{ color: currentTheme.palette.primary.main, fontFamily: 'comfortaa', textTransform: 'none' }}
                >
                    Hinzufügen
                </Button>
            </Box>
            {isMobile ? mobileView : desktopView}
        </Box>
    );
};

const RulesManagement = () => {
    const currentTheme = useTheme();
    const isMobile = useMediaQuery(currentTheme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, index: null });

    const [rules, setRules] = useState({
        leagueRules: [],
        gameRules: []
    });

    const [editState, setEditState] = useState(null); // { type, index, data: { rule, description } }
    const lastFocusedInputRef = useRef(null); // { field: 'rule' | 'description', ref: DOMElement }

    const placeholders = [
        { code: '{{name}}', label: 'Saisonname' },
        { code: '{{startDate}}', label: 'Startdatum' },
        { code: '{{endDate}}', label: 'Enddatum' },
        { code: '{{playModeDescription}}', label: 'Spielmodus (Text)' },
        { code: '{{pointsForWin}}', label: 'Punkte Sieg' },
        { code: '{{pointsForDraw}}', label: 'Punkte Remis' },
        { code: '{{pointsForLoss}}', label: 'Punkte Niederlage' },
        { code: '{{rankingCriteria}}', label: 'Platzierungskriterien' },
        { code: '{{requestExpiryDays}}', label: 'Anfrage-Ablauf' },
        { code: '{{friendlyGamesReleaseHours}}', label: 'Freundschafts-Freigabe' }
    ];



    useEffect(() => {
        const loadRules = async () => {
            setLoading(true);
            try {
                const data = await websiteApi.getSettings('rules').catch(() => null);
                if (data && (data.leagueRules || data.gameRules)) {
                    setRules({
                        leagueRules: data.leagueRules || [],
                        gameRules: data.gameRules || []
                    });
                } else {
                    setRules({
                        leagueRules: defaultLeagueRules,
                        gameRules: defaultGameRules
                    });
                }
            } catch (err) {
                setError('Fehler beim Laden der Regeln.');
            } finally {
                setLoading(false);
            }
        };
        loadRules();
    }, []);

    const handleSaveRow = async (type, index) => {
        if (!editState || editState.index !== index || editState.type !== type) return;

        const updatedRulesList = [...rules[type]];
        updatedRulesList[index] = { ...editState.data };

        const updatedAllRules = { ...rules, [type]: updatedRulesList };

        setLoading(true);
        setError(null);
        try {
            await websiteApi.updateSettings('rules', updatedAllRules);
            setRules(updatedAllRules);
            setEditState(null);
            setSuccess('Regel erfolgreich gespeichert!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Fehler beim Speichern der Regel: ' + (err.message || 'Serverfehler'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRow = async (type, index) => {
        setDeleteConfirm({ open: true, type, index });
    };

    const confirmDeleteRow = async () => {
        const { type, index } = deleteConfirm;
        setDeleteConfirm({ open: false, type: null, index: null });

        const updatedRulesList = rules[type].filter((_, i) => i !== index);
        const updatedAllRules = { ...rules, [type]: updatedRulesList };

        setLoading(true);
        setError(null);
        try {
            await websiteApi.updateSettings('rules', updatedAllRules);
            setRules(updatedAllRules);
            setSuccess('Regel gelöscht.');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Fehler beim Löschen der Regel.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = (type) => {
        const newRule = { rule: 'Neu', description: '' };
        const newList = [...rules[type], newRule];
        setRules(prev => ({ ...prev, [type]: newList }));
        setEditState({ type, index: rules[type].length, data: newRule });
    };

    const handlePlaceholderClick = (code) => {
        if (!editState) return;

        if (!lastFocusedInputRef.current) {
            setError('Bitte klicke zuerst in das Textfeld, in das du den Platzhalter einfügen möchtest.');
            setTimeout(() => setError(null), 4000);
            return;
        }

        const inputDom = lastFocusedInputRef.current.ref;
        const field = lastFocusedInputRef.current.field;
        const start = inputDom.selectionStart || 0;
        const end = inputDom.selectionEnd || 0;
        const text = editState.data[field];

        const newText = text.substring(0, start) + code + text.substring(end);

        setEditState(prev => ({
            ...prev,
            data: { ...prev.data, [field]: newText }
        }));

        // Reset focus after state update
        setTimeout(() => {
            inputDom.focus();
            const newPos = start + code.length;
            inputDom.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleUpdateField = (field, value) => {
        setEditState(prev => ({
            ...prev,
            data: { ...prev.data, [field]: value }
        }));
    };

    const handleFocusField = (field, domRef) => {
        lastFocusedInputRef.current = { field, ref: domRef };
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(0, 169, 157, 0.05)', borderRadius: 2, border: '1px solid', borderColor: 'rgba(0, 169, 157, 0.2)' }}>
                <Typography variant="subtitle2" sx={{ fontFamily: 'comfortaa', color: currentTheme.palette.primary.main, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                    <InfoIcon fontSize="small" /> Platzhalter (Klick zum Einfügen):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {placeholders.map((p) => (
                        <Tooltip key={p.code} title={p.code}>
                            <Chip
                                label={p.label}
                                size="small"
                                onClick={() => handlePlaceholderClick(p.code)}
                                disabled={!editState}
                                sx={{
                                    fontFamily: 'comfortaa',
                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'secondary.main', color: 'white' }
                                }}
                            />
                        </Tooltip>
                    ))}
                </Box>
            </Box>

            <RuleSection
                title="Ligaregeln"
                type="leagueRules"
                rulesList={rules.leagueRules}
                editState={editState}
                loading={loading}
                currentTheme={currentTheme}
                isMobile={isMobile}
                onAdd={handleAddRule}
                onEdit={(type, index, item) => setEditState({ type, index, data: { ...item } })}
                onSave={handleSaveRow}
                onCancel={() => { setEditState(null); lastFocusedInputRef.current = null; }}
                onDelete={handleDeleteRow}
                onUpdateField={handleUpdateField}
                onFocusField={handleFocusField}
            />

            <RuleSection
                title="Spielregeln"
                type="gameRules"
                rulesList={rules.gameRules}
                editState={editState}
                loading={loading}
                currentTheme={currentTheme}
                isMobile={isMobile}
                onAdd={handleAddRule}
                onEdit={(type, index, item) => setEditState({ type, index, data: { ...item } })}
                onSave={handleSaveRow}
                onCancel={() => { setEditState(null); lastFocusedInputRef.current = null; }}
                onDelete={handleDeleteRow}
                onUpdateField={handleUpdateField}
                onFocusField={handleFocusField}
            />

            <AppModal
                open={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, type: null, index: null })}
                title="Regel löschen"
                actions={
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, width: '100%' }}>
                        <Button onClick={() => setDeleteConfirm({ open: false, type: null, index: null })} sx={{ color: currentTheme.palette.text.secondary }}>
                            Abbrechen
                        </Button>
                        <Button variant="contained" color="error" onClick={confirmDeleteRow}>
                            Löschen
                        </Button>
                    </Box>
                }
            >
                <Typography sx={{ mb: 3 }}>
                    Möchtest du diese Regel wirklich unwiderruflich löschen?
                </Typography>
            </AppModal>
        </Box>
    );
};

export default RulesManagement;
