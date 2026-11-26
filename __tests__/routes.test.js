const express = require('express');
const request = require('supertest');
const { getRoutes } = require('../server/routes');

describe('Spotify API route protection', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use((req, res, next) => {
      req.isAuthenticated = () => false;
      next();
    });
    getRoutes(app);
  });

  test.each([
    '/me', '/devices', '/me/following', '/top-tracks', '/top-artist',
    '/top-artists', '/song-now', '/playlist', '/top-genres', '/recently-played'
  ])('%s rejects unauthenticated requests', async (route) => {
    const response = await request(app).get(route);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No autorizado');
  });
});
