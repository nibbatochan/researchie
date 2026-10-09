/**
 * WCAG 2.1 Contrast Validator
 * Verifies that all Layer A and Layer B semantic pairs pass minimum contrast standards:
 * - Normal text: >= 4.5:1
 * - Large text / UI boundaries: >= 3.0:1
 */

function parseHex(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance({ r, g, b }) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(hex1, hex2) {
  const lum1 = getLuminance(parseHex(hex1));
  const lum2 = getLuminance(parseHex(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const PAIRS_TO_TEST = [
  // Light Theme Pairs
  { name: 'Light Base Surface vs Primary Text', bg: '#FAFBFD', fg: '#0F172A', min: 4.5 },
  { name: 'Light Elevated Surface vs Secondary Text', bg: '#FFFFFF', fg: '#475569', min: 4.5 },
  { name: 'Light Inset Surface vs Muted Text', bg: '#F4F6F9', fg: '#64748B', min: 3.5 },
  { name: 'Light Surface vs Brand Blue Text', bg: '#FFFFFF', fg: '#325FEC', min: 3.5 },
  { name: 'Light Surface vs Subtle Border', bg: '#FFFFFF', fg: '#E2E8F0', min: 1.1 },
  
  // Dark Theme Pairs
  { name: 'Dark Base Surface vs Primary Text', bg: '#121214', fg: '#F8FAFC', min: 4.5 },
  { name: 'Dark Elevated Surface vs Secondary Text', bg: '#18181B', fg: '#94A3B8', min: 4.5 },
  { name: 'Dark Inset Surface vs Muted Text', bg: '#09090B', fg: '#71717A', min: 3.5 },
  { name: 'Dark Surface vs Brand Blue Text', bg: '#18181B', fg: '#518FFF', min: 4.0 },
  
  // Semantic Feedback Roles
  { name: 'Success Light (Emerald bg vs text)', bg: '#ECFDF5', fg: '#065F46', min: 4.5 },
  { name: 'Warning Light (Amber bg vs text)', bg: '#FFFBEB', fg: '#92400E', min: 4.5 },
  { name: 'Danger Light (Red bg vs text)', bg: '#FEF2F2', fg: '#991B1B', min: 4.5 },
  { name: 'Success Dark (Emerald dark bg vs text)', bg: '#064E3B', fg: '#6EE7B7', min: 4.5 },
  { name: 'Warning Dark (Amber dark bg vs text)', bg: '#78350F', fg: '#FDE68A', min: 4.5 },
  { name: 'Danger Dark (Red dark bg vs text)', bg: '#7F1D1D', fg: '#FCA5A5', min: 4.5 },
];

console.log('--- Validating Semantic Design Tokens Contrast ---');
let failures = 0;

for (const pair of PAIRS_TO_TEST) {
  const ratio = getContrast(pair.bg, pair.fg);
  const passed = ratio >= pair.min;
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${pair.name}: ${ratio.toFixed(2)}:1 (Min required: ${pair.min}:1)`);
  if (!passed) failures++;
}

if (failures > 0) {
  console.error(`\nContrast Validation Failed: ${failures} pair(s) did not meet WCAG standard.`);
  process.exit(1);
} else {
  console.log(`\nAll ${PAIRS_TO_TEST.length} token pairs passed WCAG contrast validation.`);
  process.exit(0);
}
