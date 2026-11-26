(() => {
  'use strict';

  const STORAGE_KEY = 'spotifyStatsImportedHistoryV1';
  const $ = (selector) => document.querySelector(selector);
  let imported = null;

  function firstValue(entry, keys) {
    for (const key of keys) {
      if (entry[key] !== undefined && entry[key] !== null && entry[key] !== '') return entry[key];
    }
    return null;
  }

  function normalizeEntries(payload) {
    const entries = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : null;
    if (!entries) throw new Error('El JSON debe contener una lista de reproducciones.');
    return entries.map((entry) => {
      const track = firstValue(entry, ['master_metadata_track_name', 'trackName', 'track_name', 'track']);
      const artist = firstValue(entry, ['master_metadata_album_artist_name', 'artistName', 'artist_name', 'artist']);
      const ms = Number(firstValue(entry, ['ms_played', 'msPlayed', 'milliseconds_played']) || 0);
      const rawDate = firstValue(entry, ['ts', 'endTime', 'played_at', 'timestamp']);
      const date = rawDate ? new Date(rawDate) : null;
      const validDate = date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
      const uri = firstValue(entry, ['spotify_track_uri', 'trackUri', 'uri']);
      const album = firstValue(entry, ['master_metadata_album_album_name', 'albumName', 'album_name']);
      if (!track || !artist || !Number.isFinite(ms) || ms <= 0) return null;
      return { track: String(track), artist: String(artist), album: album ? String(album) : '', uri: uri ? String(uri) : '', msPlayed: ms, playedAt: validDate };
    }).filter(Boolean);
  }

  function aggregateHistory(payloads) {
    const trackMap = new Map();
    const artistMap = new Map();
    const monthMap = new Map();
    const activeDays = new Set();
    let totalMs = 0;
    let eventCount = 0;

    for (const payload of payloads) {
      for (const entry of normalizeEntries(payload)) {
        const trackKey = entry.uri || (entry.track.toLocaleLowerCase() + '|' + entry.artist.toLocaleLowerCase());
        const current = trackMap.get(trackKey) || {
          key: trackKey, track: entry.track, artist: entry.artist, album: entry.album,
          uri: entry.uri, totalMs: 0, events: 0, firstPlayed: null, lastPlayed: null
        };
        current.totalMs += entry.msPlayed;
        current.events += 1;
        if (entry.playedAt) {
          if (!current.firstPlayed || entry.playedAt < current.firstPlayed) current.firstPlayed = entry.playedAt;
          if (!current.lastPlayed || entry.playedAt > current.lastPlayed) current.lastPlayed = entry.playedAt;
          const date = new Date(entry.playedAt);
          const month = entry.playedAt.slice(0, 7);
          monthMap.set(month, (monthMap.get(month) || 0) + entry.msPlayed);
          activeDays.add(entry.playedAt.slice(0, 10));
        }
        trackMap.set(trackKey, current);

        const artistKey = entry.artist.toLocaleLowerCase();
        const artist = artistMap.get(artistKey) || { name: entry.artist, totalMs: 0, events: 0 };
        artist.totalMs += entry.msPlayed;
        artist.events += 1;
        artistMap.set(artistKey, artist);
        totalMs += entry.msPlayed;
        eventCount += 1;
      }
    }

    return {
      totalMs,
      eventCount,
      uniqueTracks: trackMap.size,
      uniqueArtists: artistMap.size,
      activeDays: activeDays.size,
      tracks: Array.from(trackMap.values()).sort((a, b) => b.totalMs - a.totalMs),
      artists: Array.from(artistMap.values()).sort((a, b) => b.totalMs - a.totalMs),
      months: Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, ms]) => ({ month, ms }))
    };
  }

  function formatMinutes(ms) {
    const minutes = Math.round(ms / 60000);
    return minutes.toLocaleString() + ' min';
  }

  function safeText(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value == null ? '' : String(value);
    return element;
  }

  function setStatus(message, kind) {
    const status = $('#history-import-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind || 'info';
  }

  function renderSummary() {
    if (!imported) return;
    $('#history-total-time').textContent = formatMinutes(imported.totalMs);
    $('#history-events').textContent = imported.eventCount.toLocaleString();
    $('#history-tracks').textContent = imported.uniqueTracks.toLocaleString();
    $('#history-artists').textContent = imported.uniqueArtists.toLocaleString();
    $('#history-days').textContent = imported.activeDays.toLocaleString();
    $('#history-top-artist').textContent = imported.artists[0]?.name || '—';
    renderUniverse();
    renderMonthly();
    renderSongSearch();
  }

  function renderUniverse() {
    const target = $('#artist-universe');
    if (!target) return;
    target.replaceChildren();
    if (!imported.artists.length) {
      target.append(safeText('p', 'empty-state', 'Importa tu historial para descubrir tu universo.'));
      return;
    }
    const artists = imported.artists.slice(0, 18);
    const max = Math.max(...artists.map((artist) => artist.totalMs), 1);
    const stage = document.createElement('div');
    stage.className = 'universe-stage';
    const core = safeText('div', 'universe-core', 'YOU');
    stage.append(core);
    artists.forEach((artist, index) => {
      const angle = (Math.PI * 2 * index / artists.length) - Math.PI / 2;
      const ring = index < 6 ? 31 : 43;
      const x = 50 + Math.cos(angle) * ring;
      const y = 50 + Math.sin(angle) * ring * .72;
      const size = 48 + Math.round(Math.sqrt(artist.totalMs / max) * 65);
      const planet = document.createElement('button');
      planet.type = 'button';
      planet.className = 'universe-planet';
      planet.style.left = x + '%';
      planet.style.top = y + '%';
      planet.style.width = size + 'px';
      planet.style.height = size + 'px';
      planet.title = artist.name + ' · ' + formatMinutes(artist.totalMs);
      planet.append(safeText('span', 'planet-name', artist.name));
      planet.append(safeText('small', 'planet-time', formatMinutes(artist.totalMs)));
      planet.addEventListener('click', () => {
        const search = $('#history-song-search');
        search.value = artist.name;
        renderSongSearch();
        $('#history-song-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      stage.append(planet);
    });
    target.append(stage);
    target.append(safeText('p', 'universe-caption', 'Los planetas más grandes representan artistas con más tiempo acumulado en tu historial importado.'));
  }

  function renderMonthly() {
    const target = $('#history-monthly-chart');
    if (!target) return;
    target.replaceChildren();
    const months = imported.months.slice(-12);
    if (!months.length) {
      target.append(safeText('p', 'empty-state', 'No hay fechas suficientes para construir la línea temporal.'));
      return;
    }
    const max = Math.max(...months.map((item) => item.ms), 1);
    months.forEach((item) => {
      const column = document.createElement('div');
      column.className = 'month-column';
      const bar = document.createElement('div');
      bar.className = 'month-bar';
      bar.style.height = Math.max(4, item.ms / max * 100) + '%';
      bar.title = item.month + ': ' + formatMinutes(item.ms);
      column.append(bar, safeText('span', '', item.month.slice(2)));
      target.append(column);
    });
  }

  function renderSongSearch() {
    const query = ($('#history-song-search')?.value || '').trim().toLocaleLowerCase();
    const target = $('#history-song-results');
    if (!target || !imported) return;
    target.replaceChildren();
    const matches = imported.tracks.filter((track) =>
      (track.track + ' ' + track.artist + ' ' + track.album).toLocaleLowerCase().includes(query)
    ).slice(0, 12);
    if (!matches.length) {
      target.append(safeText('p', 'empty-state', query ? 'No encontramos esa canción en el historial importado.' : 'Escribe una canción o artista para explorar tu tiempo de escucha.'));
      return;
    }
    matches.forEach((track) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-track-result';
      const copy = document.createElement('span');
      copy.className = 'history-track-copy';
      copy.append(safeText('strong', '', track.track), safeText('small', '', track.artist));
      const stats = document.createElement('span');
      stats.className = 'history-track-stats';
      stats.append(safeText('strong', '', formatMinutes(track.totalMs)), safeText('small', '', track.events.toLocaleString() + ' eventos'));
      button.append(copy, stats);
      button.addEventListener('click', () => renderTrackDetail(track));
      target.append(button);
    });
  }

  function renderTrackDetail(track) {
    const target = $('#history-track-detail');
    if (!target) return;
    target.replaceChildren();
    const percent = imported.totalMs ? (track.totalMs / imported.totalMs * 100) : 0;
    target.append(
      safeText('span', 'section-kicker', 'SONG TIME MACHINE'),
      safeText('h3', '', track.track),
      safeText('p', '', track.artist + (track.album ? ' · ' + track.album : '')),
      safeText('strong', 'detail-minutes', formatMinutes(track.totalMs)),
      safeText('p', 'detail-caption', 'Tiempo acumulado · ' + track.events.toLocaleString() + ' eventos registrados · ' + percent.toFixed(1) + '% de tu tiempo importado')
    );
    const dates = [track.firstPlayed, track.lastPlayed].filter(Boolean);
    if (dates.length) target.append(safeText('small', 'detail-dates', 'Primera escucha registrada: ' + new Date(dates[0]).toLocaleDateString() + ' · Última: ' + new Date(dates[1] || dates[0]).toLocaleDateString()));
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'share-discovery-button';
    share.textContent = '✦ Compartir este descubrimiento';
    share.addEventListener('click', () => shareDiscovery(track));
    target.append(share);
  }

  async function shareDiscovery(track) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#11132c');
    gradient.addColorStop(.55, '#33205f');
    gradient.addColorStop(1, '#082c42');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 630);
    context.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i < 90; i++) {
      context.beginPath();
      context.arc((i * 137) % 1200, (i * 79) % 630, (i % 3) + 1, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = '#69e2e5';
    context.font = 'bold 24px Arial';
    context.fillText('SPOTIFY STATS  /  SONG TIME MACHINE', 76, 90);
    context.fillStyle = '#ffffff';
    context.font = 'bold 58px Arial';
    context.fillText(track.track.slice(0, 28), 76, 220);
    context.font = '32px Arial';
    context.fillStyle = '#d4d7f2';
    context.fillText(track.artist.slice(0, 42), 76, 275);
    context.font = 'bold 78px Arial';
    context.fillStyle = '#ffffff';
    context.fillText(formatMinutes(track.totalMs), 76, 420);
    context.font = '24px Arial';
    context.fillStyle = '#c1c9e8';
    context.fillText(track.events.toLocaleString() + ' listening events in my imported Spotify history', 76, 480);
    context.font = '20px Arial';
    context.fillText('Your sound. Your universe.', 76, 560);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      setStatus('No se pudo generar la tarjeta para compartir.', 'error');
      return;
    }
    const file = new File([blob], 'spotify-song-discovery.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: 'My Spotify song discovery', text: track.track + ' · ' + formatMinutes(track.totalMs), files: [file] }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spotify-song-discovery.png';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Tarjeta descargada. Ya puedes compartirla.', 'success');
  }

  async function importFiles(files) {
    if (!files.length) return;
    try {
      const payloads = await Promise.all(Array.from(files).map(async (file) => {
        if (!file.name.toLowerCase().endsWith('.json')) throw new Error(file.name + ': selecciona archivos JSON extraídos del ZIP de Spotify.');
        return JSON.parse(await file.text());
      }));
      const next = aggregateHistory(payloads);
      if (!next.eventCount) throw new Error('No encontramos reproducciones válidas en esos archivos.');
      imported = next;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(imported)); }
      catch { setStatus('Historial cargado en esta sesión; el navegador no permitió guardarlo para la próxima visita.', 'warning'); }
      renderSummary();
      setStatus(
        'Historial importado: ' + next.eventCount.toLocaleString() + ' eventos, ' +
        next.uniqueTracks.toLocaleString() + ' canciones y ' + formatMinutes(next.totalMs) +
        '. Los datos se procesan en este navegador.',
        'success'
      );
    } catch (error) {
      setStatus(error.message || 'No se pudo importar el historial.', 'error');
    }
  }

  function initSettings() {
    const toggle = $('#settings-toggle');
    const panel = $('#settings-panel');
    toggle?.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (event) => {
      if (panel && !panel.hidden && !panel.contains(event.target) && event.target !== toggle) {
        panel.hidden = true;
        toggle?.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && panel && !panel.hidden) {
        panel.hidden = true;
        toggle?.setAttribute('aria-expanded', 'false');
      }
    });
    $('#settings-import-link')?.addEventListener('click', () => {
      $('#history-import-section')?.scrollIntoView({ behavior: 'smooth' });
      panel.hidden = true;
      toggle?.setAttribute('aria-expanded', 'false');
    });
  }

  function init() {
    initSettings();
    $('#history-files')?.addEventListener('change', (event) => importFiles(event.target.files));
    $('#history-song-search')?.addEventListener('input', renderSongSearch);
    $('#share-universe')?.addEventListener('click', () => {
      if (!imported) return setStatus('Importa tu historial antes de compartir tu universo.', 'warning');
      shareDiscovery({
        track: 'My listening universe',
        artist: imported.artists[0]?.name || 'Spotify listener',
        totalMs: imported.totalMs,
        events: imported.eventCount
      });
    });
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        imported = JSON.parse(cached);
        if (imported && Array.isArray(imported.tracks) && Array.isArray(imported.artists)) {
          renderSummary();
          setStatus('Historial recuperado de este navegador. Tus datos permanecen locales.', 'success');
        } else imported = null;
      }
    } catch { imported = null; }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizeEntries, aggregateHistory, formatMinutes };
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();