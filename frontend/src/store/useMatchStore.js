import { create } from 'zustand';
import { socket } from '../services/socket';

const useMatchStore = create((set, get) => ({
    activeMatch: null,
    isLoading: false,
    error: null,

    setMatch: (matchData) => set({ activeMatch: matchData }),

    createMatch: async (matchData) => {
        set({ isLoading: true, error: null });
        const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        try {
            const response = await fetch(`${URL}/api/matches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(matchData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create match');

            set({ activeMatch: data, isLoading: false });
            return data;
        } catch (err) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    syncMatchState: (newState) => {
        const current = get().activeMatch;
        if (current && current.id === newState.match_id) {
            set({ activeMatch: { ...current, ...newState } });
        }
    },

    submitBall: async (ballData) => {
        const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        try {
            const response = await fetch(`${URL}/api/matches/${ballData.match_id}/balls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ballData)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Ball submission failed');
            }
            return await response.json();
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    deleteBall: async (matchId, ballId) => {
        const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        try {
            const response = await fetch(`${URL}/api/matches/${matchId}/balls/${ballId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete ball');
            // Optimistic update handled by socket or verify
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    endOver: async (matchId, overNumber, innings) => {
        const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${URL}/api/matches/${matchId}/end-over`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ over_number: overNumber, innings })
        });
        if (!response.ok) throw new Error('Failed to end over');
    },

    startOver: async (matchId, innings, overNumber, bowlerId, strikerId, nonStrikerId) => {
        const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${URL}/api/matches/${matchId}/start-over`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                innings,
                over_number: overNumber,
                bowler_id: bowlerId,
                striker_id: strikerId,
                non_striker_id: nonStrikerId
            })
        });
        if (!response.ok) throw new Error('Failed to start over');
    },

    startInnings: async (matchId, innings) => {
        const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${URL}/api/matches/${matchId}/start-innings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ innings })
        });
    },

    cancelMatch: async (matchId) => {
        const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${URL}/api/matches/${matchId}/cancel`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to cancel match');
        // Optimistic update handled by socket or verify
        const data = await response.json();
        set({ activeMatch: data });
    }
}));

export default useMatchStore;
