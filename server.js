// Required dependencies
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const session = require('express-session');

// Configuration
const config = {
    linkedinAuth: {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        redirectUri: 'http://localhost:3000/auth/linkedin/callback',
        scope: ['r_liteprofile', 'r_emailaddress']
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