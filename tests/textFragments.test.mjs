import assert from 'node:assert';
import { generateTextFragment, buildDeepLink } from '../src/lib/utils/textFragments.mjs';

// Test 1: Short text fragment
const short = generateTextFragment("AI inference economics");
assert.strictEqual(short, "#:~:text=AI%20inference%20economics");

// Test 2: Long text fragment (takes start and end words)
const long = generateTextFragment("Serving mixture of experts models at high tokens per second exhibits memory bandwidth pressure");
assert.ok(long.startsWith("#:~:text=Serving%20mixture%20of,memory%20bandwidth%20pressure"));

// Test 3: Context prefix & suffix support
const withContext = generateTextFragment("exact quote", "prefix word", "suffix word");
assert.strictEqual(withContext, "#:~:text=prefix%20word-,exact%20quote,-suffix%20word");

// Test 4: Deep Link builder stripping previous hash
const deepLink = buildDeepLink("https://arxiv.org/abs/2401.12345#section2", "#:~:text=exact%20quote");
assert.strictEqual(deepLink, "https://arxiv.org/abs/2401.12345#:~:text=exact%20quote");

console.log("PASS: All W3C Text Fragment unit tests completed successfully.");
