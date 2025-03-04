import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import LoadingSpinner from './common/LoadingSpinner';

const PlaceholderThumbnail = () => (
  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
    <svg 
      className="w-12 h-12 text-gray-400" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="2" 
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" 
      />
    </svg>
  </div>
);

function UserWebsites({ hideGenerateButton = false }) {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingWebsites, setDeletingWebsites] = useState(new Set());
  const [renameWebsiteId, setRenameWebsiteId] = useState(null);
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [renamingStatus, setRenamingStatus] = useState({ loading: false, error: null });
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

  const handleRenameWebsite = async (websiteId) => {
    if (!newWebsiteName.trim()) {
      return;
    }

    setRenamingStatus({ loading: true, error: null });

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/user/websites/${websiteId}`,
        { newName: newWebsiteName },
        { withCredentials: true }
      );

      setWebsites(prevWebsites => 
        prevWebsites.map(website => 
          website.websiteId === websiteId 
            ? { ...website, websiteName: response.data.website.websiteName }
            : website
        )
      );

      showNotification('Website renamed successfully');
      handleCancelRename();

    } catch (err) {
      console.error('Error renaming website:', err);
      setRenamingStatus({
        loading: false,
        error: err.response?.data?.message || 'Failed to rename website'
      });
      showNotification(err.response?.data?.message || 'Failed to rename website', 'error');
    }
  };

  const handleCancelRename = () => {
    setRenameWebsiteId(null);
    setNewWebsiteName('');
    setRenamingStatus({ loading: false, error: null });
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
          {!hideGenerateButton && (
            <Link 
              to="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Dashboard
            </Link>
          )}
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
                    {renameWebsiteId === website.websiteId ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newWebsiteName}
                          onChange={(e) => setNewWebsiteName(e.target.value)}
                          placeholder="Enter new name"
                          className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={renamingStatus.loading}
                        />
                        <button
                          onClick={() => handleRenameWebsite(website.websiteId)}
                          disabled={renamingStatus.loading || !newWebsiteName.trim()}
                          className="text-green-600 hover:text-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-600 mb-2">
                          {website.websiteName || `Website ${website.websiteId}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(website.createdAt).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-4">
                    {renameWebsiteId !== website.websiteId && (
                      <button
                        onClick={() => {
                          setRenameWebsiteId(website.websiteId);
                          setNewWebsiteName(website.websiteName || '');
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Rename
                      </button>
                    )}
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

UserWebsites.propTypes = {
  hideGenerateButton: PropTypes.bool
};

export default UserWebsites;