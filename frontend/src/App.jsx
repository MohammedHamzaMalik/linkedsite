// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import Home from './components/Home';
import WebsiteDisplay from './components/WebsiteDisplay';
import UserWebsites from './components/UserWebsites';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/website/:websiteId" element={<WebsiteDisplay />} />
          <Route path="/my-websites" element={<UserWebsites />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;