export function generateTextFragment(
  text,
  contextPrefix,
  contextSuffix
) {
  const clean = (text || '').trim();
  if (!clean) return '';

  const words = clean.split(/\s+/).filter(Boolean);
  let textMatch = '';

  if (words.length <= 6) {
    textMatch = encodeURIComponent(clean);
  } else {
    const start = words.slice(0, 3).join(' ');
    const end = words.slice(-3).join(' ');
    textMatch = `${encodeURIComponent(start)},${encodeURIComponent(end)}`;
  }

  let fragment = `#:~:text=`;
  if (contextPrefix && contextPrefix.trim()) {
    fragment += `${encodeURIComponent(contextPrefix.trim())}-,`;
  }
  fragment += textMatch;
  if (contextSuffix && contextSuffix.trim()) {
    fragment += `,-${encodeURIComponent(contextSuffix.trim())}`;
  }

  return fragment;
}

export function buildDeepLink(sourceUrl, textFragment) {
  if (!sourceUrl) return '';
  const baseUrl = sourceUrl.split('#')[0];
  if (!textFragment) return baseUrl;
  const fragment = textFragment.startsWith('#') ? textFragment : `#${textFragment}`;
  return `${baseUrl}${fragment}`;
}
