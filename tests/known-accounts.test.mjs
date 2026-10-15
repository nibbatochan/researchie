import test from 'node:test';
import assert from 'node:assert/strict';
import { listAccounts, rememberAccount, forgetAccount, switchUrl, KNOWN_ACCOUNTS_KEY } from '../src/lib/auth/knownAccounts.ts';

const memory = (initial) => {
  const map = new Map(initial ? [[KNOWN_ACCOUNTS_KEY, initial]] : []);
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => void map.set(k, v), map };
};

test('an empty or missing store gives an empty list', () => {
  assert.deepEqual(listAccounts(memory()), []);
  assert.deepEqual(listAccounts(null), []);
  assert.deepEqual(listAccounts(undefined), []);
});

test('remembering puts the address first, lower-cased, without duplicates', () => {
  const s = memory();
  rememberAccount(s, 'Work@Example.com');
  rememberAccount(s, 'home@example.com');
  rememberAccount(s, ' work@example.com ');
  assert.deepEqual(listAccounts(s), ['work@example.com', 'home@example.com']);
});

test('only email addresses are kept', () => {
  const s = memory();
  for (const bad of ['', 'not an email', 'a@b', null, undefined, 42, 'x@y.z extra']) rememberAccount(s, bad);
  assert.deepEqual(listAccounts(s), []);
});

test('the list is capped at six, newest first', () => {
  const s = memory();
  for (let i = 1; i <= 8; i++) rememberAccount(s, `u${i}@example.com`);
  const list = listAccounts(s);
  assert.equal(list.length, 6);
  assert.equal(list[0], 'u8@example.com');
});

test('forgetting removes one address', () => {
  const s = memory();
  rememberAccount(s, 'a@example.com');
  rememberAccount(s, 'b@example.com');
  assert.deepEqual(forgetAccount(s, 'A@example.com'), ['b@example.com']);
  assert.deepEqual(listAccounts(s), ['b@example.com']);
});

test('damaged stored data is ignored, and a blocked store does not throw', () => {
  assert.deepEqual(listAccounts(memory('{not json')), []);
  assert.deepEqual(listAccounts(memory('"a string"')), []);
  assert.deepEqual(listAccounts(memory(JSON.stringify(['ok@example.com', 5, 'bad', { a: 1 }]))), ['ok@example.com']);
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(listAccounts(broken), []);
  assert.doesNotThrow(() => rememberAccount(broken, 'a@example.com'));
});

test('only the address is ever stored', () => {
  const s = memory();
  rememberAccount(s, 'a@example.com');
  assert.equal(s.map.get(KNOWN_ACCOUNTS_KEY), JSON.stringify(['a@example.com']));
});

test('the switch address encodes the email, and a bad one opens the plain page', () => {
  assert.equal(switchUrl('Pat+test@Example.com'), '/login?email=pat%2Btest%40example.com');
  assert.equal(switchUrl('nope'), '/login');
  assert.equal(switchUrl('a@b.co&x=1'), '/login?email=a%40b.co%26x%3D1');
});
