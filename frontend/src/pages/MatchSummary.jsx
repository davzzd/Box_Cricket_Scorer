import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Trophy, Loader2, Star, UserPlus, LogOut } from 'lucide-react';
import clsx from 'clsx';

const MatchSummary = () => {
    const { id } = useParams();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                // Fetch basic match details? Or just stats?
                // Stats endpoint combines match result + top players + full stats
                const res = await fetch(`${URL}/api/stats/match/${id}`);
                if (!res.ok) throw new Error('Failed to fetch stats');
                const data = await res.json();
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            <Loader2 className="animate-spin" size={40} />
        </div>
    );

    if (!stats) return <div className="p-8 text-center text-white">Stats not found.</div>;

    const { result, topScorers, topWicketTakers, topFielders, fullStats } = stats;

    return (
        <div className="min-h-screen bg-black text-white pb-20 p-4">
            <div className="max-w-md mx-auto">
                <div className="flex items-center mb-6">
                    <Link to="/" className="p-2 -ml-2 text-gray-400 hover:text-white">
                        <ChevronLeft />
                    </Link>
                    <h1 className="text-2xl font-black">Match Summary</h1>
                </div>

                {/* Result Card */}
                <div className="bg-gradient-to-br from-green-900/50 to-gray-900 border border-green-800 rounded-2xl p-6 mb-6 text-center shadow-lg relative overflow-hidden">
                    <Trophy className="absolute -top-4 -right-4 w-32 h-32 text-green-500/10 rotate-12" />
                    <div className="text-sm text-green-400 font-bold uppercase tracking-wider mb-2">Winner</div>
                    <div className="text-3xl font-black text-white mb-1">{result?.winner}</div>
                    <div className="text-gray-400 text-sm font-mono">Won by {result?.margin}</div>
                </div>

                {/* Top Performers */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative">
                        <div className="flex items-center space-x-2 mb-3">
                            <div className="bg-yellow-900/40 p-1.5 rounded-lg">
                                <Star size={16} className="text-yellow-500" />
                            </div>
                            <span className="text-xs font-bold uppercase text-gray-400">Best Batter</span>
                        </div>
                        {topScorers[0] ? (
                            <div>
                                <div className="font-black text-lg truncate hover:text-blue-400 hover:underline">
                                    <Link to={`/player/${topScorers[0].id}`}>{topScorers[0].name}</Link>
                                </div>
                                <div className="text-sm text-gray-500">{topScorers[0].runs} Runs</div>
                            </div>
                        ) : <div className="text-gray-600 text-xs">No runs</div>}
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative">
                        <div className="flex items-center space-x-2 mb-3">
                            <div className="bg-purple-900/40 p-1.5 rounded-lg">
                                <LogOut size={16} className="text-purple-400" />
                            </div>
                            <span className="text-xs font-bold uppercase text-gray-400">Best Bowler</span>
                        </div>
                        {topWicketTakers[0] ? (
                            <div>
                                <div className="font-black text-lg truncate hover:text-blue-400 hover:underline">
                                    <Link to={`/player/${topWicketTakers[0].id}`}>{topWicketTakers[0].name}</Link>
                                </div>
                                <div className="text-sm text-gray-500">{topWicketTakers[0].wickets} Wickets</div>
                            </div>
                        ) : <div className="text-gray-600 text-xs">No wickets</div>}
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative col-span-2">
                        <div className="flex items-center space-x-2 mb-3">
                            <div className="bg-blue-900/40 p-1.5 rounded-lg">
                                <Star size={16} className="text-blue-400" />
                            </div>
                            <span className="text-xs font-bold uppercase text-gray-400">Best Fielder</span>
                        </div>
                        {topFielders[0] ? (
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-black text-lg truncate hover:text-blue-400 hover:underline">
                                        <Link to={`/player/${topFielders[0].id}`}>{topFielders[0].name}</Link>
                                    </div>
                                    <div className="text-sm text-gray-500">{topFielders[0].catches} Catches</div>
                                </div>
                            </div>
                        ) : <div className="text-gray-600 text-xs">No catches</div>}
                    </div>
                </div>

                {/* Full Match Stats Table */}
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Match Leaderboard</h3>
                <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-gray-800 font-bold text-xs uppercase text-gray-400">
                        <div className="col-span-1">#</div>
                        <div className="col-span-5">Player</div>
                        <div className="col-span-2 text-center">Run</div>
                        <div className="col-span-2 text-center">Wkt</div>
                        <div className="col-span-2 text-right">Ct</div>
                    </div>
                    {/* Sort by runs for now? Or impact? Let's sort by runs */}
                    {fullStats.sort((a, b) => b.runs - a.runs).map((player, index) => (
                        <div key={player.id} className="grid grid-cols-12 gap-2 p-4 border-b border-gray-800/50 items-center text-sm last:border-0 hover:bg-gray-800/50 transition-colors">
                            <div className="col-span-1 font-mono text-gray-600">{index + 1}</div>
                            <div className="col-span-5 font-bold truncate text-gray-200">
                                <Link to={`/player/${player.id}`} className="hover:text-blue-400 hover:underline transition-colors">
                                    {player.name}
                                </Link>
                                {player.team && <span className="ml-1 text-[10px] text-gray-600">({player.team})</span>}
                            </div>
                            <div className="col-span-2 text-center font-mono font-bold text-white">{player.runs}</div>
                            <div className="col-span-2 text-center text-purple-400 font-bold">{player.wickets}</div>
                            <div className="col-span-2 text-right text-yellow-600">{player.catches}</div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default MatchSummary;
