import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Plus, Trophy, History, Lock, Unlock } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

const Navbar = () => {
    const { isScorer, login, logout } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [loading, setLoading] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await login(passcode);
        setLoading(false);
        if (success) {
            toast.success("Scorer Mode Activated");
            setShowLoginModal(false);
            setPasscode('');
        } else {
            toast.error("Invalid Passcode");
        }
    };

    const navLinks = [
        { path: '/', label: 'Home', icon: Home },
        ...(isScorer ? [{ path: '/create', label: 'New Match', icon: Plus }] : []),
        { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
        { path: '/history', label: 'History', icon: History },
    ];

    return (
        <>
            <Toaster position="top-center" theme="dark" />
            <nav
                className={clsx(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
                    scrolled
                        ? "bg-black/80 backdrop-blur-md border-white/10 shadow-lg py-3"
                        : "bg-transparent border-transparent py-5"
                )}
            >
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center transform transition-transform group-hover:rotate-12">
                            <span className="text-white font-black italic text-sm">BX</span>
                        </div>
                        <span className="text-xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">
                            Box<span className="text-blue-500">Cricket</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={clsx(
                                        "px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-2 transition-all",
                                        isActive
                                            ? "bg-white/10 text-white shadow-inner"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Icon size={16} />
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}

                        {/* RBAC Toggle */}
                        <button
                            onClick={() => isScorer ? logout() : setShowLoginModal(true)}
                            className={clsx(
                                "ml-4 px-3 py-2 rounded-full flex items-center space-x-2 transition-all",
                                isScorer
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                            title={isScorer ? "Scorer Active (Click to Logout)" : "Enter Scorer Mode"}
                        >
                            {isScorer ? <Unlock size={16} /> : <Lock size={16} />}
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center space-x-2">
                        <button
                            onClick={() => isScorer ? logout() : setShowLoginModal(true)}
                            className={clsx(
                                "w-10 h-10 flex items-center justify-center rounded-full transition-all",
                                isScorer ? "bg-green-500/20 text-green-400" : "bg-white/5 text-gray-400"
                            )}
                        >
                            {isScorer ? <Unlock size={20} /> : <Lock size={20} />}
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 z-40 bg-black/95 backdrop-blur-xl transition-all duration-300 md:hidden flex flex-col items-center justify-center space-y-8",
                    mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            >
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={clsx(
                                "flex flex-col items-center space-y-2 p-4 rounded-2xl w-40 transition-all",
                                isActive
                                    ? "bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 text-white"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon size={32} />
                            <span className="text-lg font-bold">{link.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-white">Scorer Access</h2>
                            <p className="text-xs text-gray-400 mt-1">Enter passcode to enable editing</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="password"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                placeholder="Passcode"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-white tracking-widest text-lg focus:outline-none focus:border-blue-500 transition-colors"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Unlock'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
