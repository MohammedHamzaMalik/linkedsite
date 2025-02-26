// Required dependencies
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const session = require('express-session');

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

// Root route
app.get('/', (req, res) => {
    res.send('LinkedIn OAuth server is running! Go to /auth/linkedin to begin authentication.');
  });

// Route to initiate LinkedIn OAuth flow
app.get('/auth/linkedin', (req, res) => {
    const state = generateState();
    req.session.state = state;

    const authorizationUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authorizationUrl.searchParams.append('response_type', 'code');
    authorizationUrl.searchParams.append('client_id', config.linkedinAuth.clientId);
    authorizationUrl.searchParams.append('redirect_uri', config.linkedinAuth.redirectUri);
    authorizationUrl.searchParams.append('state', state);
    authorizationUrl.searchParams.append('scope', config.linkedinAuth.scope.join(' '));

    res.redirect(authorizationUrl.toString());
});

// Handle LinkedIn OAuth callback
app.get('/auth/linkedin/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        // Verify state parameter to prevent CSRF attacks
        if (state !== req.session.state) {
            return res.status(400).send('Invalid state parameter');
        }

        // Exchange authorization code for access token
        const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
            params: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: config.linkedinAuth.redirectUri,
                client_id: config.linkedinAuth.clientId,
                client_secret: config.linkedinAuth.clientSecret
            }
        });

        const accessToken = tokenResponse.data.access_token;

        // Store access token securely in session
        req.session.linkedinAccessToken = accessToken;

        // Fetch user profile data
        const profileData = await fetchLinkedInProfile(accessToken);
        const emailData = await fetchLinkedInEmail(accessToken);

        // Store user data or create/update user in your database
        // ...

        res.json({
            profile: profileData,
            email: emailData
        });

    } catch (error) {
        console.error('LinkedIn OAuth Error:', error);
        res.status(500).send('Authentication failed');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).send('Something broke!');
  });

// Function to fetch LinkedIn profile data
async function fetchLinkedInProfile(accessToken) {
    const response = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cache-control': 'no-cache',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        params: {
            projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline)'
        }
    });
    return response.data;
}

// Function to fetch LinkedIn email address
async function fetchLinkedInEmail(accessToken) {
    const response = await axios.get('https://api.linkedin.com/v2/emailAddress', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'cache-control': 'no-cache',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        params: {
            'q': 'members',
            'projection': '(elements*(handle~))'
        }
    });
    return response.data;
}

// Secure token storage in database (example using MongoDB)
const mongoose = require('mongoose');
require('dotenv').config(); // For loading environment variables

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

