import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from './common/LoadingSpinner';

function UserWebsites() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingWebsites, setDeletingWebsites] = useState(new Set());
  const [deleteStatus, setDeleteStatus] = useState({ error: null, success: null });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/user/websites`,
          { 
            withCredentials: true,
            timeout: 5000
          }
        );

        if (response.data) {
          setWebsites(response.data);
        }
      } catch (err) {
        console.error('Error fetching websites:', err);
        
        if (err.response?.status === 401) {
          navigate('/', { 
            state: { message: 'Please login with LinkedIn first' }
          });
          return;
        }

        setError(err.response?.data?.message || 'Failed to fetch websites');
      } finally {
        setLoading(false);
      }
    };

    fetchWebsites();
  }, [navigate]);

  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const handleDeleteWebsite = async (websiteId) => {
    if (!window.confirm('Are you sure you want to delete this website?')) {
      return;
    }

    setDeletingWebsites(prev => new Set([...prev, websiteId]));
    setDeleteStatus({ error: null, success: null });

    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/user/websites/${websiteId}`,
        { withCredentials: true }
      );

      setWebsites(prevWebsites => 
        prevWebsites.filter(website => website.websiteId !== websiteId)
      );
      
      setDeleteStatus({ 
        error: null, 
        success: 'Website deleted successfully' 
      });
      showNotification('Website deleted successfully');

    } catch (err) {
      console.error('Error deleting website:', err);
      setDeleteStatus({ 
        error: err.response?.data?.message || 'Failed to delete website',
        success: null 
      });
      showNotification(
        err.response?.data?.message || 'Failed to delete website', 
        'error'
      );
    } finally {
      setDeletingWebsites(prev => {
        const next = new Set(prev);
        next.delete(websiteId);
        return next;
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <h2 className="text-red-600 text-xl font-semibold mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            to="/"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Websites</h1>
          <Link 
            to="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Generate New Website
          </Link>
        </div>
        
        {deleteStatus.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{deleteStatus.error}</p>
          </div>
        )}

        {deleteStatus.success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{deleteStatus.success}</p>
          </div>
        )}
        
        {websites.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 mb-4">
              You haven&apos;t generated any websites yet.
            </p>
            <Link 
              to="/"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Generate Your First Website
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {websites.map((website) => (
              <div 
                key={website.websiteId}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 mb-2">
                      Created: {new Date(website.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      ID: {website.websiteId}
                    </p>
                  </div>
                  <div className="flex space-x-4">
                    <Link
                      to={`/website/${website.websiteId}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      View Website
                    </Link>
                    <button
                      onClick={() => handleDeleteWebsite(website.websiteId)}
                      disabled={deletingWebsites.has(website.websiteId)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {deletingWebsites.has(website.websiteId) ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserWebsites;