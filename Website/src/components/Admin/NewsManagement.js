import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
  const [newsDropdownOpen, setNewsDropdownOpen] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const sectionCardSx = {
    borderRadius: 4,
    border: '1px solid',
    borderColor: 'divider',
    background: 'background.paper',
    boxShadow: 'none',
    p: { xs: 2, sm: 3 },
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  };

  const loadNews = async () => {
    try {
      const newsArr = await newsApi.getAllNewsForAdmin().catch(() => []);
      setAllNews(newsArr);
    } catch (error) {
      console.error('Fehler beim Laden der News:', error);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handlePublish = async () => {
    if (!newsForm.title || !newsForm.content) {
      alert('Bitte füllen Sie Titel und Inhalt aus.');
      return;
    }
    setNewsLoading(true);
    try {
      if (selectedNewsId) {
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
      await loadNews();
      if (onDataChange) {
        onDataChange();
      }
      setNewsForm({ title: '', subtitle: '', content: '' });
      setSelectedNewsId('');
      alert('News erfolgreich veröffentlicht!');
    } catch (error) {
      console.error('Fehler beim Veröffentlichen der News:', error);
      alert('Fehler beim Veröffentlichen der News: ' + error.message);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!newsForm.title || !newsForm.content) {
      alert('Bitte füllen Sie Titel und Inhalt aus.');
      return;
    }
    setNewsLoading(true);
    try {
      await newsApi.updateNews(selectedNewsId, {
        ...newsForm,
        status: 'draft',
      });
      await loadNews();
      if (onDataChange) {
        onDataChange();
      }
      setNewsForm({ title: '', subtitle: '', content: '' });
      setSelectedNewsId('');
      alert('News erfolgreich bearbeitet!');
    } catch (error) {
      console.error('Fehler beim Bearbeiten der News:', error);
      alert('Fehler beim Bearbeiten der News: ' + error.message);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie diese News wirklich löschen?')) {
      return;
    }
    setNewsLoading(true);
    try {
      await newsApi.deleteNews(selectedNewsId);
      await loadNews();
      if (onDataChange) {
        onDataChange();
      }
      setNewsForm({ title: '', subtitle: '', content: '' });
      setSelectedNewsId('');
      alert('News erfolgreich gelöscht!');
    } catch (error) {
      console.error('Fehler beim Löschen der News:', error);
      alert('Fehler beim Löschen der News: ' + error.message);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleReset = () => {
    setNewsForm({ title: '', subtitle: '', content: '' });
    setSelectedNewsId('');
  };

  const handleNewsSelect = (newsId) => {
    setSelectedNewsId(newsId);
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
    <Paper sx={sectionCardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isExpanded ? 2 : 0 }}>
        <Typography variant="h5" sx={{ fontFamily: 'comfortaa', color: theme.palette.primary.main, fontWeight: 700 }}>
          News
        </Typography>
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{
            color: theme.palette.text.secondary,
            fontFamily: 'comfortaa',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(0, 169, 157, 0.1)',
            },
          }}
        >
          {isExpanded ? 'Ausblenden' : 'News verwalten'}
        </Button>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Previous News Dropdown */}
          {allNews.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Button
                onClick={() => setNewsDropdownOpen(!newsDropdownOpen)}
                endIcon={newsDropdownOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{
                  color: theme.palette.text.secondary,
                  fontFamily: 'comfortaa',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 169, 157, 0.1)',
                  },
                }}
              >
                Vorherige News ({allNews.length})
              </Button>
              <Collapse in={newsDropdownOpen}>
                <FormControl fullWidth sx={{ mt: 2 }}>
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
                  </Select>
                </FormControl>
              </Collapse>
            </Box>
          )}
        </Box>

        {/* News Form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Titel"
            value={newsForm.title}
            onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
            fullWidth
            sx={{
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
            sx={{
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
            sx={{
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

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={handleReset}
              sx={{
                borderColor: theme.palette.text.disabled,
                color: theme.palette.text.primary,
                fontFamily: 'comfortaa',
                textTransform: 'none',
                '&:hover': {
                  borderColor: theme.palette.text.secondary,
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              Neu
            </Button>
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={newsLoading}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                fontFamily: 'comfortaa',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              Veröffentlichen
            </Button>
            {selectedNewsId && (
              <>
                <Button
                  variant="outlined"
                  onClick={handleEdit}
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
              </>
            )}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default NewsManagement;

