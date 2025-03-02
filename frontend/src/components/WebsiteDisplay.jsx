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

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div className="website-container">
      <nav className="bg-white shadow-md py-4 mb-8">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <Link 
            to="/my-websites"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            My Websites
          </Link>
        </div>
      </nav>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-end p-4">
              <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                  Logout
              </button>
          </div>
          <div 
            className="bg-white rounded-lg shadow-md p-6"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(websiteHtml)
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default WebsiteDisplay;