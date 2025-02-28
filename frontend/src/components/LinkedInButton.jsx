// frontend/src/components/LinkedInButton.jsx 
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

// Import both retina and non-retina images
import signInRetina2x from '../assets/linkedin-img-resources/Retina/Sign-In-Large---Default.png';
import signInNonRetina from '../assets/linkedin-img-resources/Non-Retina/Sign-in-Large---Default.png';

const LinkedInButton = ({ onClick, loading = false }) => {
  const [isRetina, setIsRetina] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Check if the device has a retina display
    setIsRetina(window.devicePixelRatio > 1);
  }, []);

  const handleImageError = () => {
    setImageError(true);
  };

  const buttonClasses = `
    w-full 
    flex 
    justify-center 
    items-center 
    space-x-2 
    py-2 
    px-4 
    border 
    rounded-md 
    shadow-sm 
    bg-white 
    hover:bg-gray-50 
    focus:outline-none 
    focus:ring-2 
    focus:ring-offset-2 
    focus:ring-blue-500 
    disabled:opacity-50 
    disabled:cursor-not-allowed
  `.replace(/\s+/g, ' ').trim();

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={buttonClasses}
      aria-label="Sign in with LinkedIn"
      type="button"
    >
      {loading ? (
        <div className="flex items-center space-x-2" role="status">
          <svg 
            className="animate-spin h-5 w-5 text-blue-600" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4" 
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
            />
          </svg>
          <span>Connecting...</span>
        </div>
      ) : imageError ? (
        <span className="text-blue-600 font-medium">Sign in with LinkedIn</span>
      ) : (
        <img
          src={isRetina ? signInRetina2x : signInNonRetina}
          alt="Sign in with LinkedIn"
          className="h-8"
          onError={handleImageError}
          loading="lazy"
          srcSet={`${signInNonRetina} 1x, ${signInRetina2x} 2x`}
        />
      )}
    </button>
  );
};

LinkedInButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

LinkedInButton.defaultProps = {
  loading: false
};

export default LinkedInButton;