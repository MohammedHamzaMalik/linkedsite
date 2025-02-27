// src/components/WebsiteDisplay.js
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function WebsiteDisplay() {
  const [websiteHtml, setWebsiteHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Extract websiteHtml from the URL query parameters
    const params = new URLSearchParams(location.search);
    const html = params.get('websiteHtml');

    if (html) {
      try {
        // URL decode the HTML string
        const decodedHtml = decodeURIComponent(html);
        setWebsiteHtml(decodedHtml);
        setLoading(false);
      } catch (err) {
        console.error('Error decoding HTML:', err);
        setError('Could not decode website HTML. Please try again.');
        setLoading(false);
      }
    } else {
      setError('No website HTML found. Please connect with LinkedIn first.');
      setLoading(false);
    }
  }, [location]);

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your website...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
        <div className="bg-red-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
        </div>
        <button
          onClick={handleBackToHome}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="website-container">
      {/* Use dangerouslySetInnerHTML to render the generated HTML */}
      <div dangerouslySetInnerHTML={{ __html: websiteHtml }} />
      
      <div className="fixed bottom-4 right-4">
        <button
          onClick={handleBackToHome}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Generate Another
        </button>
      </div>
    </div>
  );
}

export default WebsiteDisplay;