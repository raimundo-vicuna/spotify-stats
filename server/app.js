const path = require('path');
const dotenv = require('dotenv');
const envResult = dotenv.config({ path: path.join(__dirname, '.env') });
if (envResult.error && envResult.error.code !== 'ENOENT') throw envResult.error;

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { connectdb } = require('./db');
const { connectPassport } = require('./passport');
const { getRoutes } = require('./routes');

const app = express();
const port = Number(process.env.PORT) || 3000;
const sessionSecret = process.env.SESSION_SECRET || process.env.SECRET_KEY;

function createApp() {
  if (!sessionSecret) throw new Error('Falta SESSION_SECRET (o SECRET_KEY) en server/.env.');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(session({
    name: 'spotify.stats.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  getRoutes(app);
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));
  app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
  app.use((req, res) => res.status(404).sendFile(path.join(publicPath, '404.html')));
  return app;
}
async function startServer() {
  try {
    await connectdb();
    connectPassport();
    createApp();
    app.listen(port, () => console.log(`La aplicación está en funcionamiento en http://localhost:${port}`));
  } catch (error) {
    console.error('No se pudo iniciar la aplicación:', error.message);
    process.exitCode = 1;
  }
}
if (require.main === module) startServer();
module.exports = { app, createApp, startServer };
