import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Loader2, X, Trophy } from 'lucide-react';
import clsx from 'clsx';
import MatchSummaryOverlay from '../components/MatchSummaryOverlay';
import { useAuth } from '../context/AuthContext';

const MatchHistory = () => {
    const { isScorer } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [viewSummaryId, setViewSummaryId] = useState(null); // ID for overlay
    const observer = useRef();

    useEffect(() => {
        const fetchSeasons = async () => {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            try {
                const res = await fetch(`${URL}/api/matches/seasons`);
                if (res.ok) {
                    const data = await res.json();
                    setSeasons(data);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchSeasons();
    }, []);

    const fetchMatches = useCallback(async (currentCursor, seasonId) => {
        if (loading) return;
        setLoading(true);
        try {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            let query = `?limit=10`;
            if (currentCursor) query += `&cursor=${currentCursor}`;
            if (seasonId) query += `&season_id=${seasonId}`;

            const res = await fetch(`${URL}/api/matches${query}`);
            const data = await res.json();

            setMatches(prev => currentCursor ? [...prev, ...data.matches] : data.matches);
            setCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [loading]); // Only depend on loading to prevent race conditions

    // Initial load & Season change
    useEffect(() => {
        setMatches([]);
        setCursor(null);
        setHasMore(true);
        // Reset loading just in case? No, allow fetch
        // We need to call fetchMatches but it's async and depends on state? 
        // Best to just allow the effect to trigger a fresh fetch fn or similar.
        // Actually, just calling it:
        // But fetchMatches has useCallback deps? 
        // Let's just create a distinct function or accept the dependency.
        const load = async () => {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            let query = `?limit=10`;
            if (selectedSeason) query += `&season_id=${selectedSeason}`;

            setLoading(true);
            try {
                const res = await fetch(`${URL}/api/matches${query}`);
                const data = await res.json();
                setMatches(data.matches);
                setCursor(data.nextCursor);
                setHasMore(!!data.nextCursor);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [selectedSeason]);

    // Re-implement loadMore purely
    const loadMore = useCallback(() => {
        if (!loading && hasMore && cursor) {
            fetchMatches(cursor, selectedSeason);
        }
    }, [loading, hasMore, cursor, selectedSeason, fetchMatches]);


    const handleSeasonChange = (e) => {
        setSelectedSeason(e.target.value);
    };

    const lastMatchElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore, loadMore]);

    const handleDelete = async (matchId, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this match completely? This cannot be undone.')) return;

        try {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${URL}/api/matches/${matchId}`, { method: 'DELETE' });
            if (res.ok) {
                setMatches(prev => prev.filter(m => m.id !== matchId));
            } else {
                alert('Failed to delete match');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting match');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Link to="/" className="p-2 -ml-2 text-gray-400 hover:text-white">
                            <ChevronLeft />
                        </Link>
                        <h1 className="text-2xl font-black">Match History</h1>
                    </div>

                    {seasons.length > 0 && (
                        <select
                            value={selectedSeason}
                            onChange={handleSeasonChange}
                            className="bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1 outline-none"
                        >
                            <option value="">All Seasons</option>
                            {seasons.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Active)' : ''}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="space-y-4">
                    {matches.map((match, index) => {
                        const isLast = matches.length === index + 1;
                        return (
                            <div
                                ref={isLast ? lastMatchElementRef : null}
                                key={match.id}
                                onClick={() => {
                                    navigate(`/match/${match.id}`);
                                }}
                                className="block bg-gray-900 border border-gray-800 rounded-xl p-4 transition-all relative group cursor-pointer hover:bg-gray-800 active:scale-[0.98]"
                            >
                                {isScorer && (
                                    <button
                                        onClick={(e) => handleDelete(match.id, e)}
                                        className="absolute top-2 right-2 bg-red-900/20 hover:bg-red-900 text-red-500 hover:text-white p-1.5 rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100"
                                        title="Delete Match"
                                    >
                                        <X size={14} />
                                    </button>
                                )}

                                <div className="block mb-1">
                                    <div className="flex justify-between items-start mb-2 pr-6">
                                        <div className="text-xs text-gray-500 font-mono flex items-center">
                                            <Calendar size={12} className="mr-1" />
                                            {new Date(match.created_at).toLocaleDateString()}
                                        </div>
                                        <span className={clsx("text-xs px-2 py-0.5 rounded font-bold uppercase", match.status === 'completed' ? 'bg-green-900/30 text-green-400' : match.status === 'cancelled' ? 'bg-gray-800 text-gray-500' : 'bg-red-900/30 text-red-500')}>
                                            {match.status}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center mt-2">
                                        <div>
                                            <div className="text-lg font-black text-white">
                                                Match #{match.id.slice(0, 4)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {match.overs || match.overs_team1} Overs Side
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            {match.status === 'completed' && match.result ? (
                                                <div className="text-[10px] text-gray-400">
                                                    {match.result.winner === 'Match Drawn' ? 'Draw' : `Won by ${match.result.margin}`}
                                                </div>
                                            ) : (
                                                <div className="text-xs font-bold text-gray-600">VS</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="text-center p-4 text-gray-500">
                            <Loader2 className="animate-spin mx-auto" />
                        </div>
                    )}

                    {!hasMore && matches.length > 0 && (
                        <div className="text-center p-4 text-gray-600 text-xs uppercase font-bold tracking-widest">
                            End of History
                        </div>
                    )}

                    {!loading && matches.length === 0 && (
                        <div className="text-center p-8 text-gray-500">
                            No matches found.
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Overlay Integration */}
            {viewSummaryId && (
                <MatchSummaryOverlay
                    matchId={viewSummaryId}
                    onClose={() => setViewSummaryId(null)}
                    onHome={() => setViewSummaryId(null)}
                />
            )}
        </div>
    );
};

export default MatchHistory;
