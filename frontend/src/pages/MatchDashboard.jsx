import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useMatchStore from '../store/useMatchStore';
import { socket, connectSocket, disconnectSocket } from '../services/socket';
import { ChevronLeft, MoreVertical, X, Users, RefreshCw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import clsx from 'clsx';
import EditBallModal from '../components/EditBallModal';
import { useAuth } from '../context/AuthContext';
import StrikeControl from '../components/StrikeControl';
import AddPlayerModal from '../components/AddPlayerModal';
import MatchSummaryOverlay from '../components/MatchSummaryOverlay';

import StartOverModal from '../components/StartOverModal';
import EditLineupModal from '../components/EditLineupModal';

const MatchDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isScorer } = useAuth();
    const { activeMatch, setMatch, submitBall, endOver, startOver, startInnings } = useMatchStore();
    const [loading, setLoading] = useState(true);
    const [showAddPlayer, setShowAddPlayer] = useState(false);
    const [showSummary, setShowSummary] = useState(true);
    const [showEditLineupModal, setShowEditLineupModal] = useState(false);

    // Layout State
    const [activeTab, setActiveTab] = useState(1); // 1 or 2

    // Editing State
    const [editingBall, setEditingBall] = useState(null);

    // Scoring Form State
    const [wallValue, setWallValue] = useState(0);
    const [runsTaken, setRunsTaken] = useState(0);
    const [isWide, setIsWide] = useState(false);
    const [isNoBall, setIsNoBall] = useState(false);
    const [isDismissal, setIsDismissal] = useState(false);
    const [fielderId, setFielderId] = useState(null);
    const [showFielderModal, setShowFielderModal] = useState(false);
    const [dismissalType, setDismissalType] = useState('Caught');
    const [whoGotOut, setWhoGotOut] = useState(null);

    // Current State (Manual Override)
    const [strikerId, setStrikerId] = useState(null);
    const [nonStrikerId, setNonStrikerId] = useState(null);
    const [bowlerId, setBowlerId] = useState(null);

    // New Over State
    const [showStartOverModal, setShowStartOverModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Initialize state from existing match data if returning
    useEffect(() => {
        if (activeMatch) {
            // Priority 1: Persistent Current State (from DB)
            if (activeMatch.current_striker_id) {
                if (strikerId !== activeMatch.current_striker_id) setStrikerId(activeMatch.current_striker_id);
                if (nonStrikerId !== activeMatch.current_non_striker_id) setNonStrikerId(activeMatch.current_non_striker_id);
                if (bowlerId !== activeMatch.current_bowler_id) setBowlerId(activeMatch.current_bowler_id);
            }
        }
        // Fallback Removed: We now rely on 'current_' columns or manual selection.
        // If we fallback to lastBall, it might override a manual change if lastBall is stale.
    }, [activeMatch]);

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const res = await fetch(`${URL}/api/matches/${id}`);
                const data = await res.json();
                setMatch(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchMatch();

        connectSocket();

        socket.on('matchUpdated', (data) => {
            if (data.match_id === id) {
                fetchMatch();
            }
        });

        return () => {
            socket.off('matchUpdated');
            disconnectSocket();
        };
    }, [id, setMatch]);

    // Check for missing players and show modal
    useEffect(() => {
        if (activeMatch && activeMatch.status === 'live') {
            const hasMissingPlayers = !activeMatch.current_striker_id || !activeMatch.current_non_striker_id || !activeMatch.current_bowler_id;
            if (hasMissingPlayers) {
                setShowStartOverModal(true);
            }
        }
    }, [activeMatch]);

    // Reset whoGotOut when striker changes or modal opens
    useEffect(() => {
        if (strikerId && !whoGotOut) {
            setWhoGotOut(strikerId);
        }
    }, [strikerId]);

    // Auto-switch Innings Tab
    useEffect(() => {
        if (activeMatch?.activeState?.innings) {
            setActiveTab(activeMatch.activeState.innings);
        }
    }, [activeMatch?.activeState?.innings]);

    const handleStrikeUpdate = async (type, value) => {
        // Swap Strike - Immediate Persist
        if (type === 'swap_strike') {
            const payload = {
                striker_id: nonStrikerId,
                non_striker_id: strikerId,
                bowler_id: bowlerId
            };
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                await fetch(`${URL}/api/matches/${id}/current-players`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                toast.success("Strike Swapped");
            } catch (e) {
                toast.error("Failed to swap strike");
            }
        }

        // Manual Override (Edit Mode Save)
        if (type === 'manual_override') {
            try {
                const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                await fetch(`${URL}/api/matches/${id}/current-players`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(value)
                });
                toast.success("Lineup Updated");
            } catch (e) {
                toast.error("Failed to update lineup");
            }
        }

        // Local State Updates (handled by socket usually, but valid for optimistic UI)
        if (type === 'striker_id') setStrikerId(value);
        if (type === 'non_striker_id') setNonStrikerId(value);
        if (type === 'bowler_id') setBowlerId(value);
    };

    const handleBallSubmit = async () => {
        if (!activeMatch) return;
        // Strict Validation: State should theoretically never be null due to Locking
        if (!strikerId || !nonStrikerId || !bowlerId) {
            toast.error("Players not set! Please edit lineup.");
            setShowStartOverModal(true); // Force them to set it
            return;
        }

        const activeInningsNum = activeMatch.activeState ? activeMatch.activeState.innings : 1;

        // Ensure whoGotOut is set if dismissal
        let finalDismissedId = null;
        if (isDismissal) {
            if (!whoGotOut) {
                // Fallback if not set via modal? Should warn?
                // Default to striker if simple format
                finalDismissedId = strikerId;
            } else {
                finalDismissedId = whoGotOut;
            }
        }

        // Helper to map UI dismissal types to backend enum
        const mapDismissalType = (type) => {
            if (!type) return null;
            switch (type) {
                case 'Caught': return 'catch';
                case 'Run Out': return 'run_out';
                case 'Hit Wicket': return 'hit_wicket';
                default: return type.toLowerCase();
            }
        };

        const payload = {
            match_id: activeMatch.id,
            innings: activeInningsNum,
            striker_id: strikerId,
            non_striker_id: nonStrikerId,
            bowler_id: bowlerId,
            wall_value: parseInt(wallValue),
            runs_taken: parseInt(runsTaken),
            is_wide: isWide,
            is_no_ball: isNoBall,
            is_dismissal: isDismissal,
            dismissal_type: isDismissal ? mapDismissalType(dismissalType) : null,
            dismissed_player_id: isDismissal ? finalDismissedId : null,
            fielder_id: isDismissal && fielderId ? fielderId : null
        };

        try {
            await submitBall(payload);
            setWallValue(0);
            setRunsTaken(0);
            setIsWide(false);
            setIsNoBall(false);

            // Reset Dismissal State
            setIsDismissal(false);
            setDismissalType('Caught');
            setFielderId(null);
            setWhoGotOut(strikerId); // Reset to current striker

            toast.success("Ball Recorded!");
        } catch (e) {
            toast.error('Error submitting ball: ' + e.message);
        }
    };

    const handleEndOver = async () => {
        // Use Backend Truth
        const activeState = activeMatch.activeState;
        if (!activeState) {
            toast.error("No active match state found. Try refreshing.");
            return;
        }

        const currentInningsNum = activeState.innings;
        const currentOver = activeState.over_number;
        const oversLimit = currentInningsNum === 1 ? activeMatch.overs_team1 : activeMatch.overs_team2;


        // Validation: Check for legal balls
        const ballsInOver = activeMatch.balls ? activeMatch.balls.filter(b =>
            b.innings === currentInningsNum &&
            b.over_number === currentOver
        ) : [];

        const legalBallCount = ballsInOver.filter(b => !b.is_wide && !b.is_no_ball).length;

        if (legalBallCount < 6) {
            if (!window.confirm(`⚠️ WARNING: This over has only ${legalBallCount} legal balls (Standard is 6). End over anyway?`)) return;
        } else {
            if (!window.confirm("End the over?")) return;
        }

        try {
            await endOver(id, currentOver, currentInningsNum);
            toast.success("Over Ended");

            if (currentOver >= oversLimit) {
                if (currentInningsNum === 1) {
                    if (window.confirm("Innings 1 Completed. Start 2nd Innings?")) {
                        await startInnings(id, 2);
                        toast.success("2nd Innings Started!");
                    }
                } else {
                    if (window.confirm("Match Overs Completed. Finish Match?")) {
                        await handleCompleteMatch();
                    }
                }
            } else {
                setShowStartOverModal(true);
            }
        } catch (e) {
            toast.error("Failed to end over: " + e.message);
        }
    };

    const handleStartNextOver = () => {
        setShowStartOverModal(true);
    };

    const handleStartOverSubmit = async ({ strikerId, nonStrikerId, bowlerId }) => {
        const activeState = activeMatch.activeState;
        if (!activeState) return;

        const currentInningsNum = activeState.innings;
        const currentOver = activeState.over_number; // This is the COMPLETED over number

        try {
            await startOver(
                id,
                currentInningsNum,
                currentOver + 1,
                bowlerId,
                strikerId,
                nonStrikerId
            );
            setBowlerId(bowlerId);
            setStrikerId(strikerId);
            setNonStrikerId(nonStrikerId);
            setShowStartOverModal(false);
            toast.success(`Over ${currentOver + 1} Started`);
        } catch (e) {
            toast.error("Failed to start over: " + e.message);
        }
    };

    const handleCompleteMatch = async () => {
        if (!window.confirm("Are you sure you want to complete this match?")) return;
        try {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            await fetch(`${URL}/api/matches/${id}/complete`, { method: 'POST' });

            // Force re-fetch to update status immediately
            const res = await fetch(`${URL}/api/matches/${id}`);
            const data = await res.json();
            setMatch(data);

            toast.success("Match Completed!");
        } catch (e) {
            toast.error("Failed to complete");
        }
    };

    const handleCancelMatch = async () => {
        if (!window.confirm("Are you sure you want to CANCEL this match? This cannot be undone.")) return;
        try {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            await fetch(`${URL}/api/matches/${id}/cancel`, { method: 'POST' });
            toast.success("Match Cancelled");
            // Redirect or update state? Socket will update state to cancelled.
        } catch (e) {
            toast.error("Failed to cancel");
        }
    };

    // Layout: Innings Tabs for Ball History
    const getTabBalls = () => {
        if (!activeMatch?.balls) return [];
        return activeMatch.balls.filter(b => b.innings === activeTab);
    };

    const getGroupedOvers = () => {
        const balls = getTabBalls();
        const groups = {};
        balls.forEach(b => {
            if (!groups[b.over_number]) groups[b.over_number] = [];
            groups[b.over_number].push(b);
        });
        return Object.keys(groups).sort((a, b) => b - a).map(k => {
            const overBalls = groups[k];

            // Resolve Bowler
            const bowlerId = overBalls[0]?.bowler_id;
            const bowler = activeMatch.players ? activeMatch.players.find(p => p.id === bowlerId) : null;

            // Resolve Batting Pair (unique strikers/non-strikers in this over)
            const uniqueBatters = new Set();
            overBalls.forEach(b => {
                if (b.striker_id) uniqueBatters.add(b.striker_id);
                if (b.non_striker_id) uniqueBatters.add(b.non_striker_id);
            });

            const batterPair = Array.from(uniqueBatters).map(id => {
                const p = activeMatch.players?.find(pl => pl.id === id);
                return p ? p.name : null;
            }).filter(Boolean).join(' & ');

            return {
                overNumber: k,
                balls: overBalls,
                bowlerName: bowler ? bowler.name : 'Unknown',
                batterPair
            };
        });
    };

    if (loading) return <div className="text-white text-center p-10">Loading Match...</div>;
    // ... (rest of early returns) - Wait, I shouldn't replace lines 357-500.
    // I need to target the getGroupedOvers function and the rendering part specifically.
    // getGroupedOvers is around line 344.
    // Rendering is around line 501.
    // They are far apart. I should make TWO replacements.
    // Wait, the tool only allows ONE contiguous block or I use multi_replace.
    // I will use multi_replace.
    // But first let me check if I can do it in one if I include the intermediate code.
    // Lines 344 to 532 is ~190 lines. That's fine.
    // But including 190 lines just to change 2 small parts is inefficient and risky.
    // I will use `multi_replace_file_content`.

    // Changing plan to use multi_replace_file_content.
    // Chunk 1: getGroupedOvers implementation.
    // Chunk 2: Rendering logic.

    // Wait, `multi_replace_file_content` is available.
    // Let's restart the tool call with `multi_replace_file_content`.

    if (loading) return <div className="text-white text-center p-10">Loading Match...</div>;
    if (!activeMatch) return <div className="text-white text-center p-10">Match not found</div>;

    const activeInningsNum = activeMatch.activeState ? activeMatch.activeState.innings : 1;
    const currentInnings = activeInningsNum === 1 ? activeMatch.innings1 : activeMatch.innings2;
    const battingTeamIsTeam1 = (activeMatch.toss_winner_team === 'A' && activeMatch.toss_decision === 'bat' && activeInningsNum === 1) ||
        (activeMatch.toss_winner_team === 'B' && activeMatch.toss_decision === 'bowl' && activeInningsNum === 1) ||
        (activeMatch.toss_winner_team === 'B' && activeMatch.toss_decision === 'bat' && activeInningsNum === 2) ||
        (activeMatch.toss_winner_team === 'A' && activeMatch.toss_decision === 'bowl' && activeInningsNum === 2);

    const allPlayers = activeMatch.players || [];
    const battingTeamPlayers = allPlayers.filter(p => p.team === (battingTeamIsTeam1 ? 'A' : 'B'));
    const bowlingTeamPlayers = allPlayers.filter(p => p.team === (battingTeamIsTeam1 ? 'B' : 'A'));


    return (
        <div className="pb-48 bg-background min-h-screen text-text font-sans">
            <Toaster position="top-center" toastOptions={{
                style: {
                    background: '#1A1A1A',
                    color: '#E5E5E5',
                    borderColor: '#333'
                },
            }} />
            {/* Header */}
            {/* Header - Floating Glass Card */}
            <div className="mx-2 mt-2 bg-surface/30 backdrop-blur-xl p-3 border border-white/10 rounded-3xl relative z-10 shadow-2xl ring-1 ring-white/5">
                <div className="flex justify-between items-center mb-4 relative">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${activeMatch.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {activeMatch.status}
                    </span>

                    {/* Menu Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <MoreVertical size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                                <div className="absolute right-0 top-8 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="p-1 space-y-0.5">
                                        {isScorer && (
                                            <>
                                                <button
                                                    onClick={() => { setShowPlayersModal(true); setShowMenu(false); }}
                                                    className="w-full text-left px-3 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg flex items-center transition-colors"
                                                >
                                                    <Users size={14} className="mr-2 text-blue-400" /> Manage Players
                                                </button>

                                                <button
                                                    onClick={() => { setShowEditLineupModal(true); setShowMenu(false); }}
                                                    className="w-full text-left px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center transition-colors"
                                                >
                                                    <RefreshCw size={14} className="mr-2 text-yellow-400" /> Edit Current Lineup
                                                </button>
                                            </>
                                        )}

                                        {activeMatch.status !== 'completed' && activeMatch.status !== 'cancelled' && isScorer && (
                                            <>
                                                <div className="h-px bg-white/10 my-1 mx-2" />
                                                <button
                                                    onClick={() => { handleCompleteMatch(); setShowMenu(false); }}
                                                    className="w-full text-left px-3 py-2 text-xs font-bold text-green-400 hover:bg-green-500/10 rounded-lg transition-colors flex items-center"
                                                >
                                                    <span className="w-3.5 h-3.5 border-2 border-green-500 rounded-full mr-2"></span> Complete Match
                                                </button>
                                                <button
                                                    onClick={() => { handleCancelMatch(); setShowMenu(false); }}
                                                    className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center"
                                                >
                                                    <X size={14} className="mr-2" /> Cancel Match
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-start gap-2">
                    {/* Left: Score & Overview */}
                    <div className="flex-1">
                        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                            {currentInnings && currentInnings.innings === 1 ? '1st Innings' : '2nd Innings'}
                        </h2>
                        <h1 className="text-6xl font-black tracking-tighter text-white leading-none mb-1">
                            {currentInnings ? currentInnings.score : 0}
                        </h1>
                        <div className="text-xs text-gray-400 font-mono flex items-center space-x-2 mb-2">
                            <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] border border-white/5">Ov: <span className="text-white font-bold">{currentInnings ? currentInnings.overs : 0}</span></span>
                            {activeInningsNum === 2 && <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] border border-white/5">Target: <span className="text-white font-bold">{activeMatch.innings1.score + 1}</span></span>}
                        </div>
                    </div>

                    {/* Right: Strike Control & Current Ball */}
                    <div className="flex-1 max-w-[280px] flex flex-col items-end">
                        <StrikeControl
                            players={activeMatch.players || []}
                            strikerId={strikerId}
                            nonStrikerId={nonStrikerId}
                            bowlerId={bowlerId}
                            onUpdate={handleStrikeUpdate}
                            battingTeamPlayers={battingTeamPlayers}
                            bowlingTeamPlayers={bowlingTeamPlayers}
                            team1Batting={battingTeamIsTeam1}
                            minimal={true}
                            balls={activeMatch.balls || []}
                            currentInningsNum={activeInningsNum}
                        />

                    </div>
                </div>
            </div>

            {/* Innings Tabs - Detached & Rounded */}
            <div className="px-2 mb-2 mt-2">
                <div className="flex bg-white/5 rounded-2xl p-1 space-x-1 w-full border border-white/5 mx-auto">
                    <button
                        onClick={() => setActiveTab(1)}
                        className={clsx("flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all", activeTab === 1 ? "bg-white/10 text-white shadow-inner ring-1 ring-white/5" : "text-secondary hover:text-text")}
                    >
                        Innings 1
                    </button>
                    <button
                        onClick={() => setActiveTab(2)}
                        className={clsx("flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all", activeTab === 2 ? "bg-white/10 text-white shadow-inner ring-1 ring-white/5" : "text-secondary hover:text-text")}
                    >
                        Innings 2
                    </button>
                </div>
            </div>

            {/* Ball History */}
            <div className="px-4 pb-48">
                <h3 className="text-secondary text-[10px] font-bold uppercase tracking-widest mb-3 mt-4 opacity-70">
                    Innings {activeTab} Ball History
                </h3>
                <div className="space-y-2">
                    {getGroupedOvers().map((over) => (
                        <div key={over.overNumber} className="bg-surface rounded-lg p-3 flex items-start border border-white/5">
                            <div className="flex flex-col items-center mr-4 pt-1 w-8">
                                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Ov</span>
                                <span className="text-xl font-black text-text">{over.overNumber}</span>
                            </div>
                            <div className="flex flex-col flex-1">
                                {over.bowlerName && (
                                    <div className="flex flex-wrap items-center mb-1 gap-2">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center">
                                            <span className="w-1 h-1 bg-blue-500 rounded-full mr-1.5"></span>
                                            {over.bowlerName}
                                        </div>
                                        {over.batterPair && (
                                            <div className="text-[9px] font-medium text-gray-600 uppercase flex items-center">
                                                <span className="text-gray-700 mx-1">vs</span>
                                                {over.batterPair}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {over.balls.map((b) => {
                                        const runComponent = b.runs_taken > 0 ? (b.wall_value + b.runs_taken) : 0;
                                        const total = runComponent + (b.is_wide || b.is_no_ball ? 2 : 0) - (b.is_dismissal ? 5 : 0);
                                        const isWicket = b.is_dismissal;
                                        const isExtra = b.is_wide || b.is_no_ball;

                                        return (
                                            <button
                                                key={b.id}
                                                onClick={() => isScorer && setEditingBall(b)}
                                                className={clsx(
                                                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all active:scale-90 shadow-sm",
                                                    isWicket ? "bg-danger text-white border-danger" :
                                                        isExtra ? "bg-secondary text-white border-secondary" :
                                                            total >= 4 ? "bg-white/10 text-primary border-primary" :
                                                                "bg-background border-white/10 text-text hover:bg-white/5"
                                                )}
                                            >
                                                {isWicket ? 'W' : (isExtra ? (b.is_wide ? 'wd' : 'nb') : total)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {getGroupedOvers().length === 0 && (
                        <div className="text-secondary text-sm italic text-center py-8">No balls recorded in Innings {activeTab}.</div>
                    )}
                </div>
            </div>

            {/* Floating Glass Settings Panel Container */}
            <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
                {/* Action Bar (End Over - Floating Above) */}
                {activeMatch.status !== 'completed' && isScorer && (
                    <div className="flex justify-end mb-2 mr-1">
                        <button
                            onClick={handleEndOver}
                            className="bg-red-500 hover:bg-red-600 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-500/30 flex items-center space-x-2 transition-all active:scale-95"
                        >
                            <span>End Over</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        </button>
                    </div>
                )}

                {/* Glass Panel - Only show if match is NOT completed or cancelled AND user is a Scorer */}
                {activeMatch.status !== 'completed' && activeMatch.status !== 'cancelled' && isScorer && (
                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/5 p-4 space-y-3">

                        {/* Row 1: Wall Scores + Runs Ran */}
                        <div className="grid grid-cols-[1.8fr_1fr] gap-3 items-center">
                            {/* Wall Scores */}
                            <div className="bg-white/5 rounded-2xl p-1.5 grid grid-cols-6 gap-1">
                                {[0, 1, 2, 3, 4, 6].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setWallValue(v)}
                                        className={clsx(
                                            "h-10 rounded-xl font-black text-lg transition-all active:scale-90 flex items-center justify-center",
                                            wallValue === v ? "bg-white text-black shadow-lg scale-105" : "text-gray-400 hover:text-white hover:bg-white/10"
                                        )}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>

                            {/* Runs Ran */}
                            <div className="flex h-12 bg-white/5 rounded-2xl overflow-hidden border border-white/5 relative">
                                <span className="absolute top-[2px] left-0 right-0 text-center text-[8px] text-gray-500 uppercase font-bold tracking-wider pointer-events-none">Runs</span>
                                <button onClick={() => setRunsTaken(Math.max(0, runsTaken - 1))} className="px-3 hover:bg-white/10 text-gray-400 hover:text-white text-xl font-bold border-r border-white/5 active:bg-white/20 pt-2">-</button>
                                <div className="flex-1 flex items-end justify-center font-mono text-2xl text-white font-bold pb-1 pt-2 leading-none">
                                    {runsTaken}
                                </div>
                                <button onClick={() => setRunsTaken(runsTaken + 1)} className="px-3 hover:bg-white/10 text-gray-400 hover:text-white text-xl font-bold border-l border-white/5 active:bg-white/20 pt-2">+</button>
                            </div>
                        </div>

                        {/* Row 2: Extras | Out | Record Button */}
                        <div className="grid grid-cols-[1fr_1fr_2fr] gap-3 h-16">
                            {/* WD/NB */}
                            <button
                                onClick={() => {
                                    if (isWide || isNoBall) {
                                        setIsWide(false);
                                        setIsNoBall(false);
                                    } else {
                                        setIsWide(true);
                                        setIsNoBall(false);
                                    }
                                }}
                                className={clsx(
                                    "rounded-2xl font-bold text-xs uppercase border transition-all active:scale-95 flex flex-col items-center justify-center leading-tight",
                                    (isWide || isNoBall) ? "bg-orange-500/20 text-orange-400 border-orange-500/50" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                <span className="text-sm">WD</span>
                                <span className="opacity-60 text-[10px]">/ NB</span>
                            </button>

                            {/* OUT */}
                            <button
                                onClick={() => {
                                    setIsDismissal(!isDismissal);
                                    if (!isDismissal) setShowFielderModal(true);
                                }}
                                className={clsx(
                                    "rounded-2xl font-bold text-sm uppercase border transition-all active:scale-95 flex items-center justify-center",
                                    isDismissal ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                OUT
                            </button>

                            {/* RECORD BUTTON */}
                            <button
                                onClick={handleBallSubmit}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-between px-5 border-t border-white/20"
                            >
                                <span className="text-xs uppercase tracking-widest opacity-80 font-bold">Record</span>
                                <span className="bg-black/20 px-3 py-1.5 rounded-xl text-2xl font-mono min-w-[3rem] text-center backdrop-blur-sm shadow-inner">
                                    {
                                        ((runsTaken > 0 ? (wallValue + runsTaken) : 0) +
                                            (isWide || isNoBall ? 2 : 0) -
                                            (isDismissal ? 5 : 0))
                                    }
                                </span>
                            </button>
                        </div>

                        {/* Fielder Display (Overlay on top of controls if active) */}
                        {isDismissal && (
                            <div className="animate-in slide-in-from-bottom-2 fade-in mt-1">
                                {fielderId ? (
                                    <button onClick={() => setShowFielderModal(true)} className="w-full bg-red-500/10 border border-red-500/20 p-2 rounded-xl flex justify-between items-center h-10">
                                        <span className="text-red-400 text-xs font-bold uppercase truncate px-2">Catch: <span className="text-white">{activeMatch.players.find(p => p.id == fielderId)?.name}</span></span>
                                        <span className="text-red-400/70 text-[10px] underline shrink-0 px-2">Edit</span>
                                    </button>
                                ) : (
                                    <button onClick={() => setShowFielderModal(true)} className="w-full bg-white/5 border border-white/10 p-2 rounded-xl flex justify-between items-center h-10">
                                        <span className="text-gray-400 text-xs font-bold uppercase px-2">Dismissal Details Required</span>
                                        <span className="text-blue-400 text-[10px] underline shrink-0 px-2">Select</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Enhanced Dismissal Modal */}
            {showFielderModal && (
                <div className="fixed inset-0 bg-black/95 z-[60] flex items-end animate-in slide-in-from-bottom-10 fade-in duration-200">
                    <div className="w-full bg-surface rounded-t-3xl p-6 border-t border-white/10 max-h-[90vh] overflow-y-auto pb-12">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white tracking-tight">Dismissal Details</h3>
                            <button onClick={() => setShowFielderModal(false)} className="bg-white/5 p-2 rounded-full text-white hover:bg-white/10">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Dismissal Type Selector */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-3">Dismissal Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Caught', 'Bowled', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setDismissalType(type);
                                                // Reset others if not run out
                                                if (type !== 'Run Out') {
                                                    setWhoGotOut(strikerId); // Default to striker
                                                }
                                            }}
                                            className={clsx(
                                                "px-4 py-3 rounded-xl font-bold text-sm transition-all border",
                                                dismissalType === type
                                                    ? "bg-danger text-white border-danger shadow-lg shadow-danger/20"
                                                    : "bg-background text-gray-400 border-white/5 hover:bg-white/5"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Who Got Out? (Only relevant for Run Out usually, but allows manual override) */}
                            {dismissalType === 'Run Out' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-3">Who is Out? (Run Out)</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setWhoGotOut(strikerId)}
                                            className={clsx("p-4 rounded-xl border font-bold text-left", whoGotOut === strikerId ? "bg-danger/20 border-danger text-white" : "bg-background border-white/5 text-gray-400")}
                                        >
                                            <div className="text-[10px] uppercase opacity-70 mb-1">Striker</div>
                                            <div className="truncate">{activeMatch.players.find(p => p.id === strikerId)?.name}</div>
                                        </button>
                                        <button
                                            onClick={() => setWhoGotOut(nonStrikerId)}
                                            className={clsx("p-4 rounded-xl border font-bold text-left", whoGotOut === nonStrikerId ? "bg-danger/20 border-danger text-white" : "bg-background border-white/5 text-gray-400")}
                                        >
                                            <div className="text-[10px] uppercase opacity-70 mb-1">Non-Striker</div>
                                            <div className="truncate">{activeMatch.players.find(p => p.id === nonStrikerId)?.name}</div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Fielder / Thrower Selection */}
                            {(dismissalType === 'Caught' || dismissalType === 'Run Out' || dismissalType === 'Stumped') && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-3">
                                        {dismissalType === 'Run Out' ? 'Who Threw?' : 'Fielder'}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {activeMatch.players && activeMatch.players.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setFielderId(p.id)}
                                                className={clsx(
                                                    "p-3 rounded-lg font-bold text-xs truncate transition-all active:scale-95 border",
                                                    fielderId === p.id
                                                        ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40"
                                                        : "bg-background text-gray-400 border-white/5 hover:bg-white/5"
                                                )}
                                            >
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowFielderModal(false)}
                                className="w-full bg-danger text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-danger/20 mt-4 uppercase tracking-widest"
                            >
                                Confirm Dismissal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* StartOverModal (Handles both New Over and Initial Setup) */}
            <StartOverModal
                isOpen={showStartOverModal}
                onClose={() => {
                    // Only allow closing if players are set, otherwise keep it open? 
                    // For better UX, we can let them close but it will pop up again on refresh or interaction.
                    // But if it's initial setup, we might want to force it?
                    // Let's allow close for now to avoid being stuck.
                    setShowStartOverModal(false);
                }}
                onStart={async (data) => {
                    const isSetupMode = activeMatch && activeMatch.activeState && activeMatch.activeState.status === 'active';

                    if (isSetupMode) {
                        try {
                            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                            await fetch(`${URL}/api/matches/${id}/current-players`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    striker_id: data.strikerId,
                                    non_striker_id: data.nonStrikerId,
                                    bowler_id: data.bowlerId
                                })
                            });
                            // Update local state quickly
                            setStrikerId(data.strikerId);
                            setNonStrikerId(data.nonStrikerId);
                            setBowlerId(data.bowlerId);

                            setShowStartOverModal(false);
                            toast.success("Lineup Set!");
                        } catch (e) {
                            toast.error("Failed to set players");
                        }
                    } else {
                        // Standard Next Over
                        await handleStartOverSubmit(data);
                    }
                }}
                players={activeMatch.players || []}
                battingTeamPlayers={battingTeamPlayers}
                bowlingTeamPlayers={bowlingTeamPlayers}
                lastStrikerId={strikerId}
                lastNonStrikerId={nonStrikerId}
                nextOverNumber={
                    (activeMatch.activeState && activeMatch.activeState.status === 'active')
                        ? activeMatch.activeState.over_number  // If setting up current active over (e.g. Over 1)
                        : ((activeMatch.activeState ? activeMatch.activeState.over_number : 0) + 1) // If starting next over
                }
            />

            {/* Match Summary Overlay */}
            {activeMatch.status === 'completed' && showSummary && (
                <MatchSummaryOverlay
                    matchId={id}
                    onClose={() => setShowSummary(false)}
                    onHome={() => navigate('/')}
                />
            )}

            {showEditLineupModal && (
                <EditLineupModal
                    isOpen={showEditLineupModal}
                    onClose={() => setShowEditLineupModal(false)}
                    onSave={(data) => handleStrikeUpdate('manual_override', data)}
                    players={activeMatch.players || []}
                    battingTeamPlayers={battingTeamPlayers}
                    bowlingTeamPlayers={bowlingTeamPlayers}
                    currentStrikerId={strikerId}
                    currentNonStrikerId={nonStrikerId}
                    currentBowlerId={bowlerId}
                />
            )}

            {showAddPlayer && (
                <AddPlayerModal
                    matchId={id}
                    onPlayerAdded={() => {
                        const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                        fetch(`${URL}/api/matches/${id}`)
                            .then(r => r.json())
                            .then(d => setMatch(d));
                    }}
                    onClose={() => setShowAddPlayer(false)}
                />
            )}

            {editingBall && (
                <EditBallModal
                    matchId={id}
                    ball={editingBall}
                    onClose={() => setEditingBall(null)}
                    onUpdate={(updatedBall) => {
                        // Optimistic update handled by socket or fetch
                    }}
                />
            )}
        </div>
    );
};

export default MatchDashboard;


