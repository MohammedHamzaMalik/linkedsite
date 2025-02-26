const mongoose = require('mongoose');

// Define your schema first
const TokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    accessToken: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}, { 
    timestamps: true 
});

// Create and export the model
const Token = mongoose.model('Token', TokenSchema);

require('dotenv').config(); // For loading environment variables

// MongoDB connection string - ideally stored in an environment variable
const MONGODB_URI = process.env.MONGODB_URI;

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI, options)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    console.log(`Database: ${mongoose.connection.name}`);
    
    // Now Token is defined and can be used safely
    const testToken = new Token({
      userId: new mongoose.Types.ObjectId(),
      accessToken: 'test-token-123',
      expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
    });
    
    return testToken.save();
  })
  .then((savedToken) => {
    console.log('Test token created successfully:', savedToken);
  })
  .catch((err) => {
    console.error('Error:', err.message);
  });

// Optional: Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to local MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose disconnected through app termination');
  process.exit(0);
});

module.exports = { Token };