import { useEffect, useState, useCallback } from 'react';
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

  const showNotification = useCallback((message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchWebsites = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/user/websites`,
          { 
            withCredentials: true,
            timeout: 5000,
            signal: controller.signal
          }
        );

        if (response.data) {
          setWebsites(response.data);
        }
      } catch (err) {
        if (axios.isCancel(err)) {
          console.log('Request cancelled');
          return;
        }

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

    return () => {
      controller.abort();
    };
  }, [navigate]);

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
      showNotification('Website name cannot be empty', 'error');
      return;
    }

    setRenamingStatus({ loading: true, error: null });

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/user/websites/${websiteId}`,
        { websiteName: newWebsiteName.trim() },
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

  const handleCancelRename = useCallback(() => {
    setRenameWebsiteId(null);
    setNewWebsiteName('');
    setRenamingStatus({ loading: false, error: null });
  }, []);

  const startRename = useCallback((websiteId, currentName) => {
    setRenameWebsiteId(websiteId);
    setNewWebsiteName(currentName);
  }, []);

  if (loading) return <LoadingSpinner />;

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
      <div className="max-w-6xl mx-auto px-4">
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
        
        {(deleteStatus.error || deleteStatus.success) && (
          <div className={`mb-4 p-4 rounded-lg ${
            deleteStatus.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}>
            <p className={deleteStatus.error ? 'text-red-600' : 'text-green-600'}>
              {deleteStatus.error || deleteStatus.success}
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((website) => (
              <div 
                key={website.websiteId}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="relative pb-[56.25%] bg-gray-50">
                  {website.thumbnail ? (
                    <img
                      src={website.thumbnail}
                      alt={website.websiteName || 'Website preview'}
                      className="absolute top-0 left-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.appendChild(
                          document.createElement('div')
                        ).outerHTML = PlaceholderThumbnail();
                      }}
                    />
                  ) : (
                    <div className="absolute top-0 left-0 w-full h-full">
                      <PlaceholderThumbnail />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {renameWebsiteId === website.websiteId ? (
                    <div className="mb-4">
                      <input
                        type="text"
                        value={newWebsiteName}
                        onChange={(e) => setNewWebsiteName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Enter new name"
                        disabled={renamingStatus.loading}
                      />
                      {renamingStatus.error && (
                        <p className="text-red-500 text-sm mt-1">{renamingStatus.error}</p>
                      )}
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => handleRenameWebsite(website.websiteId)}
                          disabled={renamingStatus.loading}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          {renamingStatus.loading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelRename}
                          disabled={renamingStatus.loading}
                          className="text-gray-600 px-3 py-1 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {website.websiteName || `Website ${website.websiteId.slice(0, 8)}`}
                      </h3>
                      <button
                        onClick={() => startRename(website.websiteId, website.websiteName)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mb-4">
                    Created: {new Date(website.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex justify-between items-center">
                    <Link
                      to={`/website/${website.websiteId}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      View Website
                    </Link>
                    <button
                      onClick={() => handleDeleteWebsite(website.websiteId)}
                      disabled={deletingWebsites.has(website.websiteId)}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingWebsites.has(website.websiteId) ? 'Deleting...' : 'Delete'}
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

UserWebsites.defaultProps = {
  hideGenerateButton: false
};

export default UserWebsites;