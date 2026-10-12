const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Copy server/.env.example to server/.env and fill it in.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
