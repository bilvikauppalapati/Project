require('dotenv').config({ quiet: true });
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');

const PORT = process.env.PORT || 5001;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`PawShare API + socket.io running at http://localhost:${PORT}`);
  });
}

start();
