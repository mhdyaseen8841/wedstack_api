const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vendors', require('./routes/vendor'));
app.use('/api/timeline', require('./routes/timeline'));
app.use('/api/guests', require('./routes/guest'));
app.use('/api/wedding', require('./routes/wedding'));
app.use('/api/notes', require('./routes/note'));
app.use('/api/expenses', require('./routes/expense'));
app.use('/api/program-details', require('./routes/programDetail'));
app.use('/api/needed-services', require('./routes/neededService'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'WedStack API Server is fully operational' });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI is not defined in environmental variables.');
  console.log('Server is starting up, but database connection will be delayed until set.');
} else {
  // Mask password for safe logging
  const maskedUri = MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
  console.log(`Attempting connection to database: ${maskedUri}`);
  
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('MongoDB Atlas successfully connected.');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
    });
}

app.listen(PORT, () => {
  console.log(`WedStack Server running on port ${PORT}`);
});
