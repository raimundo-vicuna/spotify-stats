const AdmZip = require('adm-zip');
const { processSpotifyHistoryZip } = require('./history-import');

test('procesa todos los Streaming_History_Audio_*.json del ZIP', () => {
  const zip = new AdmZip();
  zip.addFile('Spotify/Streaming_History_Audio_0.json', Buffer.from(JSON.stringify([
    { master_metadata_track_name:'Song A', master_metadata_album_artist_name:'Artist A', ms_played:60000, ts:'2025-01-01T10:00:00Z' }
  ])));
  zip.addFile('Spotify/Streaming_History_Audio_1.json', Buffer.from(JSON.stringify([
    { master_metadata_track_name:'Song A', master_metadata_album_artist_name:'Artist A', ms_played:120000, ts:'2025-02-01T10:00:00Z' },
    { master_metadata_track_name:'Song B', master_metadata_album_artist_name:'Artist B', ms_played:60000, ts:'2025-02-02T10:00:00Z' }
  ])));
  zip.addFile('Spotify/YourLibrary.json', Buffer.from('[]'));

  const result = processSpotifyHistoryZip(zip.toBuffer());

  expect(result.sourceFiles).toHaveLength(2);
  expect(result.eventCount).toBe(3);
  expect(result.uniqueTracks).toBe(2);
  expect(result.uniqueArtists).toBe(2);
  expect(result.totalMs).toBe(240000);
});
