import React, { useEffect, useState } from 'react';
import { Trophy, Star, LogOut, X, Share2, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const MatchSummaryOverlay = ({ matchId, onClose, onHome }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('i1');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const res = await fetch(`${URL}/api/stats/match/${matchId}`);
                if (!res.ok) throw new Error('Failed to fetch stats');
                const data = await res.json();
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        if (matchId) fetchStats();
    }, [matchId]);

    if (loading) return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center text-white backdrop-blur-sm">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-sm font-bold animate-pulse">Calculating Stats...</div>
            </div>
        </div>
    );

    if (!stats) return null;

    const { result, team1Score, team2Score, matchStats, topScorers, topWicketTakers, fullStats } = stats;

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] overflow-y-auto animate-in fade-in duration-300 backdrop-blur-md">
            <div className="min-h-screen p-4 pb-24">
                <div className="max-w-md mx-auto relative pt-8">


                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-block p-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 mb-4 shadow-[0_0_40px_-10px_rgba(234,179,8,0.4)]">
                            <Trophy size={56} className="text-yellow-500" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter mb-1 uppercase italic">
                            {result?.winner === 'Match Drawn' ? 'TIED' : 'VICTORY'}
                        </h1>
                        <div className="text-sm font-bold text-blue-400 uppercase tracking-widest">
                            {result?.winner === 'Match Drawn' ? 'Scores Level' : `Won by ${result?.margin}`}
                        </div>
                    </div>

                    {/* Scorecard Summary */}
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 mb-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div className="text-center">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Team A</div>
                                <div className="text-4xl font-black text-white">{team1Score}</div>
                            </div>
                            <div className="text-2xl font-black text-white/20">VS</div>
                            <div className="text-center">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Team B</div>
                                <div className="text-4xl font-black text-white">{team2Score}</div>
                            </div>
                        </div>
                    </div>

                    {/* Match Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center">
                            <div className="text-2xl font-black text-green-400">{matchStats?.totalSixes || 0}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Sixes</div>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center">
                            <div className="text-2xl font-black text-blue-400">{matchStats?.totalFours || 0}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Fours</div>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center">
                            <div className="text-2xl font-black text-red-400">{matchStats?.totalWickets || 0}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Wickets Fell</div>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col items-center">
                            <div className="text-2xl font-black text-yellow-400">{matchStats?.totalDots || 0}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dot Balls</div>
                        </div>
                    </div>

                    {/* Top Performers */}
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pl-2">Top Performers</h3>
                    <div className="space-y-3 mb-8">
                        {topScorers[0] && (
                            <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Star size={20} /></div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{topScorers[0].name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">Best Batter</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-white">{topScorers[0].runs}</div>
                                    <div className="text-[10px] text-gray-500">runs</div>
                                </div>
                            </div>
                        )}
                        {topWicketTakers[0] && (
                            <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><LogOut size={20} /></div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{topWicketTakers[0].name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">Best Bowler</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-white">{topWicketTakers[0].wickets}</div>
                                    <div className="text-[10px] text-gray-500">wickets</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detailed Stats & History Tabs */}
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden mb-6">
                        <div className="flex border-b border-white/10">
                            <button
                                onClick={() => setActiveTab('i1')}
                                className={clsx("flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors", activeTab === 'i1' ? "bg-white/10 text-white" : "text-gray-500 hover:bg-white/5")}
                            >
                                Innings 1
                            </button>
                            <button
                                onClick={() => setActiveTab('i2')}
                                className={clsx("flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors", activeTab === 'i2' ? "bg-white/10 text-white" : "text-gray-500 hover:bg-white/5")}
                            >
                                Innings 2
                            </button>
                        </div>

                        <div className="p-4">
                            {activeTab === 'i1' && <Scorecard innings={stats.innings1} fullStats={fullStats} />}
                            {activeTab === 'i2' && <Scorecard innings={stats.innings2} fullStats={fullStats} />}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={onHome}
                            className="w-full bg-white text-black font-black text-center py-4 rounded-xl shadow-xl hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                        >
                            <Home size={20} />
                            <span>BACK TO HOME</span>
                        </button>

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-full bg-transparent border border-white/10 text-gray-400 font-bold text-center py-3 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                VIEW SCORING PAGE
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

const Scorecard = ({ innings, fullStats }) => {
    const battingTeam = innings.battingTeam;
    const bowlingTeam = battingTeam === 'A' ? 'B' : 'A';

    return (
        <div className="space-y-6">
            <BattingTable players={fullStats} team={battingTeam} />
            <BowlingTable players={fullStats} team={bowlingTeam} />
        </div>
    );
};

const BattingTable = ({ players, team }) => {
    const teamPlayers = players.filter(p => p.team === team);
    // Show all players in the scorecard
    const batters = teamPlayers;

    return (
        <div>
            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">
                Batting ({team === 'A' ? 'Team A' : 'Team B'})
            </h4>
            <div className="space-y-2">
                <div className="flex text-[9px] text-gray-500 uppercase font-bold px-2">
                    <div className="flex-1">Batter</div>
                    <div className="w-8 text-center">R</div>
                    <div className="w-8 text-center">B</div>
                    <div className="w-8 text-center">4s</div>
                    <div className="w-8 text-center">6s</div>
                    <div className="w-10 text-center">SR</div>
                </div>
                {batters.map(p => (
                    <div key={p.id} className="flex items-center bg-white/5 rounded px-2 py-1.5 text-xs text-white">
                        <div className="flex-1 font-bold truncate">{p.name}</div>
                        <div className="w-8 text-center font-bold text-yellow-400">{p.runs}</div>
                        <div className="w-8 text-center text-gray-400">{p.ballsFaced}</div>
                        <div className="w-8 text-center text-blue-300">{p.fours}</div>
                        <div className="w-8 text-center text-green-300">{p.sixes}</div>
                        <div className="w-10 text-center text-gray-500 font-mono text-[10px]">
                            {p.ballsFaced > 0 ? ((p.runs / p.ballsFaced) * 100).toFixed(0) : '-'}
                        </div>
                    </div>
                ))}
                {batters.length === 0 && <div className="text-gray-500 text-xs italic p-2">No batting stats</div>}
            </div>
        </div>
    );
};

const BowlingTable = ({ players, team }) => {
    const teamPlayers = players.filter(p => p.team === team);
    const bowlers = teamPlayers.filter(p => p.ballsBowled > 0 || p.runsConceded > 0);

    return (
        <div>
            <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">
                Bowling ({team === 'A' ? 'Team A' : 'Team B'})
            </h4>
            <div className="space-y-2">
                <div className="flex text-[9px] text-gray-500 uppercase font-bold px-2">
                    <div className="flex-1">Bowler</div>
                    <div className="w-8 text-center">O</div>
                    <div className="w-8 text-center">M</div>
                    <div className="w-8 text-center">R</div>
                    <div className="w-8 text-center">W</div>
                    <div className="w-10 text-center">Econ</div>
                </div>
                {bowlers.map(p => {
                    const econ = p.ballsBowled > 0 ? ((p.runsConceded / p.ballsBowled) * 6).toFixed(2) : '0.00';
                    return (
                        <div key={p.id} className="flex items-center bg-white/5 rounded px-2 py-1.5 text-xs text-white">
                            <div className="flex-1 font-bold truncate">{p.name}</div>
                            <div className="w-8 text-center text-gray-400">{p.oversBowled || 0}</div>
                            <div className="w-8 text-center font-bold text-green-400">{p.maidens || 0}</div>
                            <div className="w-8 text-center text-red-300">{p.runsConceded}</div>
                            <div className="w-8 text-center font-bold text-yellow-400">{p.wickets}</div>
                            <div className="w-10 text-center text-gray-500 font-mono text-[10px]">{econ}</div>
                        </div>
                    );
                })}
                {bowlers.length === 0 && <div className="text-gray-500 text-xs italic p-2">No bowling stats</div>}
            </div>
        </div>
    );
};

const BallHistoryList = ({ balls, innings }) => {
    // Ensure loose comparison for innings (string vs number)
    const inningsBalls = (balls || []).filter(b => b.innings == innings);
    if (inningsBalls.length === 0) return <div className="text-gray-500 text-xs italic">No balls recorded.</div>;

    return (
        <div className="grid grid-cols-6 gap-2 w-max">
            {inningsBalls.map((ball, i) => {
                let content = (ball.wall_value || 0) + (ball.runs_taken || 0);
                let style = "bg-zinc-800 text-white border-white/10";

                if (ball.is_dismissal) {
                    content = "W";
                    style = "bg-red-500/20 text-red-500 border-red-500/30";
                } else if (ball.wall_value === 4) {
                    content = "4";
                    style = "bg-blue-500/20 text-blue-400 border-blue-500/30";
                } else if (ball.wall_value === 6) {
                    content = "6";
                    style = "bg-green-500/20 text-green-400 border-green-500/30";
                } else if (ball.is_wide) {
                    // Show WD + runs if any
                    const runs = (ball.runs_taken || 0) + (ball.wall_value || 0); // extras are separate +2 usually
                    content = runs > 0 ? `WD+${runs}` : "WD";
                    style = "bg-gray-700 text-gray-300";
                } else if (ball.is_no_ball) {
                    const runs = (ball.runs_taken || 0) + (ball.wall_value || 0);
                    content = runs > 0 ? `NB+${runs}` : "NB";
                    style = "bg-gray-700 text-gray-300";
                } else if (content === 0) {
                    content = "•"; // Dot ball
                    style = "bg-zinc-900 text-gray-600 border-white/5";
                }

                return (
                    <div key={ball.id} className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border", style)}>
                        {content}
                    </div>
                );
            })}
        </div>
    );
};

export default MatchSummaryOverlay;
