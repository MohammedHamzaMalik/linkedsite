// server.js
// 1. Required dependencies
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const session = require('express-session');
const cors = require('cors');
const { URL } = require('url');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const querystring = require('querystring');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 2. Debug helper
const debug = (message, data) => {
    console.log(`DEBUG: ${message}`, data || '');
};

// 3. Configuration
const config = {
    linkedinAuth: {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: 'http://localhost:3000/auth/linkedin/callback',
        scope: 'openid profile email'
    }
};

// 4. MongoDB Schema Definitions
const websiteSchema = new mongoose.Schema({
    websiteId: {
        type: String,
        required: true,
        unique: true
    },
    htmlContent: {
        type: String,
        required: true
    },
    linkedinProfileId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 7
    }
});

const userSchema = new mongoose.Schema({ // created User Schema
  userId: { // userId will be the LinkedIn Profile ID
      type: String,
      required: true,
      unique: true
  },
  name: { type: String }, // User's full name
  email: { type: String }, // User's email (optional, may not always be available)
  websites: [{ type: String, ref: 'Website' }], // Array of website IDs associated with the user
  createdAt: {
      type: Date,
      default: Date.now
  }
});

const TokenSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Changed from ObjectId to String
    accessToken: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}, { 
    timestamps: true 
});

// 5. Create Models
const Website = mongoose.model('Website', websiteSchema);
const Token = mongoose.model('Token', TokenSchema);
const User = mongoose.model('User', userSchema); // User Model

// 6. Database Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
});

// 7. Initialize Express app
const app = express();

// 8. Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
}));

// 9. Helper Functions
function generateState() {
    return crypto.randomBytes(16).toString('hex');
}

async function fetchLinkedInProfile(accessToken) {
    try {
        const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'cache-control': 'no-cache',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });

        if (!response.data || !response.data.sub) {
            throw new Error('Invalid LinkedIn profile data');
        }

        console.log('LinkedIn Profile Data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching LinkedIn profile:', error);
        throw error;
    }
}

async function storeWebsite(htmlContent, linkedinProfileId) {
    try {
        if (!htmlContent || !linkedinProfileId) {
            throw new Error('Missing required parameters for website storage');
        }

        const websiteId = uuidv4();
        const website = new Website({
            websiteId,
            htmlContent,
            linkedinProfileId: linkedinProfileId.toString()
        });
        
        await website.save();
        return websiteId;
    } catch (error) {
        console.error('Error storing website:', error);
        throw error;
    }
}

async function getWebsiteHtml(websiteId) {
    try {
        const website = await Website.findOne({ websiteId });
        return website ? website.htmlContent : null;
    } catch (error) {
        console.error('Error retrieving website:', error);
        throw error;
    }
}

// 10. Routes
app.get('/auth/linkedin', (req, res) => {
    const state = generateState();
    req.session.state = state;
    
    const authorizationUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authorizationUrl.searchParams.append('response_type', 'code');
    authorizationUrl.searchParams.append('client_id', config.linkedinAuth.clientId);
    authorizationUrl.searchParams.append('redirect_uri', config.linkedinAuth.redirectUri);
    authorizationUrl.searchParams.append('state', state);
    authorizationUrl.searchParams.append('scope', config.linkedinAuth.scope);
    
    debug('Authorization URL', authorizationUrl.toString());
    res.redirect(authorizationUrl.toString());
});

app.get('/auth/linkedin/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (state !== req.session.state) {
            return res.status(400).send('Invalid state parameter');
        }

        const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', 
            querystring.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: config.linkedinAuth.redirectUri,
                client_id: config.linkedinAuth.clientId,
                client_secret: config.linkedinAuth.clientSecret
            })
        );

        const accessToken = tokenResponse.data.access_token;
        req.session.linkedinAccessToken = accessToken;

        const profileData = await fetchLinkedInProfile(accessToken);
        
        if (!profileData.sub) {
            throw new Error('LinkedIn profile ID not found');
        }

        const linkedinProfileId = profileData.sub; // LinkedIn Profile ID as userId
        let user = await User.findOne({ userId: linkedinProfileId });

        if (!user) {
            // Create a new user if not found
            user = new User({
                userId: linkedinProfileId, // Use LinkedIn Profile ID as userId
                name: profileData.name,       // Use name from LinkedIn profile
                email: profileData.email      // Use email from LinkedIn profile (if available)
            });
            await user.save();
            console.log(`New user created: ${user.userId}`);
        } else {
            console.log(`User logged in: ${user.userId}`);
        }

        req.session.userId = user.userId; // Set session userId to LinkedIn Profile ID

        const websiteHtml = generatePersonalWebsite(profileData);
        const websiteId = await storeWebsite(websiteHtml, linkedinProfileId);

        // **Correction: Update User document to store websiteId**
        user.websites.push(websiteId); // Push the new websiteId to the websites array
        await user.save(); // Save the updated user document

        const frontendUrl = process.env.FRONTEND_URL;
        return res.redirect(`${frontendUrl}/website/${websiteId}`);

    } catch (error) {
        console.error('LinkedIn OAuth Error:', error);
        return res.status(500).send('Authentication failed: ' + error.message);
    }
});

app.get('/website/:websiteId', async (req, res) => {
    try {
        const htmlContent = await getWebsiteHtml(req.params.websiteId);
        if (!htmlContent) {
            return res.status(404).send('Website not found');
        }
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
    } catch (error) {
        res.status(500).send('Error retrieving website');
    }
});

// 11. Error Handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 12. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Keep your existing generatePersonalWebsite function as is

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

