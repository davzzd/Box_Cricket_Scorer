import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import useMatchStore from '../store/useMatchStore';

const EditBallModal = ({ matchId, ball, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);

    // Form State initialized with ball data
    const [wallValue, setWallValue] = useState(ball.wall_value || 0);
    const [runsTaken, setRunsTaken] = useState(ball.runs_taken || 0);
    const [isWide, setIsWide] = useState(ball.is_wide || false);
    const [isNoBall, setIsNoBall] = useState(ball.is_no_ball || false);
    const [isDismissal, setIsDismissal] = useState(ball.is_dismissal || false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${URL}/api/matches/${matchId}/balls/${ball.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wall_value: parseInt(wallValue),
                    runs_taken: parseInt(runsTaken),
                    is_wide: isWide,
                    is_no_ball: isNoBall,
                    is_dismissal: isDismissal,
                    // Keep existing player IDs for now, assuming edit doesn't change WHO did it
                    dismissed_player_id: isDismissal ? ball.striker_id : null,
                    dismissal_type: isDismissal ? 'out' : null
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            onUpdate(data);
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to update ball');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4">
            <div className="bg-gray-900 w-full max-w-sm rounded-xl p-6 relative border border-gray-800 shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <X size={24} />
                </button>

                <h3 className="text-xl font-bold mb-6 text-white border-b border-gray-800 pb-2">Edit Ball #{ball.ball_number}</h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Wall</label>
                            <input
                                type="number"
                                value={wallValue}
                                onChange={(e) => setWallValue(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded p-3 text-white font-mono text-center"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Runs</label>
                            <input
                                type="number"
                                value={runsTaken}
                                onChange={(e) => setRunsTaken(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded p-3 text-white font-mono text-center"
                            />
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex justify-between space-x-2">
                        <button
                            type="button"
                            onClick={() => setIsWide(!isWide)}
                            className={`flex-1 py-3 rounded font-bold text-xs uppercase border ${isWide ? 'bg-yellow-900/50 text-yellow-400 border-yellow-500' : 'bg-gray-800 text-gray-400 border-transparent'}`}
                        >
                            Wide
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNoBall(!isNoBall)}
                            className={`flex-1 py-3 rounded font-bold text-xs uppercase border ${isNoBall ? 'bg-orange-900/50 text-orange-400 border-orange-500' : 'bg-gray-800 text-gray-400 border-transparent'}`}
                        >
                            No Ball
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsDismissal(!isDismissal)}
                            className={`flex-1 py-3 rounded font-bold text-xs uppercase border ${isDismissal ? 'bg-red-900/50 text-red-400 border-red-500' : 'bg-gray-800 text-gray-400 border-transparent'}`}
                        >
                            OUT
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={async () => {
                                if (window.confirm('Delete this ball?')) {
                                    await useMatchStore.getState().deleteBall(matchId, ball.id);
                                    onClose();
                                }
                            }}
                            className="bg-red-900/50 hover:bg-red-900 text-red-400 font-bold py-4 rounded-lg px-6 border border-red-800"
                        >
                            Delete
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center space-x-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            <span>Update Ball</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};




export default EditBallModal;
