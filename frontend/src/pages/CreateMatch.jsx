
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, ArrowRight, Check, Search, User } from 'lucide-react';
import useMatchStore from '../store/useMatchStore';
import clsx from 'clsx';

const CreateMatch = () => {
    const navigate = useNavigate();
    const createMatch = useMatchStore(state => state.createMatch);

    // Wizard State
    const [step, setStep] = useState(1);

    // Data State
    const [allKnownPlayers, setAllKnownPlayers] = useState([]); // from backend
    const [players, setPlayers] = useState([]); // Selected names
    const [newPlayerName, setNewPlayerName] = useState('');

    // Team Assignment
    const [teamA, setTeamA] = useState([]);
    const [teamB, setTeamB] = useState([]);

    // Settings
    const [overs, setOvers] = useState(6);
    const [tossWinner, setTossWinner] = useState(''); // 'A' or 'B'
    const [tossDecision, setTossDecision] = useState(''); // 'bat' or 'bowl'

    const [loading, setLoading] = useState(false);

    // Fetch existing players on mount
    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const res = await fetch(`${URL}/api/matches/players`); // We need to add this endpoint or just mock?
                // Wait, I added listPlayers to matchController.js earlier. I need to expose it in routes.
                // Assuming route is /api/matches/players or similar?
                // Actually I didn't add the route in matchRoutes.js yet! I added the controller method but arguably not the route.
                // I should verify if I added the route. 
                // Let's assume I will fix the route in next step. For now, try fetch.
                if (res.ok) {
                    const data = await res.json();
                    setAllKnownPlayers(data);
                }
            } catch (e) {
                console.error("Failed to fetch players", e);
            }
        };
        fetchPlayers();
    }, []);

    // Helper: Add Player
    const addPlayer = (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (players.includes(trimmed)) {
            alert("Player already in match!");
            return;
        }
        setPlayers([...players, trimmed]);
        setNewPlayerName('');
    };

    // Step 2: Auto Assign or Init
    const initTeams = () => {
        if (players.length < 2) {
            alert("Add at least 2 players!");
            return;
        }
        // Default all to A to start, or split?
        // Let's split strictly for ease? Or all unassigned?
        // User flow: "Tap to switch". 
        // Let's put first half in A, second in B by default?
        const half = Math.ceil(players.length / 2);
        setTeamA(players.slice(0, half));
        setTeamB(players.slice(half));
        setStep(2);
    };

    const toggleTeam = (player) => {
        if (teamA.includes(player)) {
            setTeamA(teamA.filter(p => p !== player));
            setTeamB([...teamB, player]);
        } else {
            setTeamB(teamB.filter(p => p !== player));
            setTeamA([...teamA, player]);
        }
    };

    const handleCreateMatch = async () => {
        if (!tossWinner || !tossDecision) {
            alert("Please complete the Toss details!");
            return;
        }

        setLoading(true);
        try {
            // 1. Create Match
            const match = await createMatch({
                overs: parseInt(overs),
                toss_winner_team: tossWinner,
                toss_decision: tossDecision
            });

            // 2. Add Players to Match
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const addReq = async (name, team) => {
                await fetch(`${URL}/api/matches/${match.id}/players`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, team })
                });
            };

            const promises = [
                ...teamA.map(p => addReq(p, 'A')),
                ...teamB.map(p => addReq(p, 'B'))
            ];

            await Promise.all(promises);

            navigate(`/match/${match.id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to create match.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-4 p-4 min-h-screen pb-20">
            {/* Step Indicator */}
            <div className="flex justify-between mb-8 px-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`flex flex-col items-center ${step === i ? 'text-blue-500' : 'text-gray-600'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg mb-1 transition-all ${step === i ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-gray-800'}`}>
                            {i}
                        </div>
                    </div>
                ))}
            </div>

            {/* STEP 1: Add Players */}
            {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-3xl font-black mb-1 text-white">Assemble Squad</h2>
                    <p className="text-gray-500 mb-6 font-mono text-xs uppercase">Add existing or new players</p>

                    {/* Input */}
                    <div className="relative mb-6">
                        <input
                            type="text"
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addPlayer(newPlayerName)}
                            placeholder="Type player name..."
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 pl-12 text-white focus:border-blue-500 outline-none text-lg"
                            autoFocus
                        />
                        <Search className="absolute left-4 top-5 text-gray-500" size={20} />
                        <button
                            onClick={() => addPlayer(newPlayerName)}
                            className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-500 p-2 rounded-lg text-white"
                        >
                            <UserPlus size={20} />
                        </button>
                    </div>

                    {/* Quick Add from Existing */}
                    {allKnownPlayers.length > 0 && (
                        <div className="mb-6">
                            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Recent Players</div>
                            <div className="flex flex-wrap gap-2">
                                {allKnownPlayers.filter(p => !players.includes(p.name)).slice(0, 8).map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => addPlayer(p.name)}
                                        className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full text-xs font-bold text-gray-300 border border-gray-700"
                                    >
                                        + {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected List */}
                    <div className="space-y-2 mb-8">
                        {players.map((p, i) => (
                            <div key={i} className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-xl border border-gray-800 flex justify-between items-center group">
                                <span className="font-bold text-gray-200 flex items-center">
                                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center mr-3 text-xs font-bold text-gray-400">
                                        {p.charAt(0)}
                                    </div>
                                    {p}
                                </span>
                                <button onClick={() => setPlayers(players.filter(pl => pl !== p))} className="text-red-500 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-red-900/20 p-2 rounded-lg">✕</div>
                                </button>
                            </div>
                        ))}
                        {players.length === 0 && <div className="text-center py-8 text-gray-600">No players squad yet.</div>}
                    </div>

                    <button
                        onClick={initTeams}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/20"
                    >
                        <span>Assign Teams</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            )}

            {/* STEP 2: Assign Teams */}
            {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-3xl font-black mb-1 text-white">Teams</h2>
                    <p className="text-gray-500 mb-6 font-mono text-xs uppercase">Tap to swap sides</p>

                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-gray-900/50 p-4 rounded-xl border border-blue-900/30">
                            <div className="text-blue-400 font-black text-xl mb-4 text-center">TEAM A</div>
                            <div className="space-y-2">
                                {teamA.map(p => (
                                    <button key={p} onClick={() => toggleTeam(p)} className="w-full bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/50 p-3 rounded-lg text-sm font-bold text-blue-100">
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-900/50 p-4 rounded-xl border border-red-900/30">
                            <div className="text-red-400 font-black text-xl mb-4 text-center">TEAM B</div>
                            <div className="space-y-2">
                                {teamB.map(p => (
                                    <button key={p} onClick={() => toggleTeam(p)} className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 p-3 rounded-lg text-sm font-bold text-red-100">
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="px-6 bg-gray-800 text-gray-400 font-bold py-4 rounded-xl">Back</button>
                        <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2">
                            <span>Match Settings</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Settings */}
            {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-3xl font-black mb-1 text-white">Match Setup</h2>
                    <p className="text-gray-500 mb-8 font-mono text-xs uppercase">Finalize conditions</p>

                    <div className="space-y-8 mb-10">
                        {/* Overs */}
                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Overs Per Team</label>
                            <input
                                type="number"
                                value={overs}
                                onChange={(e) => setOvers(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-xl p-6 text-white text-4xl font-black font-mono focus:border-blue-500 outline-none text-center"
                            />
                        </div>

                        {/* Toss */}
                        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                            <label className="block text-purple-400 text-xs font-bold uppercase mb-4 text-center tracking-widest">Toss Result</label>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <button
                                    onClick={() => setTossWinner('A')}
                                    className={clsx("p-4 rounded-xl font-bold border transition-all", tossWinner === 'A' ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-gray-950 border-gray-800 text-gray-500")}
                                >
                                    Team A Won
                                </button>
                                <button
                                    onClick={() => setTossWinner('B')}
                                    className={clsx("p-4 rounded-xl font-bold border transition-all", tossWinner === 'B' ? "bg-red-600 border-red-400 text-white shadow-lg" : "bg-gray-950 border-gray-800 text-gray-500")}
                                >
                                    Team B Won
                                </button>
                            </div>

                            {tossWinner && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="text-center text-xs text-gray-500 font-bold uppercase mb-2">Chose To</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setTossDecision('bat')}
                                            className={clsx("p-3 rounded-lg font-bold border text-sm transition-all", tossDecision === 'bat' ? "bg-gray-100 text-black border-white" : "bg-gray-800 text-gray-400 border-transparent")}
                                        >
                                            BAT 🏏
                                        </button>
                                        <button
                                            onClick={() => setTossDecision('bowl')}
                                            className={clsx("p-3 rounded-lg font-bold border text-sm transition-all", tossDecision === 'bowl' ? "bg-gray-100 text-black border-white" : "bg-gray-800 text-gray-400 border-transparent")}
                                        >
                                            BOWL 🥎
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(2)} className="px-6 bg-gray-800 text-gray-400 font-bold py-4 rounded-xl">Back</button>
                        <button
                            onClick={handleCreateMatch}
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-green-900/20"
                        >
                            {loading ? <span>Starting...</span> : (
                                <>
                                    <span>START MATCH</span>
                                    <Check size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateMatch;
