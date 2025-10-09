export const formatGermanDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
};

export const formatDateForSearch = (dateString) => {
    try {
        const d = new Date(dateString);
        const year = d.getFullYear();
        const shortYear = year.toString().slice(-2);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const paddedMonth = month.toString().padStart(2, '0');
        const paddedDay = day.toString().padStart(2, '0');
        return [`${paddedDay}.${paddedMonth}.${year}`, `${paddedDay}.${paddedMonth}.${shortYear}`];
    } catch (e) {
        return [dateString];
    }
};