// frontend/src/components/Home.jsx
import { useState } from 'react';
import LinkedInButton from './LinkedInButton';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import Logo from './Logo';

function Home() {
  const [loading, setLoading] = useState(false);

  const handleLinkedInLogin = () => {
    setLoading(true);
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/linkedin`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 flex flex-col min-h-screen">
        {/* Logo section */}
        <div className="w-full flex justify-center mt-6 mb-2">
          <Logo className="h-8 w-8" />
        </div>

        {/* Main content */}
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              LinkedIn Portfolio Generator
            </h1>
            <p className="text-gray-700 text-lg mb-8">
              Create your professional portfolio website in seconds
            </p>
            <LinkedInButton 
              onClick={handleLinkedInLogin}
              loading={loading}
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/MohammedHamzaMalik/linkedsite"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#24292e] hover:text-[#000000]"
                title="View source code"
              >
                <FaGithub size={24} />
              </a>
              <a
                href="https://www.linkedin.com/company/linkedsite/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0077b5] hover:text-[#0a66c2]"
                title="Follow on LinkedIn"
              >
                <FaLinkedin size={24} />
              </a>
            </div>
            <p className="text-gray-900 text-center">
              Created by{" "}
              <a 
                href="https://www.linkedin.com/in/mohammed-hamza-malik/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-gray-900"
              >
                Mohammed Hamza Malik
              </a>{" "}
              with <span>❤️</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Home;