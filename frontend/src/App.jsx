// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import WebsiteDisplay from './components/WebsiteDisplay';
import UserWebsites from './components/UserWebsites';
import LoadingSpinner from './components/common/LoadingSpinner';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/website/:websiteId" element={<WebsiteDisplay />} />
            <Route path="/my-websites" element={<UserWebsites />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ToastContainer position="bottom-right" />
    </>
  );
}

export default App;