# 🏏 Box Cricket Scorer

A real-time, socket-based cricket scoring application designed for Box Cricket tournaments.
Built with a modern UI, player management, and live match tracking.

## Features
*   ✨ **Real-time Scoring:** Instant updates for all connected clients via Socket.io.
*   🔒 **Role-Based Access Control (RBAC):** Spectator (Read-only) vs Scorer (Admin) modes.
*   📊 **Comprehensive Dashboard:** Live match stats, current partnership, and ball-by-ball commentary.
*   ⏪ **Undo/Redo:** Fix scoring mistakes easily.
*   🏆 **Leaderboard:** Track top run-scorers and wicket-takers.
*   📱 **Responsive Design:** Works perfectly on mobile and desktop.

## Tech Stack
*   **Frontend:** React, Vite, TailwindCSS, Lucide Icons, Shadcn UI components.
*   **Backend:** Node.js, Express, Socket.io.
*   **Database:** PostgreSQL (with Neon/Supabase support).

## Setup
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/davzzd/Box_Cricket_Scorer.git
    cd Box_Cricket_Scorer
    ```

2.  **Install Dependencies:**
    ```bash
    # Install backend dependencies
    cd backend
    npm install

    # Install frontend dependencies (in a new terminal)
    cd ../frontend
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in `backend/`:
    ```env
    PORT=5000
    DATABASE_URL=postgresql://user:password@host/dbname
    ADMIN_PASSCODE=2004
    CORS_ORIGIN=http://localhost:5173
    ```

4.  **Initialize Database:**
    ```bash
    cd backend
    npm run init-db
    ```

5.  **Run Development Servers:**
    ```bash
    # Backend
    cd backend
    npm start

    # Frontend
    cd frontend
    npm run dev
    ```

## Deployment
*   **Frontend:** Deploy to Vercel.
*   **Backend:** Deploy to Render (Web Service).
*   **Database:** Use Neon (PostgreSQL).
