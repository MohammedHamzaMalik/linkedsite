// frontend/src/components/Home.jsx
import { useState } from 'react';
import LinkedInButton from './LinkedInButton';

function Home() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50">
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              LinkedIn Portfolio Generator
            </h1>
            <p className="text-gray-600 mb-8">
              Create your professional portfolio website in seconds
            </p>
            <a
              href={`${import.meta.env.VITE_BACKEND_URL}/auth/linkedin`}
              className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with LinkedIn
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;