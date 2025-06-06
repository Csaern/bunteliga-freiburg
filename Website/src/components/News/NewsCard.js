import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Card, CardHeader, CardContent, CardActions, Collapse, IconButton, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const NewsCard = ({ title, subtitle, date, content }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Card 
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
        color: theme.palette.grey[300],
        border: `1px solid ${theme.palette.grey[800]}`,
        borderRadius: theme.shape.borderRadius,
        display: 'flex',
        flexDirection: 'column', 
        minHeight: '220px', 
        overflow: expanded ? 'visible' : 'hidden', 
      }}
    >
      <CardHeader
        title={
          <Typography
            variant="h6" 
            noWrap 
            sx={{
              fontFamily: 'comfortaa', 
              fontWeight: 700,
              m: 2,
              color: '#fff',
              fontSize: { 
                  xs: '1.1rem', 
                  sm: '1.25rem', 
              },
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
        }
        subheader={
          <Typography
            variant="body2"
            noWrap 
            sx={{
              fontFamily: 'comfortaa', 
              color: theme.palette.grey[500],
              fontSize: {
                  xs: '0.75rem',
                  sm: '0.875rem'
              },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {date}
          </Typography>
        }
        sx={{
            
            pb: 1, 
            '& .MuiCardHeader-content': {
                overflow: 'hidden', 
            }
        }}
      />
      <CardContent sx={{ 
        pt: 0, 
        flexGrow: 1,
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden', 
      }}>
        <Typography variant="body1" sx={{ 
            fontFamily: 'comfortaa',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
        }}>
          {subtitle}
        </Typography>
      </CardContent>
      <CardActions sx={{ pt:0, pb:1, px:2, mt: 'auto' }}>{ content &&
        <ExpandMore
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="mehr anzeigen"
            sx={{ 
                color: theme.palette.grey[400],
                marginLeft: 'auto',
            }}
          >
            <ExpandMoreIcon />
        </ExpandMore>
        }
      </CardActions>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ 
            borderTop: `1px solid ${theme.palette.grey[800]}`,
            maxHeight: '500px', 
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.grey[700],
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: theme.palette.grey[600],
              }
            },
        }}>
          <Typography paragraph sx={{ fontFamily: 'comfortaa', lineHeight: 1.7, color: theme.palette.grey[300], mb:0 }}>
            {content}
          </Typography>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default NewsCard;
