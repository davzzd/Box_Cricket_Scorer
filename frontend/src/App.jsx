import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CreateMatch from './pages/CreateMatch';
import MatchDashboard from './pages/MatchDashboard';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import MatchHistory from './pages/MatchHistory';
import MatchSummary from './pages/MatchSummary';
import PlayerProfile from './pages/PlayerProfile';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-black text-gray-100 font-sans">
          <Navbar />

          <main className="pt-20 p-4 safe-area-bottom">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateMatch />} />
              <Route path="/match/:id" element={<MatchDashboard />} />
              <Route path="/match/:id/summary" element={<MatchSummary />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/history" element={<MatchHistory />} />
              <Route path="/player/:id" element={<PlayerProfile />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
