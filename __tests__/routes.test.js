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


const { normalizeEntries, aggregateHistory, formatMinutes } = require('../public/js/history-universe');

describe('Spotify Extended Streaming History import', () => {
  const records = [
    { ts: '2024-01-01T10:00:00Z', ms_played: 180000, master_metadata_track_name: 'Midnight City', master_metadata_album_artist_name: 'M83', master_metadata_album_album_name: 'Hurry Up, We’re Dreaming', spotify_track_uri: 'spotify:track:one' },
    { ts: '2024-01-02T10:00:00Z', ms_played: 120000, master_metadata_track_name: 'Midnight City', master_metadata_album_artist_name: 'M83', spotify_track_uri: 'spotify:track:one' },
    { ts: '2024-02-01T10:00:00Z', ms_played: 240000, master_metadata_track_name: 'Genesis', master_metadata_album_artist_name: 'Grimes', spotify_track_uri: 'spotify:track:two' }
  ];
  test('normalizes Spotify export fields and ignores empty records', () => {
    const normalized = normalizeEntries([...records, { ms_played: 0 }]);
    expect(normalized).toHaveLength(3);
    expect(normalized[0].track).toBe('Midnight City');
    expect(normalized[0].msPlayed).toBe(180000);
  });
  test('aggregates listening time, events, tracks, artists, days and months', () => {
    const result = aggregateHistory([records]);
    expect(result.totalMs).toBe(540000);
    expect(result.eventCount).toBe(3);
    expect(result.uniqueTracks).toBe(2);
    expect(result.uniqueArtists).toBe(2);
    expect(result.activeDays).toBe(3);
    expect(result.tracks[0].track).toBe('Midnight City');
    expect(result.tracks[0].totalMs).toBe(300000);
    expect(result.months).toHaveLength(2);
  });
  test('supports legacy field names and formats minutes', () => {
    const result = aggregateHistory([[{ endTime: '2023-03-01T00:00:00Z', msPlayed: 60000, trackName: 'Song', artistName: 'Artist' }]]);
    expect(result.eventCount).toBe(1);
    expect(formatMinutes(60000)).toBe('1 min');
  });
  test('rejects payloads that are not arrays', () => {
    expect(() => normalizeEntries({ nope: true })).toThrow('lista de reproducciones');
  });
});
