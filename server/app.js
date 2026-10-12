const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const animalRoutes = require('./routes/animalRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const checkInRoutes = require('./routes/checkInRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const shelterRoutes = require('./routes/shelterRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const constants = require('./utils/constants');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date() }));

app.get('/api/meta', (req, res) => res.json({ success: true, ...constants }));

app.use('/api/auth', authRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/checkins', checkInRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
