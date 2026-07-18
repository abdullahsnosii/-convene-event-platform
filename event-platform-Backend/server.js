require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const eventRoutes = require('./routes/eventRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true });
});

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});


app.use(errorHandler);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });