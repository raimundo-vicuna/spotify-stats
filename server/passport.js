const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const { modelUser } = require('./db');
const SPOTIFY_SCOPES = [
  'user-read-email', 'user-read-private', 'user-top-read',
  'user-read-currently-playing', 'user-read-recently-played',
  'user-follow-read', 'user-read-playback-state',
  'playlist-modify-public', 'playlist-modify-private'
];
function connectPassport() {
  const required = ['CLIENT_ID', 'CLIENT_SECRET', 'CALLBACK_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  const User = modelUser();
  passport.use(new SpotifyStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: SPOTIFY_SCOPES
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOneAndUpdate(
        { spotifyId: profile.id },
        { $set: {
          displayName: profile.displayName || '',
          accessToken,
          refreshToken: refreshToken || '',
          expiresIn: 3600
        } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('+accessToken +refreshToken');
      return done(null, user || false);
    } catch (error) {
      return done(error);
    }
  });
}
module.exports = { connectPassport, SPOTIFY_SCOPES };
