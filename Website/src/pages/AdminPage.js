// src/pages/AdminPage.js
import React from 'react';
import AdminBoard from '../components/AdminBoard';

const AdminPage = () => {
  return (
    <div>
      <main style={{ minHeight: '80vh', padding: '20px' }}>
        <AdminBoard />
      </main>
    </div>
  );
};

export default AdminPage;

