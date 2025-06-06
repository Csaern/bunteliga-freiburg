import React from 'react';
import { Box, Container, Typography, Link, Divider } from '@mui/material';
import FixtureList from '../components/FixtureList';
import LeagueTable from '../components/LeagueTable';


const ResultsPage = () => {
  return (
    <div>
      <LeagueTable title="Liga-Tabelle" form={true}/>
      <FixtureList title="Alle Spiele" />
    </div>
  );
};

export default ResultsPage;