import React, { useEffect, useState } from 'react';
import { Trophy, ChevronLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Leaderboard = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Net Impact'); // Batting, Bowling, Fielding, Net Impact

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

                {/* Filter Toggle Group */}
                <div className="flex bg-gray-900 p-1 mb-4 rounded-lg overflow-x-auto custom-scrollbar border border-gray-800">
                    {['Net Impact', 'Batting', 'Bowling', 'Fielding'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 min-w-[80px] text-xs font-bold py-2 px-3 rounded-md transition-all ${filter === f
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                    <div className="grid grid-cols-12 gap-1 p-3 bg-gray-800 font-bold text-[10px] uppercase text-gray-400 items-center">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-3">Player</div>
                        <div className="col-span-1 text-center" title="Matches Plays">Mat</div>
                        {filter === 'Batting' && (
                            <>
                                <div className="col-span-2 text-center" title="Runs Scored">Run</div>
                                <div className="col-span-2 text-center" title="Dismissals">Dism</div>
                                <div className="col-span-1 text-center">Avg</div>
                                <div className="col-span-2 text-right" title="Impact Runs">ImpR</div>
                            </>
                        )}
                        {filter === 'Bowling' && (
                            <>
                                <div className="col-span-2 text-center" title="Balls Bowled">B</div>
                                <div className="col-span-2 text-center" title="Runs Conceded">RC</div>
                                <div className="col-span-2 text-center" title="Runs Conceded per Ball (Economy)">Econ</div>
                                <div className="col-span-1 text-right" title="Wickets Taken">Wkt</div>
                            </>
                        )}
                        {filter === 'Fielding' && (
                            <>
                                <div className="col-span-2 text-center" title="Catches">Ct</div>
                                <div className="col-span-2 text-center" title="Run Outs">RO</div>
                                <div className="col-span-3 text-right" title="Fielding Impact (Ct + RO)">Fld</div>
                            </>
                        )}
                        {filter === 'Net Impact' && (
                            <>
                                <div className="col-span-1 text-center" title="Wins">W</div>
                                <div className="col-span-1 text-center" title="Impact Runs">ImpR</div>
                                <div className="col-span-1 text-center" title="Wickets">Wkt</div>
                                <div className="col-span-1 text-center" title="Catches">Ct</div>
                                <div className="col-span-1 text-center" title="Run Outs">RO</div>
                                <div className="col-span-2 text-right">Net</div>
                            </>
                        )}
                    </div>
                    {stats.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No completed matches in this season yet.
                        </div>
                    ) : (
                        [...stats].sort((a, b) => {
                            if (filter === 'Batting') return b.impactRuns - a.impactRuns;
                            if (filter === 'Bowling') {
                                if (b.wickets !== a.wickets) return b.wickets - a.wickets;
                                // If wickets are tied, sort by lowest runs conceded per ball
                                return parseFloat(a.runsConcededPerBall) - parseFloat(b.runsConcededPerBall);
                            }
                            if (filter === 'Fielding') return (b.catches + b.runOuts) - (a.catches + a.runOuts);
                            return b.netImpactScore - a.netImpactScore; // Net Impact
                        }).map((player, index) => (
                            <div key={player.id} className="grid grid-cols-12 gap-1 p-3 border-b border-gray-800 items-center text-xs last:border-0 hover:bg-gray-800/50">
                                <div className="col-span-1 font-mono text-gray-500 text-center">{index + 1}</div>
                                <div className="col-span-3 font-bold truncate">
                                    <Link to={`/player/${player.id}`} className="text-white hover:text-blue-400 hover:underline">
                                        {player.name}
                                    </Link>
                                </div>
                                <div className="col-span-1 text-center text-gray-400">{player.matches}</div>

                                {filter === 'Batting' && (
                                    <>
                                        <div className="col-span-2 text-center text-white font-bold">{player.runs}</div>
                                        <div className="col-span-2 text-center text-red-400">{player.dismissals}</div>
                                        <div className="col-span-1 text-center text-gray-400">{player.avgRuns}</div>
                                        <div className={`col-span-2 text-right font-mono font-bold ${player.impactRuns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {player.impactRuns}
                                        </div>
                                    </>
                                )}
                                {filter === 'Bowling' && (
                                    <>
                                        <div className="col-span-2 text-center text-gray-400">{player.ballsBowled}</div>
                                        <div className="col-span-2 text-center text-red-400">{player.runsConceded}</div>
                                        <div className="col-span-2 text-center font-mono font-bold text-gray-300">{player.runsConcededPerBall}</div>
                                        <div className="col-span-1 text-right text-purple-400 font-bold">{player.wickets}</div>
                                    </>
                                )}
                                {filter === 'Fielding' && (
                                    <>
                                        <div className="col-span-2 text-center text-yellow-500 font-bold">{player.catches}</div>
                                        <div className="col-span-2 text-center text-orange-400 font-bold">{player.runOuts || 0}</div>
                                        <div className={`col-span-3 text-right font-mono font-bold text-white`}>
                                            {(player.catches || 0) + (player.runOuts || 0)}
                                        </div>
                                    </>
                                )}
                                {filter === 'Net Impact' && (
                                    <>
                                        <div className="col-span-1 text-center text-gray-400">
                                            <span className="text-green-400">{player.wins}</span>
                                        </div>
                                        <div className="col-span-1 text-center text-gray-300">{player.impactRuns}</div>
                                        <div className="col-span-1 text-center text-purple-400">{player.wickets}</div>
                                        <div className="col-span-1 text-center text-yellow-500">{player.catches}</div>
                                        <div className="col-span-1 text-center text-orange-400">{player.runOuts || 0}</div>
                                        <div className={`col-span-2 text-right font-mono font-bold ${player.netImpactScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {player.netImpactScore}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-4 text-xs text-gray-500 flex flex-col space-y-1 mx-2">
                    <p><strong>Impact Runs (ImpR):</strong> Runs - (5 × Dismissals)</p>
                    <p><strong>Fielding Impact (Fld):</strong> Catches + Run Outs</p>
                    <p><strong>Net Impact:</strong> ImpR + (5 × Wkts) + (5 × RO) + (2 × Ct) + (5 × Wins)</p>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
