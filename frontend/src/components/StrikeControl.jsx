import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, ChevronDown, Pencil, Save, X } from 'lucide-react';
import clsx from 'clsx';

const StrikeControl = ({ players, strikerId, nonStrikerId, bowlerId, onUpdate, team1Batting, battingTeamPlayers, bowlingTeamPlayers, minimal = false }) => {
    const [isEditing, setIsEditing] = useState(false);

    // Internal state for editing before save
    const [editStriker, setEditStriker] = useState(strikerId);
    const [editNonStriker, setEditNonStriker] = useState(nonStrikerId);
    const [editBowler, setEditBowler] = useState(bowlerId);

    // Sync when props change (if not editing)
    useEffect(() => {
        if (!isEditing) {
            setEditStriker(strikerId);
            setEditNonStriker(nonStrikerId);
            setEditBowler(bowlerId);
        }
    }, [strikerId, nonStrikerId, bowlerId, isEditing]);

    // Determine batting/bowling team
    let battingPlayers = battingTeamPlayers;
    let bowlingPlayers = bowlingTeamPlayers;

    if (!battingPlayers || !bowlingPlayers) {
        const teamA = players.filter(p => p.team === 'A');
        const teamB = players.filter(p => p.team === 'B');
        battingPlayers = team1Batting ? teamA : teamB;
        bowlingPlayers = team1Batting ? teamB : teamA;
    }

    const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Select';

    const handleSave = () => {
        onUpdate('manual_override', {
            striker_id: editStriker,
            non_striker_id: editNonStriker,
            bowler_id: editBowler
        });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-surface p-4 rounded-xl border border-white/10 shadow-lg mb-4 ring-1 ring-primary/50 relative z-50">
                <div className="absolute top-2 right-2 flex space-x-2">
                    <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400">
                        <X size={16} />
                    </button>
                    <button onClick={handleSave} className="p-1.5 rounded-full bg-primary hover:bg-primary/80 text-white">
                        <Save size={16} />
                    </button>
                </div>
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-4">Manual Override Mode</h3>

                {/* Edit Bowler */}
                <div className="mb-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Bowler</label>
                    <div className="relative">
                        <select
                            value={editBowler || ''}
                            onChange={(e) => setEditBowler(e.target.value)}
                            className="w-full bg-background border border-white/10 rounded-lg py-3 px-3 text-sm font-bold text-white outline-none focus:border-primary appearance-none"
                        >
                            <option value="">Select Bowler...</option>
                            {bowlingPlayers.map(p => (
                                <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                {/* Edit Batters */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Striker</label>
                        <div className="relative">
                            <select
                                value={editStriker || ''}
                                onChange={(e) => setEditStriker(e.target.value)}
                                className="w-full bg-background border border-white/10 rounded-lg py-3 px-3 text-sm font-bold text-white outline-none focus:border-primary appearance-none"
                            >
                                <option value="">Select...</option>
                                {battingPlayers.map(p => (
                                    <option key={p.id} value={p.id} disabled={p.id === editNonStriker} className="text-black">{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Non-Striker</label>
                        <div className="relative">
                            <select
                                value={editNonStriker || ''}
                                onChange={(e) => setEditNonStriker(e.target.value)}
                                className="w-full bg-background border border-white/10 rounded-lg py-3 px-3 text-sm font-bold text-white outline-none focus:border-primary appearance-none"
                            >
                                <option value="">Select...</option>
                                {battingPlayers.map(p => (
                                    <option key={p.id} value={p.id} disabled={p.id === editStriker} className="text-black">{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <button onClick={handleSave} className="w-full mt-4 bg-primary text-white font-bold py-3 rounded-lg text-xs uppercase tracking-wider">
                    Save Changes
                </button>
            </div>
        );
    }

    // LOCKED VIEW (Default / Minimal)
    if (minimal) {
        return (
            <div className="relative w-full group">
                {/* Minimal Edit Trigger */}
                <button
                    onClick={() => setIsEditing(true)}
                    className="absolute -right-2 -top-2 p-1.5 text-white/10 hover:text-white transition-colors z-30"
                >
                    <Pencil size={10} />
                </button>

                {/* Bowler - Centered Top */}
                <div className="text-center mb-1">
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-widest leading-none mb-0.5">Bowler</div>
                    <div className="text-lg font-black text-white leading-none tracking-tight">
                        {getPlayerName(bowlerId)}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/5 w-full my-2"></div>

                {/* Batters Row */}
                <div className="flex items-center justify-between relative">
                    {/* Striker */}
                    <div className="flex-1 text-left">
                        <div className="text-[9px] uppercase font-bold text-blue-400 tracking-widest leading-none mb-0.5 flex items-center">
                            Striker <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 animate-pulse"></span>
                        </div>
                        <div className="text-sm font-black text-white leading-tight truncate pr-1">
                            {getPlayerName(strikerId)}
                        </div>
                    </div>

                    {/* Swap Button - Absolute Center */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <button
                            onClick={() => onUpdate('swap_strike', null)}
                            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white border border-white/5 flex items-center justify-center transition-all active:scale-95 backdrop-blur-md"
                            title="Swap Ends"
                        >
                            <ArrowRightLeft size={12} />
                        </button>
                    </div>

                    {/* Non-Striker */}
                    <div className="flex-1 text-right">
                        <div className="text-[9px] uppercase font-bold text-gray-500 tracking-widest leading-none mb-0.5">Non-Striker</div>
                        <div className="text-sm font-bold text-white/70 leading-tight truncate pl-1">
                            {getPlayerName(nonStrikerId)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null; // Fallback if not minimal (not used currently)
};

export default StrikeControl;
