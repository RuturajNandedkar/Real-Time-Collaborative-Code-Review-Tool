const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const AppError = require('./utils/AppError');

// Routes
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const commentRoutes = require('./routes/commentRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

const createApp = () => {
  const app = express();

  // ─── Security Middleware ───────────────────────────────────────────────────
  app.use(helmet());

  app.use(
    cors({
      origin: config.cors.clientOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─── Request Parsing ───────────────────────────────────────────────────────
  // 2 MB limit to accommodate large code file submissions
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // ─── HTTP Logging ──────────────────────────────────────────────────────────
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) },
      })
    );
  }

  // ─── Rate Limiting ─────────────────────────────────────────────────────────
  app.use('/api', apiLimiter);

  // ─── API Routes ────────────────────────────────────────────────────────────
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/sessions', sessionRoutes);

  // ─── Root Route ────────────────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: '🚀 Collab Code Review API is running',
      version: '1.0.0',
      docs: '/api/health',
    });
  });

  // ─── 404 Handler ───────────────────────────────────────────────────────────
  app.all('*', (req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
  });

  // ─── Global Error Handler ──────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
