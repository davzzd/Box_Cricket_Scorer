/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#09090b', // Zinc-950
                surface: '#18181b',    // Zinc-900
                primary: '#3b82f6',    // Blue-500 (Cyber Blue)
                secondary: '#a1a1aa',  // Zinc-400
                highlight: '#22c55e',  // Green-500 (Neon Green)
                accent: '#8b5cf6',     // Violet-500
                danger: '#ef4444',     // Red-500
                success: '#10b981',    // Emerald-500
                text: '#f4f4f5',       // Zinc-100
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
