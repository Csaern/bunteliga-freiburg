import React from 'react';
import LeagueTable from '../components/HistoryLeagueTable';
// import HallOfFame from '../components/HallOfFame';
// import RecordsList from '../components/RecordsList';
// import SeasonChampionsList from '../components/SeasonChampionsList';

const HistoryPage = () => {
  return (
    <div>
      {/* <RecordsList/> */}
      {/* <SeasonChampionsList title="Platzierungen" /> */}
      {/* <HallOfFame title="Rekordsieger" /> */}
      <LeagueTable title="Ewige Tabelle" />
    </div>
  );
};

export default HistoryPage;