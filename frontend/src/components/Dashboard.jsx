import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import UserWebsites from './UserWebsites';

function Dashboard() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleGenerateWebsite = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/user/websites/generate`,
        {},
        { withCredentials: true }
      );

      if (response.data.websiteId) {
        navigate(`/website/${response.data.websiteId}`);
      }
    } catch (err) {
      console.error('Website generation error:', err);
      
      // Handle unauthorized error
      if (err.response?.status === 401) {
        navigate('/', { state: { message: 'Please login again' } });
        return;
      }
      
      setError(err.response?.data?.message || 'Failed to generate website');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAllWebsites = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all your websites? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/user/websites/all`,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Reload the page to show updated state
        window.location.reload();
      } else {
        throw new Error('Failed to delete websites');
      }

    } catch (err) {
      console.error('Delete all websites error:', err);
      
      if (err.response?.status === 401) {
        navigate('/', { 
          state: { message: 'Please login again' }
        });
        return;
      }
      
      setError(err.response?.data?.message || 'Failed to delete websites');
    } finally {
      setDeleting(false);
    }
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/auth/logout`,
        {},
        { 
          withCredentials: true,
          timeout: 5000
        }
      );
      
      // Clear any local storage/state
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Navigate to home
      navigate('/', { 
        replace: true,
        state: { message: 'Logged out successfully' } 
      });
    } catch (err) {
      console.error('Logout error:', err);
      
      // If server error, still clear client-side data
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Force navigate to home
      navigate('/', { 
        replace: true,
        state: { 
          message: 'Logged out with errors, please refresh the page' 
        } 
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50">
      <nav className="w-full bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                disabled={generating}
                className="ml-4 text-gray-600 hover:text-gray-900 
                           hover:bg-gray-100 rounded-md transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <button
            onClick={handleGenerateWebsite}
            disabled={generating || deleting}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {generating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              'Generate New Website'
            )}
          </button>

          <button
            onClick={handleDeleteAllWebsites}
            disabled={generating || deleting}
            className="w-full sm:w-auto bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {deleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete All Websites
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <UserWebsites hideGenerateButton={true} />
      </main>
    </div>
  );
}

export default Dashboard;