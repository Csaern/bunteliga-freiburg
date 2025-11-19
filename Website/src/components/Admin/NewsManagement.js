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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import * as newsApi from '../../services/newsApiService';

const NewsManagement = ({ onDataChange }) => {
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
    borderColor: 'grey.800',
    background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.12) 0%, rgba(17, 17, 17, 0.92) 100%)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
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
        <Typography variant="h5" sx={{ fontFamily: 'comfortaa', color: '#00A99D', fontWeight: 700 }}>
          News
        </Typography>
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{
            color: 'grey.300',
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
                  color: 'grey.300',
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
                      color: 'grey.300',
                      fontFamily: 'comfortaa',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey.700',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey.600',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#00A99D',
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
              color: 'grey.300',
              fontFamily: 'comfortaa',
              '& fieldset': {
                borderColor: 'grey.700',
              },
              '&:hover fieldset': {
                borderColor: 'grey.600',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#00A99D',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'grey.500',
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
              color: 'grey.300',
              fontFamily: 'comfortaa',
              '& fieldset': {
                borderColor: 'grey.700',
              },
              '&:hover fieldset': {
                borderColor: 'grey.600',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#00A99D',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'grey.500',
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
              color: 'grey.300',
              fontFamily: 'comfortaa',
              '& fieldset': {
                borderColor: 'grey.700',
              },
              '&:hover fieldset': {
                borderColor: 'grey.600',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#00A99D',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'grey.500',
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
              borderColor: 'grey.600',
              color: 'grey.300',
              fontFamily: 'comfortaa',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'grey.500',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
              backgroundColor: '#00A99D',
              color: 'white',
              fontFamily: 'comfortaa',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#008B7F',
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
                  borderColor: '#FFBF00',
                  color: '#FFBF00',
                  fontFamily: 'comfortaa',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#FFBF00',
                    backgroundColor: 'rgba(255, 191, 0, 0.1)',
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

