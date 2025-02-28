// src/components/WebsiteDisplay.js
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function WebsiteDisplay() {
  const { websiteId } = useParams();
  const [websiteHtml, setWebsiteHtml] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebsite = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/website/${websiteId}`,
          { withCredentials: true }
        );
        setWebsiteHtml(response.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching website:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebsite();
  }, [websiteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 p-4 rounded-lg">
          <h2 className="text-red-600 font-semibold">Error Loading Website</h2>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: websiteHtml }} />
  );
}

export default WebsiteDisplay;