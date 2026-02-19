import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isScorer, setIsScorer] = useState(false);

    useEffect(() => {
        const storedAuth = localStorage.getItem('isScorer');
        if (storedAuth === 'true') {
            setIsScorer(true);
        }
    }, []);

    const login = async (code) => {
        try {
            const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${URL}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            if (data.success) {
                setIsScorer(true);
                localStorage.setItem('isScorer', 'true');
                return true;
            }
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const logout = () => {
        setIsScorer(false);
        localStorage.removeItem('isScorer');
    };

    return (
        <AuthContext.Provider value={{ isScorer, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
