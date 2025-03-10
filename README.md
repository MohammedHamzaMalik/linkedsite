# LinkedIn Portfolio Generator

Generate professional portfolio websites instantly using your LinkedIn profile data. This project automatically creates personalized websites with AI-enhanced content based on your LinkedIn profile.

🌐 **Live Website**: [LinkedSite](https://linkedsite.onrender.com)

## 🚀 Features

- **LinkedIn Integration**: Seamless authentication using LinkedIn OAuth2
- **Instant Generation**: Create portfolio websites with one click
- **AI Enhancement**: Smart content generation using HuggingFace and LangChain
- **Custom Templates**: Professional and responsive website templates
- **Dashboard**: Manage multiple portfolio websites
- **Publishing Controls**: Publish/unpublish websites as needed
- **One-Click Sharing**: Easily share your portfolio with others

## 📝 How to Use

1. Visit [LinkedSite](https://linkedsite.onrender.com)
2. Click "Sign in with LinkedIn" button
3. Authorize the application to access your LinkedIn data
4. Once logged in, you'll be redirected to your dashboard
5. Click "Generate Website" to create your portfolio
6. Preview your generated website
7. Publish when ready to share
8. Share your unique portfolio URL

## 🔑 Sign-in Process

1. **LinkedIn Authentication**
   - Click "Sign in with LinkedIn"
   - Authorize data access
   - Your LinkedIn profile data is securely fetched
   
2. **Dashboard Access**
   - View all your generated websites
   - Manage website visibility
   - Create multiple portfolios
   
3. **Website Management**
   - Generate new websites
   - Edit website names
   - Toggle publish status
   - Delete unwanted websites

## 🛠️ Prerequisites

- Modern web browser
- LinkedIn account
- Internet connection

## ⚙️ For Developers

### Tech Stack
- Frontend: React, TailwindCSS
- Backend: Node.js, Express
- Database: MongoDB
- AI: HuggingFace, LangChain
- Authentication: LinkedIn OAuth2

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MohammedHamzaMalik/linkedsite.git
cd linkedsite
```

2. Install dependencies:
```bash
npm run install-all
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`

### Configuration

#### LinkedIn OAuth Setup

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Add OAuth2 credentials
4. Configure redirect URLs
5. Update `.env` with credentials

#### MongoDB Setup

1. Create MongoDB Atlas account
2. Create new cluster
3. Configure database access
4. Add connection string to `.env`

#### HuggingFace & LangChain Setup

1. Get API key from HuggingFace
2. Configure LangChain environment
3. Add keys to `.env` file

## 🚦 Running the Application

### Development

```bash
# Start backend server
npm run dev

# Start frontend (in another terminal)
cd frontend
npm run dev
```

### Production

```bash
# Build frontend
npm run build

# Start server
npm start
```

## 📁 Project Structure

```
linkedsite/
├── frontend/          # React frontend application
├── utils/            # Utility functions
├── middleware/       # Express middleware
├── server.js         # Main server file
├── .env             # Environment variables
└── README.md        # Project documentation
```

## 🔒 Security Features

- OAuth2 authentication
- Rate limiting
- Session management
- Secure cookie handling
- MongoDB authentication
- CORS protection

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📝 License

MIT License - see LICENSE file for details

## 👥 Author

- Mohammed Hamza Malik ([@MohammedHamzaMalik](https://github.com/MohammedHamzaMalik))

## 🙏 Acknowledgments

- LinkedIn API
- HuggingFace
- LangChain
- MongoDB Atlas
- Express.js community
- React community