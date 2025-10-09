import React from 'react';
import { TableCell, useTheme, useMediaQuery } from '@mui/material';

// Konsistente Tabellenzelle, die Responsivität unterstützt
export const StyledTableCell = ({ children, sx, align, hideOnMobile, ...props }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (isMobile && hideOnMobile) {
        return null;
    }

    return (
        <TableCell
            align={align}
            sx={{
                color: theme.palette.grey[300],
                fontFamily: 'comfortaa',
                borderBottom: `1px solid ${theme.palette.grey[800]}`,
                py: isMobile ? 0.8 : 1.2,
                px: isMobile ? 0.5 : 1.5,
                fontSize: isMobile ? '0.7rem' : '0.85rem',
                ...sx,
            }}
            {...props}
        >
            {children}
        </TableCell>
    );
};

/**
 * Filtert ein Array von Objekten basierend auf einem Suchbegriff und konfigurierbaren Feldern.
 * @param {Array<Object>} data - Das zu filternde Datenarray.
 * @param {string} searchTerm - Der Suchbegriff.
 * @param {Array<{key: string, accessor?: (item: Object) => any}>} searchableFields - Konfiguration der durchsuchbaren Felder.
 * @returns {Array<Object>} Das gefilterte Array.
 */
export const filterData = (data, searchTerm, searchableFields) => {
    const searchTags = searchTerm.toLowerCase().split(' ').filter(Boolean);
    if (searchTags.length === 0) return data;

    return data.filter(item => {
        const searchableContent = searchableFields.map(field => {
            const value = field.accessor ? field.accessor(item) : item[field.key];
            if (Array.isArray(value)) {
                return value.join(' ');
            }
            return value;
        }).join(' ').toLowerCase();

        return searchTags.every(tag => searchableContent.includes(tag));
    });
};