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
const nodeHtmlToImage = require('node-html-to-image');
const { generateAiEnhancedContent } = require('./utils/aiContentGenerator');
const authMiddleware = require('./middleware/auth');

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
  websiteName: {
    type: String,
    trim: true,
    maxLength: 100,
    required: true, // Make name required
    default: function() {
      return `My Website ${new Date().toLocaleDateString()}`; // Default name
    }
  },
  htmlContent: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String, // Store base64 encoded image
    default: null
  },
  linkedinProfileId: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  published: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Add compound index for unique names per user
websiteSchema.index({ linkedinProfileId: 1, websiteName: 1 }, { unique: true });

const userSchema = new mongoose.Schema({
  linkedinId: { // Changed from userId to linkedinId to match usage
    type: String,
    required: true,
    unique: true
  },
  name: { 
    type: String,
    required: true 
  },
  email: { 
    type: String 
  },
  websites: [{ 
    type: String, 
    ref: 'Website' 
  }],
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
    resave: true, // Changed to true
    saveUninitialized: true, // Changed to true
    name: 'sessionId', // Add explicit cookie name
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // Added sameSite policy
    },
    rolling: true // Refresh session on each request
}));

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
}));

// 1. Add body-parser middleware after other middleware configurations
const bodyParser = require('express').json();
app.use(bodyParser);

// Add after other middleware
app.use(express.static('public'));

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

async function storeWebsite(htmlContent, linkedinProfileId, thumbnail = null, websiteName) {
  try {
    const websiteId = uuidv4();
    const website = new Website({
      websiteId,
      htmlContent,
      linkedinProfileId,
      thumbnail,
      websiteName
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

// Modify the callback route to remove website generation
app.get('/auth/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (state !== req.session.state) {
      return res.status(400).send('Invalid state parameter');
    }

    // Get access token
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

    // Get user profile
    const profileData = await fetchLinkedInProfile(accessToken);
    
    if (!profileData || !profileData.sub) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    // Store important data in session
    req.session.linkedinAccessToken = accessToken;
    req.session.linkedinId = profileData.sub;
    req.session.userProfile = {
      name: profileData.name,
      email: profileData.email,
      picture: profileData.picture
    };

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        throw new Error('Failed to save session');
      }
      
      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/dashboard`);
    });

  } catch (error) {
    console.error('LinkedIn callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?error=auth_failed`);
  }
});

app.get('/website/:websiteId', async (req, res) => {
  try {
    const website = await Website.findOne({ websiteId: req.params.websiteId });

    if (!website) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Website not found'
      });
    }

    if (!website.published && !req.session.linkedinId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This website is not published'
      });
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(website.htmlContent);

  } catch (error) {
    console.error('Get website error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch website'
    });
  }
});

// New Logout Route
app.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).send('Logout failed');
      }
      res.status(200).json({ message: 'Logout successful' }); // Send JSON success response
  });
});

// Protected routes - Add authMiddleware
app.get('/user/websites', authMiddleware, async (req, res) => {
  try {
    const websites = await Website.find({ 
      linkedinProfileId: req.session.linkedinId 
    }).sort({ createdAt: -1 });

    res.json(websites);
  } catch (error) {
    console.error('Fetch websites error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch websites'
    });
  }
});

app.delete('/user/websites/all', authMiddleware, async (req, res) => {
  try {
    const result = await Website.deleteMany({ 
      linkedinProfileId: req.session.linkedinId 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No websites found'
      });
    }

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} websites`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all websites error:', error);
    res.status(500).json({
      error: 'Server error', 
      message: 'Failed to delete websites'
    });
  }
});

// Update the delete website route
app.delete('/user/websites/:websiteId', authMiddleware, async (req, res) => {
  try {
    // Use websiteId instead of _id
    const website = await Website.findOne({
      websiteId: req.params.websiteId,
      linkedinProfileId: req.session.linkedinId
    });

    if (!website) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Website not found'
      });
    }

    // Use deleteOne instead of remove
    await Website.deleteOne({ websiteId: req.params.websiteId });
    
    res.json({ 
      success: true,
      message: 'Website deleted successfully'
    });

  } catch (error) {
    console.error('Delete website error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete website' 
    });
  }
});

// Added PUT route for renaming website
app.put('/user/websites/:websiteId', async (req, res) => {
  try {
    if (!req.session.linkedinAccessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please login with LinkedIn first'
      });
    }

    const { websiteId } = req.params;
    
    if (!req.body || (typeof req.body.newName === 'undefined' && typeof req.body.websiteName === 'undefined')) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Website name is required'
      });
    }

    const websiteName = (req.body.newName || req.body.websiteName).trim();

    // Validate name length
    if (typeof websiteName !== 'string' || websiteName.length < 3 || websiteName.length > 100) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Website name must be between 3 and 100 characters'
      });
    }

    // Sanitize website name
    const sanitizedName = websiteName
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .trim();

    if (!sanitizedName) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Website name contains invalid characters'
      });
    }

    const profileData = await fetchLinkedInProfile(req.session.linkedinAccessToken);
    
    if (!profileData?.sub) {
      return res.status(401).json({ 
        error: 'Invalid profile',
        message: 'Could not verify user identity'
      });
    }

    // Check if name already exists for this user
    const existingWebsite = await Website.findOne({
      linkedinProfileId: profileData.sub,
      websiteName: sanitizedName,
      websiteId: { $ne: websiteId } // Exclude current website
    });

    if (existingWebsite) {
      return res.status(409).json({
        error: 'Duplicate name',
        message: 'You already have a website with this name'
      });
    }

    // Find and update website
    const website = await Website.findOneAndUpdate(
      { 
        websiteId,
        linkedinProfileId: profileData.sub 
      },
      { 
        websiteName: sanitizedName,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!website) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Website not found or permission denied'
      });
    }

    res.json({ 
      message: 'Website renamed successfully',
      website: {
        websiteId: website.websiteId,
        websiteName: website.websiteName,
        createdAt: website.createdAt
      }
    });

  } catch (error) {
    console.error('Error renaming website:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate name',
        message: 'You already have a website with this name'
      });
    }

    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to rename website'
    });
  }
});

// Update the website generation route
app.post('/user/websites/generate', async (req, res) => {
  try {
    if (!req.session.linkedinAccessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please login with LinkedIn first'
      });
    }

    const profileData = await fetchLinkedInProfile(req.session.linkedinAccessToken);
    
    if (!profileData || !profileData.sub) {
      return res.status(401).json({ 
        error: 'Invalid profile',
        message: 'Could not fetch LinkedIn profile'
      });
    }

    // Generate a unique website name
    const date = new Date().toLocaleDateString();
    const baseWebsiteName = `My Website ${date}`;
    let websiteName = baseWebsiteName;
    let counter = 1;

    // Keep trying until we find a unique name
    while (true) {
      const existingWebsite = await Website.findOne({
        linkedinProfileId: profileData.sub,
        websiteName
      });

      if (!existingWebsite) break;
      
      websiteName = `${baseWebsiteName} (${counter})`;
      counter++;
    }

    // Generate website HTML
    const websiteHtml = await generatePersonalWebsite(profileData);
    
    // Generate thumbnail with specific dimensions and styling
    const thumbnailHtml = `
      <html>
        <head>
          <style>
            body {
              width: 1200px;
              height: 630px;
              margin: 0;
              padding: 0;
              transform: scale(0.5);
              transform-origin: 0 0;
            }
            ${websiteHtml.match(/<style>(.*?)<\/style>/s)?.[1] || ''}
          </style>
        </head>
        <body>
          ${websiteHtml.replace(/<style>.*?<\/style>/s, '')}
        </body>
      </html>
    `;

    const thumbnail = await nodeHtmlToImage({
      html: thumbnailHtml,
      quality: 100,
      type: 'jpeg',
      puppeteerArgs: {
        defaultViewport: {
          width: 1200,
          height: 630,
          deviceScaleFactor: 2
        },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      },
      encoding: 'base64'
    });

    // Create website with unique name and thumbnail
    const websiteId = await storeWebsite(
      websiteHtml,
      profileData.sub,
      `data:image/jpeg;base64,${thumbnail}`,
      websiteName
    );

    res.json({ websiteId, websiteName });

  } catch (error) {
    console.error('Website generation error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate website',
        message: 'A website with this name already exists'
      });
    }

    res.status(500).json({
      error: 'Generation failed',
      message: error.message || 'Failed to generate website'
    });
  }
});

// Add publish route
app.post('/user/websites/:websiteId/publish', authMiddleware, async (req, res) => {
  try {
    const website = await Website.findOne({
      websiteId: req.params.websiteId,
      linkedinProfileId: req.session.linkedinId
    });

    if (!website) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Website not found'
      });
    }

    website.published = true;
    await website.save();

    res.json({
      success: true,
      message: 'Website published successfully',
      websiteId: website.websiteId,
      publicUrl: `${req.protocol}://${req.get('host')}/website/${website.websiteId}`
    });

  } catch (error) {
    console.error('Publish website error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to publish website'
    });
  }
});

// Add unpublish route
app.post('/user/websites/:websiteId/unpublish', authMiddleware, async (req, res) => {
  try {
    const website = await Website.findOne({
      websiteId: req.params.websiteId,
      linkedinProfileId: req.session.linkedinId
    });

    if (!website) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Website not found'
      });
    }

    website.published = false;
    await website.save();

    res.json({
      success: true,
      message: 'Website unpublished successfully',
      websiteId: website.websiteId
    });

  } catch (error) {
    console.error('Unpublish website error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to unpublish website'
    });
  }
});

// Add logout route after other routes
app.post('/auth/logout', (req, res) => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ 
          error: 'Server error',
          message: 'Failed to logout' 
        });
      }
      
      // Clear cookies
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to logout' 
    });
  }
});

app.get('/user/check-auth', (req, res) => {
  res.json({
    authenticated: !!(req.session.linkedinAccessToken && req.session.linkedinId),
    userId: req.session.linkedinId || null
  });
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
async function generatePersonalWebsite(profileData) {
  if (!profileData || !profileData.name) {
    throw new Error('Invalid profile data');
  }

  // Generate AI-enhanced about me content
  const aboutMeContent = await generateAiEnhancedContent(profileData);

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
        <script src="/public/website.js" defer></script>
        <style>
          body { 
            font-family: 'Inter', sans-serif; 
          }
          .fade-in {
            opacity: 1 !important;
          }
        </style>
      </head>
      <body class="bg-gray-50">
        <header class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div class="max-w-4xl mx-auto px-4 py-16 flex flex-col md:flex-row items-center">
            ${
              profilePicture
                ? `<div class="mb-6 md:mb-0 md:mr-8">
                    <img 
                      src="${profilePicture}" 
                      alt="${fullName}" 
                      class="rounded-full h-40 w-40 md:h-48 md:w-48 object-cover border-4 border-white shadow-xl transform hover:scale-105 transition-transform duration-300"
                      onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=200&background=random';"
                      loading="eager"
                      fetchpriority="high"
                    >
                   </div>`
                : `<div class="mb-6 md:mb-0 md:mr-8">
                    <img 
                      src="https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=200&background=random" 
                      alt="${fullName}" 
                      class="rounded-full h-40 w-40 md:h-48 md:w-48 object-cover border-4 border-white shadow-xl"
                    >
                   </div>`
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
              <a href="#contact" class="px-3 py-4 text-sm font-medium text-gray-700 hover:text-blue-600">Contact</a>
            </div>
          </div>
        </nav>
        
        <main class="max-w-4xl mx-auto px-4 py-8">
          <section id="about" class="mb-12">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">About Me</h2>
            <div class="bg-white rounded-lg shadow-md p-6">
              <p class="text-gray-600">
                ${aboutMeContent}
              </p>
            </div>
          </section>
          
          <section id="contact" class="section-scroll">
            <h2 class="font-display text-3xl font-bold text-gray-900 mb-8 text-center">
              Get in Touch
            </h2>
            <div class="flex justify-center space-y-4">
              ${email ? `
                <a href="mailto:${email}" 
                   class="inline-flex items-center px-6 py-3 text-base font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-colors shadow-md hover:shadow-lg">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send me an email
                </a>
              ` : ''}
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

