const helmet = require('helmet');
const cors = require('cors');

const securityMiddleware = (app) => {
  // Security headers
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // XSS Protection
  app.use(helmet.xssFilter());
  
  // Prevent clickjacking
  app.use(helmet.frameguard({ action: 'deny' }));
};

module.exports = securityMiddleware;