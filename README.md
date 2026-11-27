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


## Importing your Spotify listening history

Request your personal data export from Spotify. In the dashboard, choose the complete Spotify Extended Streaming History ZIP. The browser uploads it directly to a **private Vercel Blob store**, then the authenticated server downloads and processes it. The ZIP is deleted from Blob storage after processing. The app accepts ZIP files up to 100 MB; larger archives may exceed the serverless processing memory or execution-time limits.

For Vercel deployments, create a **Private** Blob store in the project's Storage section and connect it to this project. Enable **Add a read-write token env var to this connection** so `BLOB_READ_WRITE_TOKEN` is available to the upload-token route. The store must remain private because the export contains personal listening data. For local development, connect the store to the Development environment and pull the variables with the Vercel CLI.

The processed aggregate is stored in the browser's local storage so it can be restored on the next visit. Clear this site's browser data to remove that local summary.

The Song Time Machine reports the sum of Spotify's recorded `ms_played` values and the number of listening events present in the export. An event is not necessarily a Spotify-qualified stream. Entries without track metadata are skipped. Monthly charts use the timestamps contained in the export.

Use the share controls to generate a shareable PNG. Review the generated card before posting.


## Deploying to Vercel

This repository includes a Vercel Node.js function at `api/index.js`. The function initializes the Express app, reuses the MongoDB connection across warm invocations, and sends all routes (including static assets) through Express. MongoDB stores Express sessions so Spotify OAuth can survive separate serverless invocations.

1. Import the GitHub repository into Vercel and select the **Express** framework preset.
2. Leave **Build Command** and **Output Directory** empty. Keep the repository root as the Root Directory.
3. Add these environment variables in Vercel for the Production environment (and Preview too, if you test preview deployments):
   - `MONGO_URI`: MongoDB connection string. Ensure the MongoDB Atlas network access rules permit connections from your deployment.
   - `SESSION_SECRET`: a long, random session signing secret.
   - `CLIENT_ID`: Spotify application client ID.
   - `CLIENT_SECRET`: Spotify application client secret.
   - `CALLBACK_URL`: `https://YOUR-VERCEL-DOMAIN/auth/spotify/callback`.
4. Add that exact public callback URL to the Redirect URIs in your Spotify Developer Dashboard.
5. Deploy the branch and test the public URL.

Do not use `localhost` in the production `CALLBACK_URL`. Keep all secrets in Vercel environment variables; never commit them to Git.
