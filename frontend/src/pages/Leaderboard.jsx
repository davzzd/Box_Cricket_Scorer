import React, { useEffect, useState } from 'react';
import { Trophy, ChevronLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Leaderboard = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                // Fetch stats for active season (Season ID logic could be better, defaulting)
                const res = await fetch(`${URL}/api/stats/active`);
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            <Loader2 className="animate-spin" size={40} />
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white p-4">
            <div className="max-w-md mx-auto">
                <div className="flex items-center mb-6">
                    <Link to="/" className="p-2 -ml-2 text-gray-400 hover:text-white">
                        <ChevronLeft />
                    </Link>
                    <h1 className="text-2xl font-black flex items-center">
                        <Trophy className="mr-2 text-yellow-500" /> Season Leaders
                    </h1>
                </div>

                <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                    <div className="grid grid-cols-12 gap-1 p-3 bg-gray-800 font-bold text-[10px] uppercase text-gray-400 items-center">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-3">Player</div>
                        <div className="col-span-1 text-center">Mat</div>
                        <div className="col-span-1 text-center">W-L</div>
                        <div className="col-span-1 text-center">Run</div>
                        <div className="col-span-1 text-center">Avg</div>
                        <div className="col-span-1 text-center">Wkt</div>
                        <div className="col-span-1 text-center">Ct</div>
                        <div className="col-span-2 text-right">Net</div>
                    </div>
                    {stats.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No completed matches in this season yet.
                        </div>
                    ) : (
                        stats.map((player, index) => (
                            <div key={player.id} className="grid grid-cols-12 gap-1 p-3 border-b border-gray-800 items-center text-xs last:border-0 hover:bg-gray-800/50">
                                <div className="col-span-1 font-mono text-gray-500 text-center">{index + 1}</div>
                                <div className="col-span-3 font-bold truncate">
                                    <Link to={`/player/${player.id}`} className="text-white hover:text-blue-400 hover:underline">
                                        {player.name}
                                    </Link>
                                </div>
                                <div className="col-span-1 text-center text-gray-400">{player.matches}</div>
                                <div className="col-span-1 text-center text-gray-400">
                                    <span className="text-green-400">{player.wins}</span>-<span className="text-red-400">{player.losses}</span>
                                </div>
                                <div className="col-span-1 text-center text-white font-bold">{player.runs}</div>
                                <div className="col-span-1 text-center text-gray-400">{player.avgRuns}</div>
                                <div className="col-span-1 text-center text-purple-400 font-bold">{player.wickets}</div>
                                <div className="col-span-1 text-center text-yellow-500">{player.catches}</div>
                                <div className={`col-span-2 text-right font-mono font-bold ${player.netImpactScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {player.netImpactScore}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-4 text-xs text-gray-500 text-center">
                    Net Impact = Runs - (5 × Dismissals) + (5 × Wickets)
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
