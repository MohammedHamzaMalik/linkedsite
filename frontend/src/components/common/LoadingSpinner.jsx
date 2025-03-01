import PropTypes from 'prop-types';

const LoadingSpinner = ({ size = 12, color = 'blue-600' }) => (
  <div className="flex justify-center items-center min-h-screen">
    <div 
      className={`animate-spin rounded-full h-${size} w-${size} border-b-2 border-${color}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

LoadingSpinner.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string
};

export default LoadingSpinner;