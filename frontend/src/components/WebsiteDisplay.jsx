// src/components/WebsiteDisplay.js
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import createDOMPurify from 'dompurify'; // Updated import
import PropTypes from 'prop-types';
import LoadingSpinner from './common/LoadingSpinner';

// Initialize DOMPurify
const DOMPurify = createDOMPurify(window);

const ErrorMessage = ({ message }) => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="bg-red-50 p-6 rounded-lg shadow-sm">
      <h2 className="text-red-600 font-semibold mb-2">Error</h2>
      <p className="text-red-500">{message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  </div>
);

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired
};

function WebsiteDisplay() {
  const { websiteId } = useParams();
  const navigate = useNavigate();
  const [websiteHtml, setWebsiteHtml] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchWebsite = async () => {
      try {
        if (!websiteId) {
          throw new Error('Website ID is required');
        }

        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/website/${websiteId}`,
          { 
            withCredentials: true,
            signal: controller.signal,
            timeout: 5000 // 5 second timeout
          }
        );
        
        if (!response.data) {
          throw new Error('No website data found');
        }
        
        if (isMounted) {
          setWebsiteHtml(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          if (axios.isCancel(err)) {
            console.log('Request cancelled');
            return;
          }
          
          setError(err.response?.data?.message || err.message);
          console.error('Error fetching website:', err);

          // Retry logic
          if (retryCount < 3) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              fetchWebsite();
            }, 1000 * (retryCount + 1)); // Exponential backoff
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (websiteId) {
      fetchWebsite();
    } else {
      navigate('/');
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [websiteId, navigate, retryCount]);

  const handleLogout = async () => {
      try {
          await axios.get(`${import.meta.env.VITE_BACKEND_URL}/auth/logout`, {
              withCredentials: true
          });
          navigate('/'); // Redirect to home page after logout
      } catch (error) {
          console.error('Logout error:', error);
          alert('Logout failed. Please try again.'); // Basic error alert
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
            to="/dashboard"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <nav className="w-full bg-white shadow-sm fixed top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16">
        <div 
          className="w-full"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(websiteHtml) }}
        />
      </main>
    </div>
  );
}

export default WebsiteDisplay;