// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import WebsiteDisplay from './components/WebsiteDisplay';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/website/:websiteId" element={<WebsiteDisplay />} />
      </Routes>
    </Router>
  );
}

export default App;