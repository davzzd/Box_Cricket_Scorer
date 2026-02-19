import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeftRight } from 'lucide-react';

const StartOverModal = ({ isOpen, onClose, onStart, players, battingTeamPlayers, bowlingTeamPlayers, lastStrikerId, lastNonStrikerId, nextOverNumber }) => {
    if (!isOpen) return null;

    const [strikerId, setStrikerId] = useState(lastStrikerId || '');
    const [nonStrikerId, setNonStrikerId] = useState(lastNonStrikerId || '');
    const [bowlerId, setBowlerId] = useState('');
    const [loading, setLoading] = useState(false);

    // Fallback to full list if filtered lists are not provided (backward compatibility)
    const batsmanList = battingTeamPlayers && battingTeamPlayers.length > 0 ? battingTeamPlayers : players;
    const bowlerList = bowlingTeamPlayers && bowlingTeamPlayers.length > 0 ? bowlingTeamPlayers : players;

    // Auto-select loop protection
    useEffect(() => {
        if (isOpen) {
            setStrikerId(lastStrikerId || '');
            setNonStrikerId(lastNonStrikerId || '');
            setBowlerId('');
        }
    }, [isOpen, lastStrikerId, lastNonStrikerId]);

    const handleSwap = () => {
        const temp = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(temp); // Swap locally
    };

    const handleSubmit = async () => {
        if (!strikerId || !nonStrikerId || !bowlerId) {
            alert("Please select all roles!");
            return;
        }
        if (strikerId === nonStrikerId) {
            alert("Striker and Non-Striker must be different!");
            return;
        }

        setLoading(true);
        try {
            await onStart({ strikerId, nonStrikerId, bowlerId });
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to start over");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 w-full max-w-md rounded-2xl p-6 border border-gray-800 shadow-2xl">
                <h2 className="text-2xl font-black text-white mb-2">Start Over {nextOverNumber}</h2>
                <p className="text-gray-500 text-sm mb-6 uppercase font-bold">Confirm Lineup</p>

                <div className="space-y-6">
                    {/* Batsmen Selection */}
                    <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-blue-400 text-xs font-bold uppercase">Batting Pair</span>
                            <button onClick={handleSwap} className="text-gray-500 hover:text-white transition-colors">
                                <ArrowLeftRight size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Striker (On Strike)</label>
                                <select
                                    value={strikerId}
                                    onChange={(e) => setStrikerId(e.target.value)}
                                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 outline-none focus:border-blue-500"
                                >
                                    <option value="">Select Striker</option>
                                    {batsmanList.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Non-Striker</label>
                                <select
                                    value={nonStrikerId}
                                    onChange={(e) => setNonStrikerId(e.target.value)}
                                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 outline-none focus:border-blue-500"
                                >
                                    <option value="">Select Non-Striker</option>
                                    {batsmanList.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bowler Selection */}
                    <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                        <div className="text-red-400 text-xs font-bold uppercase mb-3">Next Bowler</div>
                        <select
                            value={bowlerId}
                            onChange={(e) => setBowlerId(e.target.value)}
                            className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 outline-none focus:border-red-500"
                        >
                            <option value="">Select Bowler</option>
                            {bowlerList.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center space-x-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <span>START OVER</span>}
                    </button>

                    <button onClick={onClose} className="w-full text-gray-500 text-sm font-bold py-2 hover:text-white">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StartOverModal;
