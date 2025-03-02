import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from './common/LoadingSpinner';

function UserWebsites() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        
        // Handle unauthorized error
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
                className="bg-white rounded-lg shadow-md p-6 flex justify-between items-center"
              >
                <div>
                  <p className="text-gray-600 mb-2">
                    Created: {new Date(website.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {website.websiteId}
                  </p>
                </div>
                <Link
                  to={`/website/${website.websiteId}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  View Website
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserWebsites;