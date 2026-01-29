import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  Alert
} from '@mui/material';
import AppModal from '../Modals/AppModal';
import * as newsApi from '../../services/newsApiService';

const NewsManagement = ({ onDataChange }) => {
  const theme = useTheme();
  const [allNews, setAllNews] = useState([]);
  const [selectedNewsId, setSelectedNewsId] = useState('');
  const [newsForm, setNewsForm] = useState({
    title: '',
    subtitle: '',
    content: '',
  });
  const [newsLoading, setNewsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isNew = selectedNewsId === 'new';
  const isReadOnly = !isNew && !isEditing;

  const loadNews = async (autoSelectLatest = false) => {
    try {
      const newsArr = await newsApi.getAllNewsForAdmin().catch(() => []);
      setAllNews(newsArr);
      if (autoSelectLatest) {
        if (newsArr.length > 0) {
          const latest = newsArr[0];
          setSelectedNewsId(latest.id);
          setIsEditing(false);
          setNewsForm({
            title: latest.title || '',
            subtitle: latest.subtitle || '',
            content: latest.content || '',
          });
        } else {
          handleNewsSelect('new');
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der News:', error);
    }
  };

  useEffect(() => {
    loadNews(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublish = async () => {
    if (!newsForm.title || !newsForm.subtitle) {
      setError('Bitte füllen Sie Titel und Untertitel aus.');
      return;
    }
    setNewsLoading(true);
    try {
      if (selectedNewsId && selectedNewsId !== 'new') {
        // Update existing news
        await newsApi.updateNews(selectedNewsId, {
          ...newsForm,
          status: 'published',
        });
      } else {
        // Create new news
        await newsApi.createNews({
          ...newsForm,
          status: 'published',
        });
      }
      await loadNews(true);
      if (onDataChange) {
        onDataChange();
      }
      setIsEditing(false);
      setSuccess('News erfolgreich veröffentlicht!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Fehler beim Veröffentlichen der News:', error);
      setError('Fehler beim Veröffentlichen der News: ' + error.message);
    } finally {
      setNewsLoading(false);
    }
  };


  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteConfirmOpen(false);
    setNewsLoading(true);
    try {
      await newsApi.deleteNews(selectedNewsId);
      await loadNews();
      if (onDataChange) {
        onDataChange();
      }
      setNewsForm({ title: '', subtitle: '', content: '' });
      setSelectedNewsId('');
      setSuccess('News erfolgreich gelöscht!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Fehler beim Löschen der News:', error);
      setError('Fehler beim Löschen der News: ' + error.message);
    } finally {
      setNewsLoading(false);
    }
  };


  const handleNewsSelect = (newsId) => {
    if (newsId === 'new') {
      setSelectedNewsId('new');
      setNewsForm({ title: '', subtitle: '', content: '' });
      setIsEditing(false);
      return;
    }
    setSelectedNewsId(newsId);
    setIsEditing(false);
    const selectedNews = allNews.find(n => n.id === newsId);
    if (selectedNews) {
      setNewsForm({
        title: selectedNews.title || '',
        subtitle: selectedNews.subtitle || '',
        content: selectedNews.content || '',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
        {/* News Selection Dropdown */}
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel sx={{ color: 'grey.400', fontFamily: 'comfortaa' }}>News auswählen</InputLabel>
          <Select
            value={selectedNewsId}
            onChange={(e) => handleNewsSelect(e.target.value)}
            label="News auswählen"
            sx={{
              color: theme.palette.text.primary,
              fontFamily: 'comfortaa',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.divider,
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.text.secondary,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            {allNews.map((news) => (
              <MenuItem key={news.id} value={news.id} sx={{ fontFamily: 'comfortaa' }}>
                {news.title} {news.status === 'published' ? '(Veröffentlicht)' : '(Entwurf)'}
              </MenuItem>
            ))}
            <MenuItem value="new" sx={{ fontFamily: 'comfortaa', color: theme.palette.primary.main, fontWeight: 'bold', borderTop: '1px solid', borderColor: 'divider', mt: 1 }}>
              + Neu erstellen...
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* News Form */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Titel"
          value={newsForm.title}
          onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
          fullWidth
          disabled={isReadOnly}
          sx={{
            opacity: isReadOnly ? 0.7 : 1,
            '& .MuiOutlinedInput-root': {
              color: theme.palette.text.primary,
              fontFamily: 'comfortaa',
              '& fieldset': {
                borderColor: theme.palette.divider,
              },
              '&:hover fieldset': {
                borderColor: theme.palette.text.secondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
            '& .MuiInputLabel-root': {
              color: theme.palette.text.secondary,
              fontFamily: 'comfortaa',
            },
          }}
        />
        <TextField
          label="Untertitel"
          value={newsForm.subtitle}
          onChange={(e) => setNewsForm({ ...newsForm, subtitle: e.target.value })}
          fullWidth
          disabled={isReadOnly}
          sx={{
            opacity: isReadOnly ? 0.7 : 1,
            '& .MuiOutlinedInput-root': {
              color: theme.palette.text.primary,
              fontFamily: 'comfortaa',
              '& fieldset': {
                borderColor: theme.palette.divider,
              },
              '&:hover fieldset': {
                borderColor: theme.palette.text.secondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
            '& .MuiInputLabel-root': {
              color: theme.palette.text.secondary,
              fontFamily: 'comfortaa',
            },
          }}
        />
        <TextField
          label="Inhalt"
          value={newsForm.content}
          onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
          fullWidth
          multiline
          rows={4}
          disabled={isReadOnly}
          sx={{
            opacity: isReadOnly ? 0.7 : 1,
            '& .MuiOutlinedInput-root': {
              color: theme.palette.text.primary,
              fontFamily: 'comfortaa',
              '& fieldset': {
                borderColor: theme.palette.divider,
              },
              '&:hover fieldset': {
                borderColor: theme.palette.text.secondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
            '& .MuiInputLabel-root': {
              color: theme.palette.text.secondary,
              fontFamily: 'comfortaa',
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {(selectedNewsId === 'new' || isEditing) && (
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={newsLoading}
              sx={{
                backgroundColor: theme.palette.secondary.main,
                color: theme.palette.secondary.contrastText,
                fontFamily: 'comfortaa',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: theme.palette.secondary.dark,
                },
              }}
            >
              Veröffentlichen
            </Button>
          )}

          {selectedNewsId && selectedNewsId !== 'new' && !isEditing && (
            <Button
              variant="outlined"
              onClick={() => setIsEditing(true)}
              disabled={newsLoading}
              sx={{
                borderColor: theme.palette.secondary.main,
                color: theme.palette.secondary.main,
                fontFamily: 'comfortaa',
                textTransform: 'none',
                '&:hover': {
                  borderColor: theme.palette.secondary.main,
                  backgroundColor: `${theme.palette.secondary.main}1A`,
                },
              }}
            >
              Bearbeiten
            </Button>
          )}

          {selectedNewsId && selectedNewsId !== 'new' && (
            <Button
              variant="outlined"
              onClick={handleDelete}
              disabled={newsLoading}
              sx={{
                borderColor: 'error.main',
                color: 'error.main',
                fontFamily: 'comfortaa',
                textTransform: 'none',
                '&:hover': {
                  borderColor: 'error.main',
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                },
              }}
            >
              Löschen
            </Button>
          )}
        </Box>
      </Box>
      <AppModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="News löschen"
        actions={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, width: '100%' }}>
            <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: theme.palette.text.secondary }}>
              Abbrechen
            </Button>
            <Button variant="contained" color="error" onClick={confirmDelete}>
              Löschen
            </Button>
          </Box>
        }
      >
        <Typography sx={{ mb: 3, color: theme.palette.text.primary }}>
          Möchten Sie diese News wirklich löschen?
        </Typography>
      </AppModal>
    </Box>
  );
};

export default NewsManagement;
