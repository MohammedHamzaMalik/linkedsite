// Required dependencies
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const session = require('express-session');
require('dotenv').config(); // For loading environment variables
// Import any additional dependencies
const cors = require('cors');
const { URL } = require('url');

const debug = (message, data) => {
    console.log(`DEBUG: ${message}`, data || '');
};

// Configuration
const config = {
    linkedinAuth: {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: 'http://localhost:3000/auth/linkedin/callback',
        scope: 'openid profile email' // String format instead of array
    }
};

// Initialize Express app
const app = express();

// Configure session middleware
app.use(session({
    secret: crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: true
}));

// Generate random state parameter for CSRF protection
function generateState() {
    return crypto.randomBytes(16).toString('hex');
}

// Enable CORS for your React frontend
const corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true
  };
app.use(cors(corsOptions));

// Route to /auth/linkedin
app.get('/auth/linkedin', (req, res) => {
    const state = generateState();
    req.session.state = state;
    debug('Session state set to', state);

    const authorizationUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authorizationUrl.searchParams.append('response_type', 'code');
    authorizationUrl.searchParams.append('client_id', config.linkedinAuth.clientId);
    authorizationUrl.searchParams.append('redirect_uri', config.linkedinAuth.redirectUri);
    authorizationUrl.searchParams.append('state', state);
    authorizationUrl.searchParams.append('scope', config.linkedinAuth.scope); // Use as is, not joined
    
    console.log('Redirecting to:', authorizationUrl.toString());
    debug('Authorization URL', authorizationUrl.toString());
    res.redirect(authorizationUrl.toString());
});

// Root route
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>LinkedIn OAuth Test</title></head>
            <body>
                <h1>LinkedIn OAuth Test</h1>
                <p>Click the button below to test the OAuth flow:</p>
                <a href="/auth/linkedin" style="display: inline-block; padding: 10px 20px; background-color: #0077B5; color: white; text-decoration: none; border-radius: 4px;">
                    Login with LinkedIn
                </a>
            </body>
        </html>
    `);  });


const querystring = require('querystring');

// Handle LinkedIn OAuth callback
app.get('/auth/linkedin/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        // Verify state parameter to prevent CSRF attacks
        if (state !== req.session.state) {
            return res.status(400).send('Invalid state parameter');
        }

        // Exchange authorization code for access token
        const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', querystring.stringify({
            // params: {
                grant_type: 'authorization_code',
                code: req.query.code,
                redirect_uri: config.linkedinAuth.redirectUri,
                client_id: config.linkedinAuth.clientId,
                client_secret: config.linkedinAuth.clientSecret
            // }
        }));

        const accessToken = tokenResponse.data.access_token;

        // Store access token securely in session
        req.session.linkedinAccessToken = accessToken;

        // Fetch user profile data
        const profileData = await fetchLinkedInProfile(accessToken);
        // const emailData = await fetchLinkedInEmail(accessToken);

        // Generate website HTML based on LinkedIn data
        const websiteHtml = generatePersonalWebsite(profileData);

        // Redirect to frontend with the website HTML as a query parameter
        const frontendUrl = process.env.FRONTEND_URL;
        const redirectUrl = new URL(`${frontendUrl}/website`);
        redirectUrl.searchParams.append('websiteHtml', encodeURIComponent(websiteHtml));
        
        return res.redirect(redirectUrl.toString());

        // Store user data or create/update user in your database
        // ...

        // res.json({
        //     profile: profileData,
        //     // email: emailData
        // });

    } catch (error) {
        console.error('LinkedIn OAuth Error:', error);
        res.status(500).send('Authentication failed');
    }
});

// Function to generate the personal website HTML
function generatePersonalWebsite(profileData) {
    try {
      // userinfo returns: sub, name, given_name, family_name, picture, email, etc.
      const firstName = profileData.given_name || '';
      const lastName = profileData.family_name || '';
      // The user’s full name might be in `profileData.name`
      const fullName = profileData.name || `${firstName} ${lastName}`;
  
      // userinfo doesn’t provide “headline”, so we might leave it blank
      const headline = '';
  
      // The user’s picture is under `picture` in userinfo
      const profilePicture = profileData.picture || '';
  
      // userinfo includes “email” if you requested the `email` scope
      const email = profileData.email || '';
  
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${fullName} - Personal Website</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
          </style>
        </head>
        <body class="bg-gray-50">
          <header class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <div class="max-w-4xl mx-auto px-4 py-16 flex flex-col md:flex-row items-center">
              ${
                profilePicture
                  ? `<div class="mb-6 md:mb-0 md:mr-8">
                      <img src="${profilePicture}" alt="${fullName}" 
                           class="rounded-full h-32 w-32 object-cover border-4 border-white shadow-lg">
                     </div>`
                  : ''
              }
              <div class="text-center md:text-left">
                <h1 class="text-4xl font-bold">${fullName}</h1>
                ${
                  headline
                    ? `<p class="mt-2 text-xl text-blue-100">${headline}</p>`
                    : ''
                }
              </div>
            </div>
          </header>
          
          <nav class="bg-white shadow-md">
            <div class="max-w-4xl mx-auto px-4">
              <div class="flex justify-center space-x-8">
                <a href="#about" class="px-3 py-4 text-sm font-medium text-gray-700 hover:text-blue-600">About</a>
                <a href="#experience" class="px-3 py-4 text-sm font-medium text-gray-700 hover:text-blue-600">Experience</a>
                <a href="#education" class="px-3 py-4 text-sm font-medium text-gray-700 hover:text-blue-600">Education</a>
                <a href="#skills" class="px-3 py-4 text-sm font-medium text-gray-700 hover:text-blue-600">Skills</a>
                <a href="#contact" class="px-3 py-4 text-sm font-medium text-gray-700 hover:text-blue-600">Contact</a>
              </div>
            </div>
          </nav>
          
          <main class="max-w-4xl mx-auto px-4 py-8">
            <section id="about" class="mb-12">
              <h2 class="text-2xl font-bold text-gray-800 mb-4">About Me</h2>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-600">
                  ${
                    headline ||
                    'Professional based on LinkedIn profile information. Connect with me to learn more about my work and expertise.'
                  }
                </p>
              </div>
            </section>
            
            <section id="contact">
              <h2 class="text-2xl font-bold text-gray-800 mb-4">Contact</h2>
              <div class="bg-white rounded-lg shadow-md p-6">
                ${
                  email
                    ? `<p class="text-gray-600 mb-2"><strong>Email:</strong> ${email}</p>`
                    : ''
                }
                <p class="text-gray-600">
                  Additional contact information would be displayed here.
                </p>
              </div>
            </section>
          </main>
          
          <footer class="bg-gray-800 text-white py-8 text-center">
            <p>&copy; ${new Date().getFullYear()} ${fullName}. All rights reserved.</p>
            <p class="mt-2 text-gray-400 text-sm">Generated using LinkedIn profile data.</p>
          </footer>
        </body>
        </html>
      `;
    } catch (error) {
      console.error('Error generating website HTML:', error);
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Website Generation Error</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 flex items-center justify-center min-h-screen">
          <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <h1 class="text-2xl font-bold text-red-600 mb-4">Error Generating Website</h1>
            <p class="text-gray-600 mb-6">There was a problem generating your website from LinkedIn data.</p>
            <p class="text-gray-500 text-sm">Please try again later or contact support if the issue persists.</p>
          </div>
        </body>
        </html>
      `;
    }
  }
  


// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).send('Something broke!');
  });

// Function to fetch LinkedIn profile data
async function fetchLinkedInProfile(accessToken) {
    const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cache-control': 'no-cache',
            'X-Restli-Protocol-Version': '2.0.0'
        }
    });
    console.log('LinkedIn Profile Data:', response.data);
    return response.data;
}

// Function to fetch LinkedIn email address
// async function fetchLinkedInEmail(accessToken) {
//     const response = await axios.get('https://api.linkedin.com/v2/emailAddress', {
//         headers: {
//             'Authorization': `Bearer ${accessToken}`,
//             'cache-control': 'no-cache',
//             'X-Restli-Protocol-Version': '2.0.0'
//         },
//         params: {
//             'q': 'members',
//             'projection': '(elements*(handle~))'
//         }
//     });
//     return response.data;
// }

// Secure token storage in database (example using MongoDB)
const mongoose = require('mongoose');

// MongoDB connection string - ideally stored in an environment variable
const MONGODB_URI = process.env.MONGODB_URI

// Connection options
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // If you need other options, you can add them here
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI, options)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    console.log(`Database: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    // You might want to exit the process in case of connection failure
    process.exit(1);
  });

// Optional: Handle connection events
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Mongoose disconnected through app termination');
    process.exit(0);
  });


const TokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    accessToken: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}, { 
    timestamps: true 
});

function encryptToken(token) {
    // **THIS IS NOT SECURE FOR PRODUCTION - JUST FOR LOCAL TESTING**
    return Buffer.from(token).toString('base64');
}

function decryptToken(encryptedToken) {
    // **THIS IS NOT SECURE FOR PRODUCTION - JUST FOR LOCAL TESTING**
    return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}

// Encrypt tokens before saving
TokenSchema.pre('save', function(next) {
    if (this.isModified('accessToken')) {
        // Use your preferred encryption method
        this.accessToken = encryptToken(this.accessToken);
    }
    next();
});

const Token = mongoose.model('Token', TokenSchema);

module.exports = { Token };

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

