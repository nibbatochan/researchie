import test from 'node:test';
import assert from 'node:assert/strict';
import { getVideoEmbed, parseTimestamp } from '../src/lib/video/embed.ts';

const yt = (u) => getVideoEmbed(u);

test('YouTube watch, short, shorts, live and embed links all give the same embed', () => {
  const id = 'dQw4w9WgXcQ';
  for (const u of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://m.youtube.com/watch?v=${id}&feature=share`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ]) {
    const e = yt(u);
    assert.equal(e?.provider, 'youtube', u);
    assert.equal(e?.id, id, u);
    assert.ok(e.embedUrl.startsWith(`https://www.youtube-nocookie.com/embed/${id}?`), u);
  }
});

test('YouTube timestamps become start seconds', () => {
  const id = 'dQw4w9WgXcQ';
  assert.equal(yt(`https://youtu.be/${id}?t=90`)?.start, 90);
  assert.equal(yt(`https://www.youtube.com/watch?v=${id}&t=1m30s`)?.start, 90);
  assert.equal(yt(`https://www.youtube.com/watch?v=${id}&start=12`)?.start, 12);
  assert.equal(yt(`https://www.youtube.com/watch?v=${id}#t=2m`)?.start, 120);
  assert.match(yt(`https://youtu.be/${id}?t=90`).embedUrl, /start=90/);
  assert.equal(yt(`https://youtu.be/${id}`)?.start, undefined);
});

test('YouTube playlists', () => {
  const list = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
  const only = yt(`https://www.youtube.com/playlist?list=${list}`);
  assert.match(only.embedUrl, /embed\/videoseries\?.*list=/);
  const both = yt(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${list}`);
  assert.match(both.embedUrl, /embed\/dQw4w9WgXcQ\?.*list=/);
});

test('Vimeo public, unlisted and player links', () => {
  assert.equal(getVideoEmbed('https://vimeo.com/76979871')?.embedUrl, 'https://player.vimeo.com/video/76979871?dnt=1');
  assert.match(getVideoEmbed('https://vimeo.com/76979871/abcdef1234').embedUrl, /h=abcdef1234/);
  assert.match(getVideoEmbed('https://player.vimeo.com/video/76979871?h=abcdef1234').embedUrl, /h=abcdef1234/);
  assert.match(getVideoEmbed('https://vimeo.com/76979871#t=1m5s').embedUrl, /#t=65s$/);
  assert.equal(getVideoEmbed('https://vimeo.com/channels/staffpicks/76979871')?.id, '76979871');
});

test('Dailymotion and Loom', () => {
  assert.match(getVideoEmbed('https://www.dailymotion.com/video/x8abcde_title-slug').embedUrl, /video=x8abcde$/);
  assert.match(getVideoEmbed('https://dai.ly/x8abcde').embedUrl, /video=x8abcde/);
  const loomId = 'a'.repeat(32);
  assert.equal(getVideoEmbed(`https://www.loom.com/share/${loomId}?t=20`).embedUrl, `https://www.loom.com/embed/${loomId}?t=20`);
});

test('anything that is not a single video stays a plain link', () => {
  for (const u of [
    'https://www.youtube.com/',
    'https://www.youtube.com/@somechannel',
    'https://www.youtube.com/results?search_query=cats',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=short',
    'https://vimeo.com/',
    'https://vimeo.com/showcase/123456',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://evil.test/https://youtu.be/dQw4w9WgXcQ',
    'javascript:alert(1)',
    'ftp://youtu.be/dQw4w9WgXcQ',
    'not a url',
    '',
    undefined,
    null,
  ]) {
    assert.equal(getVideoEmbed(u), null, String(u));
  }
});

test('the id is checked, so nothing can be injected into the embed URL', () => {
  assert.equal(getVideoEmbed('https://www.youtube.com/watch?v=abc"onload="x'), null);
  assert.equal(getVideoEmbed('https://youtu.be/dQw4w9WgXcQ/../../x'), null); // the URL parser resolves this to /x
});

test('timestamps', () => {
  assert.equal(parseTimestamp('1h2m3s'), 3723);
  assert.equal(parseTimestamp('45s'), 45);
  assert.equal(parseTimestamp('75'), 75);
  assert.equal(parseTimestamp('1:30'), 90);
  assert.equal(parseTimestamp('abc'), undefined);
  assert.equal(parseTimestamp('0'), undefined);
  assert.equal(parseTimestamp(null), undefined);
});
