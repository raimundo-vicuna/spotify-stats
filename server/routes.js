const axios = require('axios');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { SPOTIFY_SCOPES } = require('./passport');
const SPOTIFY_API = 'https://api.spotify.com/v1';

function requireAuthentication(req, res, next) {
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) return next();
  return res.status(401).json({ error: 'No autorizado' });
}
function spotifyRequest(req, method, endpoint, options = {}) {
  return axios({
    method,
    url: `${SPOTIFY_API}${endpoint}`,
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${req.user.accessToken}` }
  });
}
function sendSpotifyError(res, error, message) {
  const status = error.response?.status || 502;
  const details = error.response?.data?.error?.message || 'No se pudo completar la solicitud a Spotify.';
  console.error(message, error.response?.data || error.message);
  return res.status(status).json({ error: message, details });
}
function getRoutes(app) {
  app.use(cookieParser());
  app.get('/auth/spotify', passport.authenticate('spotify', { scope: SPOTIFY_SCOPES }));
  const callback = [
    passport.authenticate('spotify', { failureRedirect: '/' }),
    (req, res) => res.redirect('/main.html')
  ];
  app.get('/auth/spotify/callback', ...callback);
  app.get('/callback', ...callback); // Compatibilidad con el callback anterior.

  app.get('/logout', (req, res, next) => {
    const destroy = () => {
      if (!req.session) return res.redirect('/index.html');
      req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie('spotify.stats.sid');
        return res.redirect('/index.html');
      });
    };
    if (typeof req.logout === 'function' && req.isAuthenticated?.()) {
      return req.logout((error) => error ? next(error) : destroy());
    }
    return destroy();
  });

  app.get('/me', requireAuthentication, async (req, res) => {
    try { const r = await spotifyRequest(req, 'get', '/me'); return res.json(r.data); }
    catch (e) { return sendSpotifyError(res, e, 'Error al obtener el perfil del usuario.'); }
  });
  app.get('/devices', requireAuthentication, async (req, res) => {
    try { const r = await spotifyRequest(req, 'get', '/me/player/devices'); return res.json(r.data.devices || []); }
    catch (e) { return sendSpotifyError(res, e, 'Error al obtener los dispositivos.'); }
  });
  app.get('/me/following', requireAuthentication, async (req, res) => {
    try {
      const r = await spotifyRequest(req, 'get', '/me/following', { params: { type: 'artist' } });
      return res.json(r.data);
    } catch (e) { return sendSpotifyError(res, e, 'Error al obtener los artistas seguidos.'); }
  });
  app.get('/top-tracks', requireAuthentication, async (req, res) => {
    try {
      const r = await spotifyRequest(req, 'get', '/me/top/tracks', { params: { time_range: 'short_term', limit: 10 } });
      return res.json(r.data.items || []);
    } catch (e) { return sendSpotifyError(res, e, 'Error al obtener las canciones más escuchadas.'); }
  });
  app.get('/top-artist', requireAuthentication, async (req, res) => {
    try {
      const r = await spotifyRequest(req, 'get', '/me/top/artists', { params: { time_range: 'short_term', limit: 1 } });
      return res.json(r.data);
    } catch (e) { return sendSpotifyError(res, e, 'Error al obtener el artista más escuchado.'); }
  });
  app.get('/top-artists', requireAuthentication, async (req, res) => {
    try {
      const r = await spotifyRequest(req, 'get', '/me/top/artists', { params: { time_range: 'short_term', limit: 10 } });
      return res.json((r.data.items || []).map(({ name, genres, images, href }) => ({ name, genres, images, href })));
    } catch (e) { return sendSpotifyError(res, e, 'Error al obtener los artistas más escuchados.'); }
  });
  app.get('/song-now', requireAuthentication, async (req, res) => {
    try {
      const r = await spotifyRequest(req, 'get', '/me/player/currently-playing');
      if (r.status === 204 || !r.data?.item) return res.json('No song is playing');
      return res.json(r.data);
    } catch (e) {
      if (e.response?.status === 204) return res.json('No song is playing');
      return sendSpotifyError(res, e, 'Error al obtener la canción actualmente en reproducción.');
    }
  });
  app.get('/playlist', requireAuthentication, async (req, res) => {
    try {
      const tracks = await spotifyRequest(req, 'get', '/me/top/tracks', { params: { limit: 50, time_range: 'short_term' } });
      const uris = (tracks.data.items || []).map((track) => track.uri);
      if (!uris.length) return res.status(422).json({ error: 'No hay canciones suficientes para crear la playlist.' });
      const profile = await spotifyRequest(req, 'get', '/me');
      const month = new Date().toLocaleString('en', { month: 'long' });
      const playlist = await spotifyRequest(req, 'post', `/users/${encodeURIComponent(profile.data.id)}/playlists`, {
        data: { name: `Top 50 ${month}`, description: 'Your top 50 songs of the month', public: false },
        headers: { 'Content-Type': 'application/json' }
      });
      await spotifyRequest(req, 'post', `/playlists/${playlist.data.id}/tracks`, {
        data: { uris }, headers: { 'Content-Type': 'application/json' }
      });
      return res.status(200).json({ message: 'Playlist creada con éxito', playlistUrl: playlist.data.external_urls.spotify });
    } catch (e) { return sendSpotifyError(res, e, 'Error al crear la playlist.'); }
  });
  app.get('/top-genres', requireAuthentication, async (req, res) => {
    try {
      const r = await spotifyRequest(req, 'get', '/me/top/artists', { params: { limit: 10, time_range: 'short_term' } });
      const counts = (r.data.items || []).flatMap((artist) => artist.genres || []).reduce((acc, genre) => {
        acc[genre] = (acc[genre] || 0) + 1; return acc;
      }, {});
      const genres = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([name]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() }));
      return res.json(genres);
    } catch (e) { return sendSpotifyError(res, e, 'Error al obtener los géneros más escuchados.'); }
  });
  app.get('/recently-played', requireAuthentication, async (req, res) => {
    try {
      const r = await spotifyRequest(req, 'get', '/me/player/recently-played', { params: { limit: 10 } });
      return res.json(r.data.items || []);
    } catch (e) { return sendSpotifyError(res, e, 'Error al obtener las canciones reproducidas recientemente.'); }
  });
}
module.exports = { getRoutes, requireAuthentication };
