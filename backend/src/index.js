const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authController = require('./controllers/authController');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
});

// Attach io to request for controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
const matchRoutes = require('./routes/matchRoutes');
const statsRoutes = require('./routes/statsRoutes');

app.use('/api/matches', matchRoutes);
app.use('/api/stats', statsRoutes);

// Auth Route
app.post('/api/auth/verify', authController.verifyCode);

// Socket Connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // Example listener for testing
    socket.on('ping', () => {
        socket.emit('pong', { message: 'Server is alive' });
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
