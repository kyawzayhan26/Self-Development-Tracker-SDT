const path = require('path');
const express = require('express');

const tasksRoutes = require('./routes/tasks.routes');
const daysRoutes = require('./routes/days.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API
app.use('/api/tasks', tasksRoutes);
app.use('/api/days', daysRoutes);
app.use('/api/day', daysRoutes);       // /api/day/:dateKey
app.use('/api/progress', daysRoutes);  // /api/progress/overall-progress + /api/progress/strikes

// Health check
app.get('/health', (req, res) => res.json({ ok: true, app: 'SDT' }));

// Error handler (last)
app.use(errorHandler);

module.exports = { app };
