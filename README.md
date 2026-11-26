# Spotify Stats

A Node.js/Express application for Spotify sign-in, listening statistics, followed artists, playback information, and playlist creation.

## Requirements

- Node.js 18 or newer
- MongoDB (MongoDB Atlas is supported)
- A Spotify Developer application

## Setup

1. Install dependencies from the repository root: `npm install`.
2. Copy `server/.env.example` to `server/.env`.
3. Add your Spotify credentials, MongoDB URI, and a long random `SESSION_SECRET`.
4. Register `http://localhost:3000/auth/spotify/callback` as a Redirect URI in the Spotify Developer Dashboard.
5. Run `npm start` and open http://localhost:3000.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `CLIENT_ID` | Spotify application client ID |
| `CLIENT_SECRET` | Spotify application client secret |
| `CALLBACK_URL` | Registered Spotify OAuth callback URL |
| `MONGO_URI` | MongoDB connection string |
| `SESSION_SECRET` | Random session signing secret (`SECRET_KEY` is accepted for older setups) |
| `PORT` | Optional HTTP port; defaults to 3000 |
| `NODE_ENV` | Set to `production` when deployed |

Never commit `server/.env` or publish credentials. Rotate any credential that has been exposed.

## Cosmic experience

The sign-in page and dashboard use a dark space-inspired theme with an animated starfield, nebula lighting, responsive layouts, and reduced-motion support. The dashboard also includes a live top-track filter and an optional Nebula mode. These effects are implemented with vanilla CSS and JavaScript; no additional runtime dependencies are required.

## Tests

Run `npm test` to execute the route authentication tests.


### Music intelligence dashboard
The dashboard now presents a visual listening snapshot with selectable 4-week, 6-month, and all-time charts; a featured top track; top-track and artist cards; average track duration and Spotify popularity indicators; artist-backed genre frequency bars; recent-play timeline; live playback progress; and a profile summary. Genre bars count appearances across the returned top-artist set and are not listening-time measurements. The time-range selector uses Spotify's `short_term`, `medium_term`, and `long_term` top-item ranges.
