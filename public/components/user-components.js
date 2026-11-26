const $ = (selector) => document.querySelector(selector);
const state = { range: 'short_term', profile: null, tracks: [], artists: [], genres: [], recent: [], device: 'Spotify' };
const rangeLabels = { short_term: '4 weeks', medium_term: '6 months', long_term: 'All time' };
let urlProfile = '';
let urlPlaylist = '';
let intervalId;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function image(url, alt, className) {
  const element = node('img', className);
  element.src = url || '';
  element.alt = alt || '';
  element.loading = 'lazy';
  return element;
}
function spotifyLink(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Request failed: ' + response.status);
  return response.json();
}
function duration(ms) {
  if (!Number.isFinite(ms)) return '—';
  const total = Math.round(ms / 1000);
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}
function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}
function showEmpty(target, message) {
  target.replaceChildren(node('div', 'empty-state', message));
}

async function loadProfile() {
  try {
    state.profile = await getJSON('/me');
    const profile = state.profile;
    urlProfile = profile.external_urls?.spotify || '';
    setText('user-name', profile.display_name || 'Spotify listener');
    const country = profile.country ? new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }).of(profile.country) : 'Location unavailable';
    setText('profile-meta', [country, profile.product ? profile.product + ' plan' : '', profile.followers?.total != null ? profile.followers.total + ' followers' : ''].filter(Boolean).join(' · '));
    const avatar = $('#user-img');
    if (avatar && profile.images?.[0]?.url) avatar.src = profile.images[0].url;
    const following = await getJSON('/me/following');
    const total = following?.artists?.total;
    if (total != null) setText('profile-meta', (country || '') + ' · ' + total.toLocaleString() + ' artists followed' + (profile.product ? ' · ' + profile.product + ' plan' : ''));
  } catch (error) {
    setText('user-name', 'Spotify profile unavailable');
    setText('profile-meta', 'Could not load profile details right now.');
  }
}

function renderSnapshot() {
  const tracks = state.tracks;
  const artists = state.artists;
  if (!tracks.length) {
    ['stat-top-track','stat-top-artist'].forEach(id => setText(id, 'No data'));
    setText('stat-artists', '0');
    setText('stat-duration', '—');
    setText('stat-popularity', '—');
    return;
  }
  const first = tracks[0];
  setText('stat-top-track', first.name || 'Unknown track');
  setText('stat-top-artist', first.artists?.map(a => a.name).join(', ') || 'Unknown artist');
  setText('stat-artists', String(new Set(tracks.flatMap(t => (t.artists || []).map(a => a.id || a.name))).size));
  const average = tracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0) / tracks.length;
  setText('stat-duration', duration(average));
  const popularities = tracks.filter(t => Number.isFinite(t.popularity)).map(t => t.popularity);
  setText('stat-popularity', popularities.length ? Math.round(popularities.reduce((a,b) => a+b,0) / popularities.length) + '/100' : '—');
}

function renderFeaturedTrack() {
  const target = $('#featured-track');
  target.replaceChildren();
  const track = state.tracks[0];
  if (!track) return showEmpty(target, 'Spotify has not returned your top tracks yet.');
  const cover = image(track.album?.images?.[0]?.url, track.name, 'featured-cover');
  const copy = node('div', 'featured-copy');
  copy.append(node('span', 'rank-label', '✦ #1 IN YOUR ' + rangeLabels[state.range].toUpperCase() + ' CHART'));
  copy.append(node('h3', '', track.name));
  copy.append(node('p', '', (track.artists || []).map(a => a.name).join(', ') + ' · ' + (track.album?.name || '')));
  const meta = node('div', 'featured-meta');
  meta.append(node('span', 'data-chip', '◷ ' + duration(track.duration_ms)));
  if (Number.isFinite(track.popularity)) meta.append(node('span', 'data-chip', '✧ Popularity ' + track.popularity + '/100'));
  meta.append(node('span', 'data-chip', '↗ Open in Spotify'));
  copy.append(meta);
  target.append(cover, copy);
  target.addEventListener('click', () => spotifyLink(track.external_urls?.spotify), { once: true });
  target.style.cursor = 'pointer';
}

function renderTracks() {
  const target = $('#top-tracks-grid');
  target.replaceChildren();
  if (!state.tracks.length) return showEmpty(target, 'No top tracks found for this period.');
  state.tracks.forEach((track, index) => {
    const card = node('article', 'track-card trackRow');
    card.dataset.search = [track.name, ...(track.artists || []).map(a => a.name), track.album?.name].join(' ').toLowerCase();
    card.append(node('span', 'track-rank', String(index + 1)));
    card.append(image(track.album?.images?.[1]?.url || track.album?.images?.[0]?.url, track.name));
    card.append(node('h3', '', track.name));
    card.append(node('p', '', (track.artists || []).map(a => a.name).join(', ')));
    const extra = node('div', 'track-extra');
    extra.append(node('span', '', duration(track.duration_ms)));
    extra.append(node('span', '', Number.isFinite(track.popularity) ? '✦ ' + track.popularity : ''));
    card.append(extra);
    card.addEventListener('click', () => spotifyLink(track.external_urls?.spotify));
    target.append(card);
  });
  applyTrackSearch();
}
function applyTrackSearch() {
  const query = ($('#cosmic-track-search')?.value || '').trim().toLocaleLowerCase();
  let visible = 0;
  document.querySelectorAll('.trackRow').forEach(card => {
    const match = !query || card.dataset.search.includes(query);
    card.hidden = !match;
    if (match) visible++;
  });
  const heading = $('#cosmic-track-search');
  if (heading) heading.setAttribute('aria-description', query ? visible + ' matching tracks' : 'All top tracks');
}

function renderArtists() {
  const target = $('#top-artists-grid');
  target.replaceChildren();
  if (!state.artists.length) return showEmpty(target, 'No top artists found for this period.');
  state.artists.forEach((artist, index) => {
    const card = node('article', 'artist-card');
    card.append(image(artist.images?.[0]?.url || artist.images?.[1]?.url, artist.name));
    card.append(node('h3', '', String(index + 1).padStart(2, '0') + ' · ' + artist.name));
    card.append(node('p', '', (artist.genres || []).slice(0, 3).join(' / ') || 'Genre not listed'));
    card.addEventListener('click', () => spotifyLink('https://open.spotify.com/artist/' + encodeURIComponent(artist.id || artist.href?.split('/').pop() || '')));
    target.append(card);
  });
}
function renderGenres() {
  const target = $('#genre-spectrum');
  target.replaceChildren();
  if (!state.genres.length) return showEmpty(target, 'Genre information is not available yet.');
  const max = Math.max(...state.genres.map(g => g.count || 1), 1);
  state.genres.forEach((genre, index) => {
    const row = node('div', 'genre-row');
    const top = node('div', 'genre-topline');
    top.append(node('span', '', String(index + 1).padStart(2, '0') + ' · ' + genre.name));
    top.append(node('small', '', (genre.count || 1) + ' artists'));
    const bar = node('div', 'genre-bar');
    const fill = node('span');
    fill.style.width = Math.max(6, (genre.count || 1) / max * 100) + '%';
    bar.append(fill);
    row.append(top, bar);
    target.append(row);
  });
}
function renderTimeline() {
  const target = $('#listening-timeline');
  target.replaceChildren();
  if (!state.recent.length) return showEmpty(target, 'No recent listening activity was returned.');
  state.recent.forEach(item => {
    const track = item.track || {};
    const row = node('article', 'timeline-item');
    row.append(image(track.album?.images?.[2]?.url || track.album?.images?.[0]?.url, track.name));
    const copy = node('div', 'timeline-copy');
    copy.append(node('strong', '', track.name || 'Unknown track'));
    copy.append(node('span', '', (track.artists || []).map(a => a.name).join(', ')));
    const date = item.played_at ? new Date(item.played_at) : null;
    copy.append(node('small', '', date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Recently played'));
    row.append(copy);
    row.addEventListener('click', () => spotifyLink(track.external_urls?.spotify));
    target.append(row);
  });
}

async function loadCharts() {
  const range = state.range;
  const targets = ['top-tracks-grid','top-artists-grid','genre-spectrum','featured-track'];
  targets.forEach(id => { const element = document.getElementById(id); if (element) element.setAttribute('aria-busy', 'true'); });
  try {
    const [tracks, artists, genres] = await Promise.all([
      getJSON('/top-tracks?range=' + range),
      getJSON('/top-artists?range=' + range),
      getJSON('/top-genres?range=' + range)
    ]);
    state.tracks = Array.isArray(tracks) ? tracks : [];
    state.artists = Array.isArray(artists) ? artists : [];
    state.genres = Array.isArray(genres) ? genres : [];
    renderSnapshot(); renderFeaturedTrack(); renderTracks(); renderArtists(); renderGenres();
  } catch (error) {
    targets.forEach(id => { const element = document.getElementById(id); if (element) showEmpty(element, 'Could not load Spotify insights. Try refreshing or reconnecting Spotify.'); });
  } finally {
    targets.forEach(id => { const element = document.getElementById(id); if (element) element.removeAttribute('aria-busy'); });
  }
}
async function loadRecent() {
  try { state.recent = await getJSON('/recently-played'); renderTimeline(); }
  catch { showEmpty($('#listening-timeline'), 'Could not load recent listening activity.'); }
}
async function fetchSongNow() {
  const target = $('#song-now');
  try {
    const data = await getJSON('/song-now');
    if (!data || typeof data === 'string' || !data.item) {
      target.replaceChildren(node('p', '', 'Nothing playing right now. When Spotify starts a track, your live signal will appear here.'));
      return;
    }
    const track = data.item;
    target.replaceChildren();
    target.append(image(track.album?.images?.[1]?.url || track.album?.images?.[0]?.url, track.name, 'now-art'));
    const copy = node('div', 'now-copy');
    copy.append(node('strong', '', track.name));
    copy.append(node('span', '', (track.artists || []).map(a => a.name).join(', ') + ' · ' + (data.is_playing ? 'Playing' : 'Paused')));
    copy.append(node('small', '', state.device || 'Spotify'));
    if (Number.isFinite(data.progress_ms) && Number.isFinite(track.duration_ms)) {
      const progress = node('div', 'progress-track');
      const fill = node('div', 'progress-fill');
      fill.style.width = Math.min(100, data.progress_ms / track.duration_ms * 100) + '%';
      progress.append(fill); copy.append(progress);
    }
    target.append(copy);
    target.onclick = () => spotifyLink(track.external_urls?.spotify);
    target.style.cursor = 'pointer';
  } catch {
    target.replaceChildren(node('p', '', 'Live playback information is unavailable right now.'));
  }
}
async function loadDevices() {
  try {
    const devices = await getJSON('/devices');
    const active = devices.find(device => device.is_active);
    state.device = active?.name || 'Spotify device';
  } catch { state.device = 'Spotify device'; }
}
async function playlist() {
  const message = $('.playlist-text');
  const button = $('.PLAYLIST');
  const goButton = $('.GO');
  if (message) message.textContent = 'Building your top 50 playlist…';
  if (button) button.disabled = true;
  try {
    const data = await getJSON('/playlist');
    urlPlaylist = data.playlistUrl;
    if (!urlPlaylist) throw new Error(data.error || 'Playlist URL missing');
    if (message) message.textContent = 'Your playlist is ready. Open it in Spotify!';
    if (button) button.style.display = 'none';
    if (goButton) goButton.style.display = 'block';
  } catch (error) {
    if (message) message.textContent = error.message || 'The playlist could not be created.';
    if (button) button.disabled = false;
  }
}
function showPopup() {
  const overlay = $('#overlay'), popup = $('#popup');
  if (!overlay || !popup) return;
  overlay.style.display = 'block';
  window.setTimeout(() => popup.classList.add('active'), 10);
}
function hidePopup() {
  const popup = $('#popup'), overlay = $('#overlay');
  if (!overlay || !popup) return;
  popup.classList.remove('active');
  window.setTimeout(() => { overlay.style.display = 'none'; }, 300);
}
window.showPopup = showPopup;
window.hidePopup = hidePopup;

document.querySelectorAll('.range-button').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.range === state.range) return;
    state.range = button.dataset.range;
    document.querySelectorAll('.range-button').forEach(item => item.classList.toggle('active', item === button));
    loadCharts();
  });
});
$('#cosmic-track-search')?.addEventListener('input', applyTrackSearch);
$('.PLAYLIST-OPEN')?.addEventListener('click', event => { event.preventDefault(); showPopup(); });
$('.PLAYLIST')?.addEventListener('click', event => { event.preventDefault(); playlist(); });
$('.GO')?.addEventListener('click', event => { event.preventDefault(); spotifyLink(urlPlaylist); });
$('.SPOTIFY')?.addEventListener('click', event => { event.preventDefault(); spotifyLink(urlProfile); });
$('.reload')?.addEventListener('click', event => { event.preventDefault(); window.location.reload(); });
$('.home')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
$('.github')?.addEventListener('click', () => window.open('https://github.com/raideus138/regal', '_blank', 'noopener,noreferrer'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') hidePopup();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#cosmic-track-search')?.focus(); }
});
setText('date', new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
loadProfile();
loadDevices();
loadCharts();
loadRecent();
fetchSongNow();
intervalId = window.setInterval(fetchSongNow, 30000);
window.addEventListener('beforeunload', () => window.clearInterval(intervalId));
