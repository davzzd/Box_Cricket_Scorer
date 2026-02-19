import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Trophy, Crosshair, Shield, Activity, Zap } from 'lucide-react';
import clsx from 'clsx';

const PlayerProfile = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const res = await fetch(`${URL}/api/stats/player/${id}`);
                if (!res.ok) throw new Error('Failed to fetch player stats');
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error(e);
                setError(e.message);
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

    if (error || !data) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
            <h2 className="text-xl font-bold mb-2 text-red-500">Error</h2>
            <p className="text-gray-400 mb-6">{error || 'Player not found'}</p>
            <Link to="/" className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">Go Home</Link>
        </div>
    );

    const { player, core, batting, bowling, fielding } = data;

    return (
        <div className="min-h-screen bg-black text-white pb-20 p-4 font-sans max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center mb-8">
                <Link to="/" className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft />
                </Link>
                <h1 className="text-3xl font-black truncate tracking-tighter">{player.name}</h1>
            </div>

            {/* CORE STATS */}
            <div className="mb-8">
                <div className="flex items-center space-x-2 mb-3 px-1">
                    <Activity size={16} className="text-blue-500" />
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Career Record</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex flex-col items-center">
                        <span className="text-3xl font-black text-white">{core.matchesPlayed}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Matches</span>
                    </div>
                    <div className="bg-green-900/10 border border-green-900/30 p-4 rounded-2xl flex flex-col items-center">
                        <span className="text-3xl font-black text-green-400">{core.matchesWon}</span>
                        <span className="text-[10px] font-bold text-green-700 uppercase mt-1">Won</span>
                    </div>
                    <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-2xl flex flex-col items-center">
                        <span className="text-3xl font-black text-red-400">{core.matchesLost}</span>
                        <span className="text-[10px] font-bold text-red-700 uppercase mt-1">Lost</span>
                    </div>
                </div>
            </div>

            {/* BATTING */}
            <div className="mb-8 p-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Trophy size={18} className="text-yellow-500" />
                        <h2 className="text-lg font-black uppercase italic tracking-wider text-gray-200">Batting</h2>
                    </div>
                    <div className="bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-700/30">
                        <span className="text-xs font-bold text-yellow-500">Impact: {batting.netImpact}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Primary Stats */}
                    <StatCard label="Runs" value={batting.totalRuns} />
                    <StatCard label="Balls" value={batting.totalBallsFaced} />
                    <StatCard label="Fours" value={batting.totalFours} />
                    <StatCard label="Sixes" value={batting.totalSixes} />
                    <StatCard label="Highest" value={batting.highestScore} />
                    <StatCard label="Dismissals" value={batting.totalDismissals} />

                    {/* Derived */}
                    <div className="col-span-2 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 p-4 rounded-2xl flex justify-between items-center mt-2">
                        <span className="text-xs font-bold uppercase text-gray-400">Net Runs / Ball</span>
                        <span className="text-2xl font-black text-white">{batting.netRunsPerBall}</span>
                    </div>
                </div>
            </div>

            {/* BOWLING */}
            <div className="mb-8 p-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Crosshair size={18} className="text-red-500" />
                        <h2 className="text-lg font-black uppercase italic tracking-wider text-gray-200">Bowling</h2>
                    </div>
                    <div className="bg-red-900/20 px-3 py-1 rounded-full border border-red-700/30">
                        <span className="text-xs font-bold text-red-400">Impact: {bowling.bowlingImpact}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="Wickets" value={bowling.totalWicketsTaken} highlight />
                    <StatCard label="Maidens" value={bowling.totalMaidens} />
                    <StatCard label="Balls" value={bowling.totalBallsBowled} />
                    <StatCard label="Runs Conc." value={bowling.totalRunsConceded} />
                    <StatCard label="Wides / NB" value={`${bowling.totalWides} / ${bowling.totalNoBalls}`} />

                    {/* Derived */}
                    <div className="col-span-2 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 p-4 rounded-2xl flex justify-between items-center mt-2">
                        <span className="text-xs font-bold uppercase text-gray-400">Runs Conc. / Ball</span>
                        <span className="text-2xl font-black text-white">{bowling.runsPerBall}</span>
                    </div>
                </div>
            </div>

            {/* FIELDING */}
            <div className="mb-8 p-1">
                <div className="flex items-center space-x-2 mb-4">
                    <Shield size={18} className="text-purple-500" />
                    <h2 className="text-lg font-black uppercase italic tracking-wider text-gray-200">Fielding</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="Catches" value={fielding.catches} />
                    <StatCard label="Run Outs" value={fielding.runOuts} />
                </div>
            </div>

        </div>
    );
};

const StatCard = ({ label, value, highlight }) => (
    <div className={clsx("bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex flex-col justify-between", highlight && "border-gray-600 bg-gray-800")}>
        <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">{label}</span>
        <span className="text-xl font-bold text-gray-200">{value}</span>
    </div>
);

export default PlayerProfile;
