import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddPlayerModal = ({ matchId, onPlayerAdded, onClose }) => {
    const [name, setName] = useState('');
    const [team, setTeam] = useState('A'); // A or B
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${URL}/api/matches/${matchId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, team })
            });
            const data = await res.json();
            onPlayerAdded(data);
            setName('');
        } catch (e) {
            console.error(e);
            alert('Failed to add player');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-gray-900 w-full max-w-sm rounded-xl p-6 relative border border-gray-800">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <X size={24} />
                </button>

                <h3 className="text-xl font-bold mb-4 text-white">Add Player</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Player Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none"
                            placeholder="e.g. Kohli"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Team</label>
                        <div className="flex space-x-2">
                            <button
                                type="button"
                                onClick={() => setTeam('A')}
                                className={`flex-1 py-3 rounded font-bold ${team === 'A' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                            >
                                Team A
                            </button>
                            <button
                                type="button"
                                onClick={() => setTeam('B')}
                                className={`flex-1 py-3 rounded font-bold ${team === 'B' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                            >
                                Team B
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-lg mt-2"
                    >
                        {loading ? 'Adding...' : 'Add Player'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddPlayerModal;
