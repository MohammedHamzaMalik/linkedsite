import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import LoadingSpinner from './common/LoadingSpinner';
import api from '../api/axios';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingWebsites, setDeletingWebsites] = useState(new Set());
  const [renameWebsiteId, setRenameWebsiteId] = useState(null);
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [renamingStatus, setRenamingStatus] = useState({ loading: false, error: null });
  const [deleteStatus, setDeleteStatus] = useState({ error: null, success: null });
  const [generating, setGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
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

  const fetchWebsites = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/websites');
      setWebsites(response.data);
    } catch (error) {
      console.error('Error fetching websites:', error);
      if (error.response?.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/';
      }
      setError('Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

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

  const handleGenerateWebsite = useCallback(async () => {
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
      } else {
        throw new Error('No website ID received');
      }
    } catch (err) {
      console.error('Error generating website:', err);
      const errorMessage = err.response?.data?.message || 'Failed to generate website';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setGenerating(false);
    }
  }, [navigate, showNotification]);

  const handlePublishToggle = async (websiteId, currentlyPublished) => {
    setPublishingId(websiteId);
    setError(null);

    try {
      const endpoint = currentlyPublished ? 'unpublish' : 'publish';
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/user/websites/${websiteId}/${endpoint}`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setWebsites(websites.map(website => 
          website.websiteId === websiteId 
            ? { ...website, published: !currentlyPublished }
            : website
        ));

        // Show success toast/notification
        showNotification(response.data.message);
        
        // If publishing, show the public URL
        if (!currentlyPublished && response.data.publicUrl) {
          showNotification(
            <div>
              Your website is now public at: 
              <a 
                href={response.data.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 ml-1"
              >
                View Site
              </a>
            </div>
          );
        }
      }
    } catch (err) {
      console.error('Publish toggle error:', err);
      setError(err.response?.data?.message || 'Failed to update website status');
      showNotification('Failed to update website status', 'error');
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
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
    <div className="flex flex-col min-h-screen w-full bg-gray-50">
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <button 
              onClick={handleGenerateWebsite}
              disabled={generating}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </span>
              ) : 'Generate Your First Website'}
            </button>
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
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => handlePublishToggle(website.websiteId, website.published)}
                      disabled={publishingId === website.websiteId}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                        ${website.published 
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {publishingId === website.websiteId ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        website.published ? 'Unpublish' : 'Publish'
                      )}
                    </button>

                    {website.published && (
                      <a
                        href={`${import.meta.env.VITE_BACKEND_URL}/website/${website.websiteId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Public Site
                      </a>
                    )}
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