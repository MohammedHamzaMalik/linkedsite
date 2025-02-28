import { useState } from 'react';
import LinkedInButton from './LinkedInButton';

function Home() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/linkedin`;
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-600 mb-8">Generate your personal website with LinkedIn</p>
        </div>
        <LinkedInButton onClick={handleLogin} loading={loading} />
      </div>
    </div>
  );
}

export default Home;