require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const pool = require('./db');
const { sanitizeInput } = require('./src/middleware');

const app = express();
const server = http.createServer(app);

// Port and host configuration (defined early for use throughout the file)
const PORT = parseInt(process.env.PORT, 10) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS must be first to handle preflight OPTIONS before other middleware
const allowedOrigins = [
  FRONTEND_URL,
  CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.replace(/\/+$/, '')))) {
      cb(null, true);
    } else {
      cb(null, true);
    }
  },
  credentials: true,
}));

// Security middleware
app.use(helmet());
app.use(hpp());

// Response compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// Custom XSS sanitization (replaces deprecated xss-clean)
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body = sanitizeInput(req.body);
  }
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 500 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      FRONTEND_URL,
      CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:3001',
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowUpgrades: true,
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach pool and io to app.locals
app.locals.pool = pool;
app.locals.io = io;

// Socket.IO connection handling
io.engine.on('connection_error', (err) => {
  console.error('Socket.IO engine connection_error:', err.message);
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinUserRoom', (userId) => {
    try {
      if (userId) socket.join(`user_${userId}`);
    } catch (err) {
      console.error(`joinUserRoom error (${socket.id}):`, err.message);
    }
  });

  socket.on('leaveUserRoom', (userId) => {
    try {
      if (userId) socket.leave(`user_${userId}`);
    } catch (err) {
      console.error(`leaveUserRoom error (${socket.id}):`, err.message);
    }
  });

  socket.on('joinTripRoom', (tripId) => {
    try {
      if (tripId) socket.join(`trip_${tripId}`);
    } catch (err) {
      console.error(`joinTripRoom error (${socket.id}):`, err.message);
    }
  });

  socket.on('joinAvailableTrips', () => {
    try {
      socket.join('available_trips');
    } catch (err) {
      console.error(`joinAvailableTrips error (${socket.id}):`, err.message);
    }
  });

  socket.on('leaveAvailableTrips', () => {
    try {
      socket.leave('available_trips');
    } catch (err) {
      console.error(`leaveAvailableTrips error (${socket.id}):`, err.message);
    }
  });

  socket.on('joinAdminRoom', () => {
    try {
      socket.join('admin_trips');
    } catch (err) {
      console.error(`joinAdminRoom error (${socket.id}):`, err.message);
    }
  });

  socket.on('leaveAdminRoom', () => {
    try {
      socket.leave('admin_trips');
    } catch (err) {
      console.error(`leaveAdminRoom error (${socket.id}):`, err.message);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} (reason: ${reason})`);
  });

  socket.on('connect_error', (err) => {
    console.error(`Socket connect_error (${socket.id}):`, err.message);
  });
});

// Routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const vehicleRoutes = require('./src/routes/vehicles');
const driverRoutes = require('./src/routes/drivers');
const mechanicRoutes = require('./src/routes/mechanics');
const tripRoutes = require('./src/routes/trips');
const maintenanceRoutes = require('./src/routes/maintenance');
const inventoryRoutes = require('./src/routes/inventory');
const notificationRoutes = require('./src/routes/notifications');
const reportRoutes = require('./src/routes/reports');
const roleRoutes = require('./src/routes/roles');
const fuelRoutes = require('./src/routes/fuel');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/fuel', fuelRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Use PORT and HOST defined at top of file
server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Fleet Management API server running`);
  console.log(`   Host: ${HOST}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'fleet_management'} @ ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   JWT: configured`);
  console.log(`   Socket.IO: initialized`);
  console.log(`   ⏱  Started at: ${new Date().toISOString()}\n`);
});

// Handle port conflicts and other server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   Another instance may already be running.`);
    console.error(`   Fix: Kill the conflicting process or set PORT env variable.`);
    console.error(`   Try: PORT=3002 node index.js`);
    // Attempt to use a fallback port
    const fallbackPort = PORT + 1;
    console.warn(`   Attempting fallback port ${fallbackPort}...`);
    server.listen(fallbackPort, HOST, () => {
      console.log(`\n🚀 Fleet Management API server running (fallback)`);
      console.log(`   Port: ${fallbackPort}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } else if (err.code === 'EACCES') {
    console.error(`\n❌ Permission denied for port ${PORT}. Try a port > 1024 or run as admin.`);
    process.exit(1);
  } else {
    console.error('Server startup error:', err.message);
    process.exit(1);
  }
});

module.exports = { app, server, pool, io };