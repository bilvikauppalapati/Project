const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middleware/error');
const constants = require('./utils/constants');

/**
 * The Express app: middleware, routes and error handling.
 * Kept separate from server.js (which starts HTTP + socket.io) so it's easy to read.
 */
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploaded images are served as static files, e.g. http://localhost:5001/uploads/abc.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date() }));

// Option lists (species, sizes, tags...) so the frontend's dropdowns always match the backend.
app.get('/api/meta', (req, res) => res.json({ success: true, ...constants }));

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
