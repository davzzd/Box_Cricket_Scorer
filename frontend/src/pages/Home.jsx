import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trophy, History, Calendar, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { isScorer } = useAuth();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const res = await fetch(`${URL}/api/matches?limit=5`);
                const data = await res.json();
                if (data.matches) {
                    setMatches(data.matches);
                }
            } catch (error) {
                console.error("Failed to fetch matches", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-400';
            case 'completed': return 'text-blue-400';
            case 'cancelled': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="min-h-screen bg-background text-white pb-24 px-4 overflow-x-hidden relative">
            {/* Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl opacity-40"></div>
            </div>

            <div className="relative z-10 max-w-md mx-auto pt-10">
                {/* Header */}
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 uppercase italic">
                        Box Cricket
                    </h1>
                    <p className="text-secondary text-sm font-medium tracking-widest uppercase opacity-70">
                        Official Scorer
                    </p>
                </div>


                {/* Main Actions - Glassmorphism Cards */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    {isScorer && (
                        <Link to="/create" className="col-span-2 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl opacity-90 transition-all group-hover:opacity-100 group-hover:scale-[1.02]"></div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                            <div className="relative p-6 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Start Scoring</div>
                                    <div className="text-2xl font-black text-white italic">NEW MATCH</div>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                    <Plus size={24} className="text-white" />
                                </div>
                            </div>
                        </Link>
                    )}

                    <Link to="/leaderboard" className="bg-surface/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-surface/80 transition-all hover:-translate-y-1">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 mb-1">
                            <Trophy size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-300">Leaderboard</span>
                    </Link>

                    <Link to="/history" className="bg-surface/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-surface/80 transition-all hover:-translate-y-1">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 mb-1">
                            <History size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-300">History</span>
                    </Link>
                </div>

                {/* Recent Matches */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Recent Matches</h3>
                        <Link to="/history" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center">
                            View All <ChevronRight size={14} />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500 animate-pulse text-xs uppercase font-bold">Loading Matches...</div>
                        ) : matches.length === 0 ? (
                            <div className="bg-surface/30 border border-white/5 rounded-2xl p-8 text-center">
                                <p className="text-gray-500 text-sm font-medium">No matches played yet.</p>
                                <Link to="/create" className="text-blue-400 text-xs font-bold mt-2 inline-block hover:underline">Start the first match!</Link>
                            </div>
                        ) : (
                            matches.map(match => (
                                <div
                                    key={match.id}
                                    onClick={() => navigate(`/match/${match.id}`)}
                                    className="group bg-surface/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/60 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    {/* Status Indicator */}
                                    <div className={clsx("absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-10 rounded-bl-full",
                                        match.status === 'active' ? 'bg-green-500' :
                                            match.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                                    )}></div>

                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <span className={clsx("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/5",
                                                    match.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                        match.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-red-500/10 text-red-500'
                                                )}>
                                                    {match.status}
                                                </span>
                                                <span className="text-[10px] text-gray-600 font-bold flex items-center">
                                                    <Calendar size={10} className="mr-1" />
                                                    {new Date(match.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-3 mb-1">
                                                <span className="text-lg font-bold text-white">Team A</span>
                                                <span className="text-xs font-black text-gray-600">VS</span>
                                                <span className="text-lg font-bold text-white">Team B</span>
                                            </div>

                                            {match.current_batter_str && (
                                                <div className="text-xs text-gray-500 mt-1 truncate">
                                                    Batting: <span className="text-gray-300">{match.current_batter_str}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                                            <ChevronRight size={16} className="text-gray-500 group-hover:text-white" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
