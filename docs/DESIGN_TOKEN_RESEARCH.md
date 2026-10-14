# Design Token Research

Access date for every source below: 2026-10-13.

Scope: a two-tier token system (primitive, then semantic) for Researchie. It replaces the blue-only MVP system, goes into a portfolio, and must be readable by an AI harness (Claude) that builds components from the tokens.

Labels used in this file:
- **Verified (fetched):** the text was read from the cited page in this session.
- **Verified (snippet):** came from a search-result summary that cites the page; the page itself did not load. Re-check before relying on it.
- **UNVERIFIED:** not confirmed from a primary source (the page rendered empty, or only third-party material was found). Do not build on these without checking.
- **Recommendation:** my opinion, not a sourced fact.
- **Calculated:** a number I computed in this session (WCAG contrast formula, OKLCH conversion). Re-run before shipping.

## Current repo state (read first)

- `tailwind.config.ts` has `darkMode: 'class'`, a four-entry `brand` palette (`blue #325FEC`, `cyan #518FFF`, `dark`, `obsidian`) and fonts Figtree / JetBrains Mono. No semantic layer.
- `src/app/globals.css` already has CSS variables: `--canvas-bg`, `--card-bg`, `--border-color`, `--text-main/body/muted/faint`, `--accent-color`, plus `--semantic-{info,success,warning,danger}-{lightest..darkest}`. Light values on `:root`, dark `#09090B / #121214 / #18181B / #27272A` overrides.
- `DESIGN_SYSTEM.md` and `design.md` describe a flat palette ("White 100..60", "Black 100..60", Royal Blue, Electric Cyan).
- So a partial semantic layer exists but it is un-tiered and has no tokens file. The new work is mostly (a) a primitive layer, (b) a JSON source of truth, (c) a build step.

## Summary and recommendations

1. **Source of truth: DTCG-shaped JSON, built by Style Dictionary v4 into CSS variables, consumed by Tailwind 3.** The DTCG spec is still a Draft Community Group Report (not a W3C Standard), so keep the JSON to the simple parts (color, dimension, fontWeight, fontFamily, number, shadow, gradient, `{alias}` references) and keep modes out of the token files. Style Dictionary v4 has first-class DTCG support but the 2025.10 object-style colors and dimensions are not fully supported yet, so write colors as hex strings and dimensions as strings until you verify the build.
2. **Two tiers, plus an optional third.** `primitive/` has raw scales (blue 50-950, neutral 50-950, a second hue, status hues, type, space, radius). `semantic/` only contains aliases to primitives, split by role (surface, border, text, brand, status, focus, effect). Light and dark are two semantic files that define the same names. Components read semantic tokens only. A component tier (button, card) is optional and should wait.
3. **Second brand color: amber "Highlight" (about `#F5B83D`).** It is the complement of royal blue, it reads as a highlighter (the product is about clipping text), and it has 11.2:1 contrast on `#09090B` (calculated). Cost: it collides with the current `warning` color `#F5A623`, so warning should move to a more orange-red hue or always carry an icon. Violet is the alternative if warning must stay.
4. **Fix three contrast problems that exist today (calculated):** `#325FEC` as text on `#09090B` is 3.77:1 (fails 4.5:1; use `#518FFF`, 6.37:1); `--text-faint #71717A` on `#09090B` is 4.12:1 (fails for small text); the hairline `#27272A` border is 1.34:1 against `#09090B`, fine for decoration but it fails 3:1 for input and button boundaries (WCAG 1.4.11). Add a separate `border-strong` token for controls.
5. **Glass is an effect tier, not a color.** Build `effect.glass.*` tokens (fill alpha, blur, edge-light, noise) with explicit fallbacks for `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors`. Limit blurred area; do not put `backdrop-filter` on scrolling lists. Keep WebGL and shaders out of the core system.
6. **AI-readable layout:** `tokens/*.json` (machine truth) + generated `tokens.css` + a short `DESIGN.md` of rules + `AGENTS.md` pointer (and `CLAUDE.md` importing it) + a lint script that fails if a component uses a primitive or a raw hex. Keep each rules file under about 200 lines; Anthropic's own guidance ties adherence to brevity and specificity.

---

## 1. Two-tier architecture

### 1.1 W3C Design Tokens Community Group (DTCG) format

- **Status.** The editor's draft on the TR site is a "Draft Community Group Report" (page dated 8 September 2026), labelled a preview with the text "Do not attempt to implement this version of the specification." The latest published version is 2025.10. Not a W3C Standard. **Verified (fetched).** https://www.designtokens.org/tr/drafts/format/
- **Token anatomy.** A token is an object with `$value`; `$type` is required either on the token or inherited from a group; tools "MUST NOT" guess the type from the value; optional `$description`, `$extensions`, `$deprecated` (boolean or explanation string). **Verified (fetched).** https://www.designtokens.org/tr/drafts/format/
- **`$extensions`.** Optional vendor-specific object; reverse domain notation is recommended for keys. **Verified (fetched).** https://www.designtokens.org/tr/drafts/format/
- **Aliases.** Two forms: curly-brace `{group.token}` (resolves to the target token's `$value`, can only target whole tokens) and JSON Pointer `$ref` (can target sub-properties such as one color component). Circular references must be reported as errors. **Verified (fetched).** https://www.designtokens.org/tr/drafts/format/
- **Types in the draft.** `dimension` is an object `{ "value": number, "unit": "px" | "rem" }`; `fontWeight` is a number 1-1000 or an alias like `bold` (700); `fontFamily` is a string or an array; `duration` is `{value, unit: ms|s}`; `cubicBezier` is four numbers; composites include shadow (array allowed), border, transition, strokeStyle, gradient, typography. **Verified (fetched).** https://www.designtokens.org/tr/drafts/format/
- **Gradient.** `$type: gradient`, value is an array of stops, each with `color` and `position` 0 to 1 (clamped). The spec does not say whether a gradient is linear, radial or conical; that is open feedback (issue 101). So angle or shape has to go in `$extensions` or in the CSS layer. **Verified (fetched).** https://www.designtokens.org/tr/drafts/format/ (second page of the fetch)
- **Color module.** Separate module, 2025.10. `colorSpace` values include `srgb`, `hsl`, `oklab`, `oklch`, `display-p3`; `components` array; optional `alpha` 0-1; optional 6-digit `hex` fallback. **Verified (fetched).** https://www.designtokens.org/tr/drafts/color/
- **Modes / theming.** The Format module text I read does not cover themes. There is a separate **Resolver module** (2025.10 draft, same "do not implement" preview notice). It describes "modifiers" (named contexts such as light and dark) that point to token sources, an `input` that selects a context, and a `resolutionOrder`; an example axis is light/dark, screen size or accessibility modes. **Verified (fetched).** https://www.designtokens.org/tr/drafts/resolver/
- **Recommendation.** Do not depend on the Resolver yet. Model modes as two parallel semantic files with identical token names and let Style Dictionary emit two CSS selectors. This is easy to migrate later because the names stay the same.

### 1.2 Style Dictionary v4 (DTCG to CSS variables)

- **DTCG support.** "First-class support for the DTCG format" since v4; the latest DTCG format (2025.10) is "not fully supported yet", full support is a work in progress for v5. A conversion tool renames `value/type/description` to `$value/$type/$description`. **Verified (fetched).** https://styledictionary.com/info/dtcg/
- **Config shape.** `source` (array of globs, deep-merged; JSON, JSON5, ESM), `platforms` (each with `transformGroup` or `transforms`, `buildPath`, `files`), platform- and file-level `options`, `usesDtcg` (usually auto-detected), `preprocessors`. **Verified (fetched).** https://styledictionary.com/reference/config/
- **`css/variables` format.** Options: `outputReferences` (default false; keeps `a -> b -> c` references), `outputReferenceFallbacks`, `selector` (string or array), `sort`, `formatting`. Example output is a `:root` block of custom properties. **Verified (fetched).** https://styledictionary.com/reference/hooks/formats/predefined/
- **`css` transform group.** Includes `name/kebab`, `color/css`, `size/rem`, `fontFamily/css`, `cubicBezier/css`, `border/css/shorthand`, `typography/css/shorthand`, `shadow/css/shorthand` and others. **Verified (fetched).** https://styledictionary.com/reference/hooks/transform-groups/predefined/
- **Default preprocessors.** `typeDtcgDelegate` ensures each DTCG token has a `$type` (own or inherited); `expandObjectTokens` expands composite tokens when enabled. **Verified (fetched).** https://styledictionary.com/reference/hooks/preprocessors/
- **Recommendation (sketch).** Three files out: primitives on `:root`, semantic light on `:root, [data-theme="light"]`, semantic dark on `[data-theme="dark"]`. Use `outputReferences: true` for the semantic files so `--color-text-primary: var(--color-neutral-50)` stays traceable in devtools and in the CSS an AI reads.

```js
// style-dictionary.config.mjs (sketch, not tested)
export default {
  source: ['tokens/primitive/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/tokens/',
      files: [
        { destination: 'primitives.css', format: 'css/variables',
          filter: (t) => t.filePath.includes('/primitive/') },
      ],
    },
  },
};
// plus two more builds whose source is primitive + semantic/light or semantic/dark,
// with options { outputReferences: true, selector: '[data-theme="dark"]' }
```

### 1.3 Figma Variables

- **Types.** Color, number, string, boolean, timing, easing. **Verified (fetched).** https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes
- **Aliasing.** A variable can reference another variable of the same type, which "supports design tokens". **Verified (fetched).** Same page.
- **Collections and modes.** A collection holds variables and modes; groups organize variables inside a collection; up to 5,000 variables per collection; a mode is one value per variable (examples: light/dark, language, device size). **Verified (fetched).** Same page.
- **Mode limits.** Modes are available on Education, Professional, Organization, Enterprise plans; the count per collection depends on plan (not listed on the page). **Verified (fetched).** https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables
- **Scoping.** Color variables can be scoped to frame fill, shape fill, stroke, text fill, effects; number variables to properties such as corner radius; string variables to text content; set via Edit variable, Scope tab. The plugin API names these `ALL_FILLS`, `FRAME_FILL`, `SHAPE_FILL`, `TEXT_FILL`, `STROKE_COLOR`, `TEXT_CONTENT` (`ALL_SCOPES` cannot be combined). **Verified (snippet)** from a search summary citing https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables-and-collections and https://developers.figma.com/docs/plugins/api/VariableScope/ . Re-check against the pages.
- **Recommendation (Figma structure).** Collection `Primitives` (one mode; scoped to nothing so designers cannot apply them directly, i.e. hide from publish or leave scope empty) and collection `Semantic` (modes `Light` / `Dark`, every value an alias to a primitive). Mirror the JSON names with `/` as the group separator so a Figma export maps one-to-one to the DTCG tree.

### 1.4 Tailwind 3 mapping

- **Opacity modifiers with CSS variables.** Docs say define variables "as just the color channels" with no color function (`--color-primary: 255 115 179;`) and reference them as `'rgb(var(--color-primary))'`; including the color function breaks opacity modifiers. **Verified (fetched).** https://v3.tailwindcss.com/docs/customizing-colors
- **`<alpha-value>` placeholder.** I could not find it on the Tailwind v3 docs pages I fetched. It is implemented in the Tailwind v3.4.17 source: any string color value containing `<alpha-value>` becomes a function that replaces every occurrence with the opacity value (default 1). **Verified (fetched)** from source: https://raw.githubusercontent.com/tailwindlabs/tailwindcss/v3.4.17/src/util/pluginUtils.js (`parseColorFormat`). So `'rgb(var(--color-brand-600) / <alpha-value>)'` works, but is documented only in code in what I checked.
- **darkMode.** v3.4: `media` (default), `selector` (replaced `class` in v3.4.1), `variant` for custom selectors; example `darkMode: ['selector', '[data-mode="dark"]']`. **Verified (fetched).** https://v3.tailwindcss.com/docs/dark-mode . The repo has `darkMode: 'class'`; it still works but `selector` is the current name.
- **Cost of the channel approach.** Variables must hold space-separated channels, so Style Dictionary needs a custom transform or format to emit `50 95 236` instead of `#325FEC`. **Recommendation:** emit a second file `tokens.channels.css` for Tailwind-facing color tokens, or use `color-mix(in srgb, var(--x) 50%, transparent)` for alpha in hand-written CSS (`color-mix` is Baseline widely available since May 2023, https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix ). **Verified (fetched).**
- **Recommendation (Tailwind config).**

```ts
// tailwind.config.ts (sketch)
darkMode: ['selector', '[data-theme="dark"]'],
theme: {
  colors: {            // replace, do not extend: forbid raw palette in components
    transparent: 'transparent', current: 'currentColor',
    surface: { base: 'rgb(var(--surface-base) / <alpha-value>)', raised: '...', overlay: '...' },
    content: { primary: '...', secondary: '...', muted: '...', 'on-brand': '...' },
    line: { subtle: '...', default: '...', strong: '...', focus: '...' },
    brand: { DEFAULT: '...', hover: '...', active: '...', subtle: '...' },
    status: { success: '...', warning: '...', danger: '...', info: '...' },
  },
}
```

Replacing `theme.colors` (instead of `extend`) means `bg-blue-600` stops compiling, so the primitive tier cannot leak into components. **Recommendation.**

---

## 2. Primitives

### 2.1 Scale construction references

- **Radix Colors 12-step.** Steps: 1 app background; 2 subtle background; 3 UI element background; 4 hovered UI element background; 5 active/selected UI element background; 6 subtle borders and separators; 7 UI element border and focus rings; 8 hovered UI element border; 9 solid backgrounds (purest, highest chroma); 10 hovered solid; 11 low-contrast text; 12 high-contrast text. **Verified (fetched).** https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Radix says its scales are "not intended to be customised"; the advice is to keep Radix for gray and semantic colors and add a custom brand scale alongside, then pick a gray (neutral, or tinted toward the accent). Semantic suggestions: error red/ruby/tomato/crimson; success green/teal/jade/grass/mint; warning yellow/amber/orange; info blue/indigo/sky/cyan. **Verified (fetched).** https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette
- Radix file usage: CSS variables like `var(--blue-4)`, `var(--blue-11)`, separate `*-dark.css` files, `.dark` class for dark scales. **Verified (fetched).** https://www.radix-ui.com/colors/docs/overview/usage
- **Material tonal palettes / HCT.** HCT is "a new color space (hue, chroma, tone) based on CAM16 x L*, that accounts for viewing conditions"; a tonal palette is a "range of colors that varies only in tone". **Verified (fetched).** https://github.com/material-foundation/material-color-utilities . The Material 3 color roles page and the tone numbers it uses did not render (only a title came back): **UNVERIFIED** at https://m3.material.io/styles/color/roles .
- **Apple HIG color.** The page did not render; only a title came back. Guidance on semantic colors, dark mode, and contrast from Apple is therefore **UNVERIFIED**: https://developer.apple.com/design/human-interface-guidelines/color .
- **Tailwind palette.** The v3 default palette is 50-950 per hue (11 steps). I did not verify this on a Tailwind page in this session, so treat the step list as **UNVERIFIED**; the shape (50, 100..900, 950) is the one the brief asks for.

**Recommendation.** Use 11 steps named 50-950 (Tailwind-shaped, familiar to Claude) but assign them Radix-like jobs (a documented step-to-role table, below). Build the scale in OKLCH so lightness steps are perceptually even, then store hex in JSON for Style Dictionary compatibility. Pin step 600 to the existing brand `#325FEC` and step 500 to the existing `#518FFF`.

### 2.2 Proposed brand-blue scale (Calculated, OKLCH hue 265)

Anchors measured in this session: `#325FEC` is about OKLCH L 0.543, C 0.218, H 265; `#518FFF` is about L 0.664, C 0.178, H 261. Hex values below are a first draft generated from an OKLCH ramp; tune by eye.

| Step | Hex | Contrast on white | Contrast on #09090B | Suggested job |
|---|---|---|---|---|
| 50 | `#EFF5FF` | 1.10 | 18.17 | light app tint |
| 100 | `#DDE8FF` | 1.23 | 16.16 | light chip fill |
| 200 | `#C1D8FF` | 1.44 | 13.77 | light hover tint |
| 300 | `#9EC0FF` | 1.84 | 10.84 | light border accent |
| 400 | `#7CA7FF` | 2.38 | 8.36 | dark-mode hover text |
| 500 | `#518FFF` (pinned; draft ramp gives `#5D8CFF`) | 3.12 | 6.37 | dark-mode brand text and icons |
| 600 | `#325FEC` (pinned) | 5.27 | 3.77 | primary fill, white text on it passes |
| 700 | `#224AC0` | 7.48 | 2.66 | primary hover/pressed |
| 800 | `#193990` | 10.35 | 1.92 | deep tile fill |
| 900 | `#14295F` | 13.89 | 1.43 | deep glass tint |
| 950 | `#0A183B` | 17.40 | 1.14 | darkest blue panel |

Contrast formula: WCAG relative luminance ratio, https://www.w3.org/TR/WCAG22/ (1.4.3 defines the thresholds; the formula itself I applied from the standard definition and did not re-fetch).

### 2.3 Neutral scale

Existing dark neutrals are `#09090B / #121214 / #18181B / #27272A` plus text `#FAFAFA / #D4D4D8 / #A1A1AA / #71717A`. These look zinc-based (**UNVERIFIED** against Tailwind's zinc, not checked). Calculated contrasts on `#09090B`: `#FAFAFA` 19.06, `#D4D4D8` 13.46, `#A1A1AA` 7.76, `#71717A` 4.12, `#52525B` 2.57, `#27272A` 1.34.

**Recommendation.** Keep the zinc-like neutrals but name them `neutral-0..950` and add the missing middle steps so a control border can reach 3:1. A step near `#52525B` (2.57) is still short; a control border on `#09090B` needs roughly `#5E5E66` or lighter to hit 3:1 (calculate when choosing). The light-mode ramp in the repo (`#EAEEF4`, `#FAFBFD`, `#D2DCEA`) is blue-tinted; decide whether light mode gets its own cool-tinted neutral ramp (`slate`-like) or reuses the zinc ramp. The reference images lean cool grey on light surfaces, so a tinted light ramp fits.

### 2.4 Second brand color

**Recommendation: amber "Highlight".**
- Why: royal blue is hue 265; amber (about hue 80) is near its complement, so it gives a clear secondary without competing; the product's core act is highlighting and clipping text, so a highlighter yellow-amber has a literal meaning (clip marks, citation highlights, "new" dots); it has high contrast on dark.
- Candidates, all Calculated: `#F5B83D` (OKLCH L 0.819, C 0.150, H 80) is 11.19:1 on `#09090B`, 1.78:1 on white; `#FFC857` 12.93:1; `#E5A100` 8.93:1 on dark, 2.23:1 on white. Amber never takes white text. Use dark text (`#09090B`) on amber fills, which passes comfortably.
- Light mode: amber text on white fails, so in light mode amber is a fill or a marker behind dark text, never text color.
- Conflict: current `--semantic-warning-default` is `#F5A623`. Either move warning toward orange/red-orange (hue about 45-55) with a required icon, or choose violet for the secondary. Violet candidates (Calculated): `#7C5CFA` 4.52:1 on `#09090B` and 4.40:1 on white (borderline both ways), `#9B87FF` 6.92:1 on dark. Violet is also the usual AI-product color, which makes it generic.
- Reference images already use pastel mint, peach, lavender, coral chips and a green success accent. Treat those as a separate **category/tag palette** (6-8 low-chroma hues, see Reference image observations), not as brand colors.

### 2.5 Font-weight and font tokens

- DTCG `fontWeight` accepts 1-1000 or aliases like `bold` (700), `thin` (100); invalid values must be rejected. **Verified (fetched).** https://www.designtokens.org/tr/drafts/format/
- **Recommendation.** Store numeric weights only: `weight.regular 400`, `medium 500`, `semibold 600`, `bold 700`. Figtree is a variable font (**UNVERIFIED** here, check the Google Fonts page), so declare the weight axis range in `@font-face` and keep to four weights to limit shift. Note `tailwind.config.ts` currently maps `display` to JetBrains Mono, which contradicts the Figtree-only headline look in the reference images; decide whether headlines are Figtree.

### 2.6 Gradient tokens

- Use DTCG `gradient` stops for color ramps (stops in 0 to 1). Angle, shape, and interpolation space are not in the draft, so store them in `$extensions` (e.g. `"com.researchie": { "kind": "linear", "angle": "160deg", "space": "oklab" }`) and let the build emit CSS `linear-gradient(160deg in oklab, ...)`. **Recommendation.** CSS color interpolation in `oklab` or `oklch` is what `color-mix()` defaults to (oklab), https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix ; whether `linear-gradient(... in oklab ...)` is Baseline was not verified here (**UNVERIFIED**).
- Proposed primitives: `gradient.brand.deep` (950 to 800 to 600), `gradient.sky` (200 to 500, light hero), `gradient.glow.edge` (transparent to 400 to transparent, used by the edge-light border).

---

## 3. Semantics

### 3.1 Naming (borrowing proven systems)

- **shadcn/ui.** Tokens are semantic and paired: each surface token has a `-foreground` partner (`primary` / `primary-foreground`); core set covers background, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, five chart colors, `sidebar-*`; single `--radius` drives a scale; dark values override the same names under `.dark` in oklch; custom tokens are added under `:root`/`.dark` and exposed with `@theme inline`. **Verified (fetched).** https://ui.shadcn.com/docs/theming
- **Carbon.** Core tokens are named for the element they style (`$background`, `$text-primary`, `$border-interactive`); state suffixes (`-hover`, `-active`, `-selected`, `-inverse`); layer tokens `$layer-01/02/03` stack on `$background`; four themes (White, Gray 10, Gray 90, Gray 100); component tokens "should never be used for anything other than their own component"; there is also an AI token group (general AI, chat, chat button). **Verified (fetched).** https://carbondesignsystem.com/elements/color/tokens/
- **Primer.** Tokens ship as CSS variables like `--fgColor-default`, in `base/` and `functional/` layers; themes via `data-color-mode`, `data-light-theme`, `data-dark-theme`; nine themes down to `dark_tritanopia`. **Verified (fetched).** https://primer.style/foundations/primitives/getting-started
- **Material 3 tiers** (reference, system, component) are named on the page title but the body did not render: **UNVERIFIED**. https://m3.material.io/foundations/design-tokens/overview
- **Polaris.** Page redirected; **UNVERIFIED**. https://shopify.dev/docs/api/polaris

**Recommendation: naming grammar** `category.role[.variant][.state]`, e.g. `surface.raised`, `surface.overlay`, `content.primary`, `content.on-brand`, `line.default`, `line.strong`, `brand.default`, `brand.hover`, `brand.subtle`, `status.success.fill`, `status.success.content`, `focus.ring`. Use `content` (or `text`) for foregrounds, `line` or `border` for strokes. Pick one and ban synonyms (the Anthropic skills guide explicitly asks for consistent terminology, see section 6). Always define a foreground partner for each filled surface (shadcn pattern), and layered surfaces `surface.base / raised / overlay` (Carbon layer idea) instead of numbered card tokens.

### 3.2 Light vs dark mapping

- Define the same semantic names in two files. Mechanism options, all CSS: `prefers-color-scheme`, a `[data-theme]` attribute, or `light-dark()`. `light-dark()` is Baseline 2024 (newly available since May 2024) and requires `color-scheme: light dark` on the element (set on `:root`). **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
- **Recommendation.** Use `[data-theme]` + Style Dictionary output (works for Tailwind 3 `darkMode: selector`, works in the Chrome extension Shadow DOM since the attribute can sit on the shadow host). Do not mirror light to dark by inverting the ramp mechanically: dark surfaces step up in lightness for elevation (`#09090B` canvas, `#121214` raised, `#18181B` overlay, as the repo already does) while light surfaces step by shadow and border.

### 3.3 Component state rules

**Recommendation** (my rule set; Radix's published step jobs are the sourced basis: 3 normal, 4 hover, 5 active/selected, 7-8 borders/focus rings, 9 solid, 10 hovered solid):

| State | Fill (solid button) | Fill (ghost/subtle) | Border | Notes |
|---|---|---|---|---|
| default | `brand.default` (600) | transparent or `surface.raised` | `line.default` | |
| hover | `brand.hover` (one step darker, 700) | `surface.hover` | `line.strong` | no layout shift |
| active/pressed | `brand.active` (700 or 800) | `surface.active` | `line.strong` | `transform: scale(0.98)` optional |
| focus-visible | unchanged | unchanged | n/a | 2px ring `focus.ring` + 2px offset, see 3.4 |
| disabled | 40% opacity or `content.disabled` on `surface.disabled` | same | `line.subtle` | exempt from contrast rules but keep legible; do not rely on color alone |
| selected | `brand.subtle` fill + `brand.default` line | same | | add a non-color cue (check, bar) |

### 3.4 WCAG 2.2 thresholds

All from https://www.w3.org/TR/WCAG22/ unless noted (**Verified (fetched)**):
- **1.4.3 Contrast (Minimum), AA:** text and images of text 4.5:1; large-scale text 3:1; incidental text, logotypes and pure decoration exempt.
- **1.4.11 Non-text Contrast, AA:** visual information needed to identify UI components and states, and graphic parts needed to understand content, 3:1 against adjacent colors; inactive components exempt.
- **1.4.1 Use of Color, A:** color is not the only visual means of conveying information.
- **2.4.11 Focus Not Obscured (Minimum), AA:** a focused component must not be entirely hidden by author-created content; sticky headers/footers are the typical offenders. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- **2.4.13 Focus Appearance, AAA** (so it is in WCAG 2.2 but not required at AA): indicator area at least a 2 CSS pixel thick perimeter of the unfocused component, and at least 3:1 change in contrast between focused and unfocused pixels. https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- **2.5.8 Target Size (Minimum), AA:** pointer targets at least 24 by 24 CSS px, with a spacing exception. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- **`:focus-visible`** is Baseline widely available (since March 2022); do not remove focus styles; MDN ties it to the 3:1 requirement of 1.4.11. https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- **APCA** (candidate method for WCAG 3, not final): body text Lc 90 preferred, Lc 75 minimum; Lc 60 for other readable text; Lc 45 for headlines and large heavy text; Lc 45 for fine pictograms, Lc 30 for large solid icons; Lc 15 absolute minimum for discernible non-text such as dividers. https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html **Verified (fetched).**
- **Recommendation.** Treat WCAG 2.2 AA as the gate (it is the conformance standard); use APCA only as a second opinion for dark-mode text and status colors, and record both numbers in the token's `$extensions` (`"com.researchie": { "contrast": { "on": "surface.base", "wcag": 6.37 } }`).

**Contrast results for the current system (Calculated):** see Summary item 4. Also white on `#325FEC` is 5.27:1 (passes), `#518FFF` on `#121214` is 5.99:1, white on `#518FFF` is 3.12:1 (so a lighter blue fill needs dark text, or stay with 600 for fills).

**Status colors.** Existing: success `#1B8748` (4.56:1 on white, 4.36 on `#09090B`), danger `#C92A2A` (5.46 on white, 3.65 on dark). **Calculated.** So the light-mode defaults pass as text on white but need lighter dark-mode counterparts (e.g. `#4ADE80` 11.42:1 and `#F87171` 7.19:1 on `#09090B`, Calculated). Status must also carry an icon or label (1.4.1).

---

## 4. Type, spacing, grid, radius

- **Modular scale.** A scale is a base and a ratio; common ratios: minor third 1.2, major third 1.25, perfect fourth 1.333, golden section 1.618, minor second 1.067, major second 1.125, perfect fifth 1.5, octave 2. **Verified (fetched).** https://www.modularscale.com/ . **Recommendation:** base 16px, ratio 1.2 (minor third) for the app and a bigger ratio (1.333 or 1.5) for the marketing/slide display sizes; round to whole px and store the result as explicit tokens (`font.size.xs..5xl`) rather than computing at runtime. Tailwind's default scale is not a modular scale (text-xs is 0.75rem with 1rem line height, up to text-9xl at 8rem; large sizes use line-height 1): https://v3.tailwindcss.com/docs/font-size **Verified (fetched).** Material 3 type roles (display, headline, title, body, label) are named but values did not render, **UNVERIFIED**: https://m3.material.io/styles/typography/type-scale-tokens . Recommendation: reuse those five role names for semantic type tokens, because Claude knows them.
- **Spacing.** Tailwind: one unit equals `0.25rem` (`4px` at default root size). **Verified (fetched).** https://v3.tailwindcss.com/docs/customizing-spacing . **Recommendation:** 4px base, with a named subset (`space.1`=4, 2=8, 3=12, 4=16, 6=24, 8=32, 12=48, 16=64) and a rule that component padding uses the 4/8 multiples.
- **Breakpoints.** Tailwind v3 defaults: sm 640, md 768, lg 1024, xl 1280, 2xl 1536. **Verified (fetched).** https://v3.tailwindcss.com/docs/screens . Android/Material window size classes: compact below 600dp, medium 600 to 839, expanded 840 to 1199, large 1200 to 1599, extra-large 1600+; "optimize for expanded first". **Verified (fetched).** https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes . **Recommendation:** keep Tailwind's defaults (no migration cost) and document them as tokens; add a `container` max width (e.g. 1200).
- **12-column grid.** I did not find a primary source for gutter/margin values in this session; **UNVERIFIED**. **Recommendation:** 12 columns, gutter 16 (mobile) / 24 (desktop), outer margin 16 / 24 / 32, all on the 4px grid; verify against Material's layout guidance before publishing.
- **Corner radius ratios.**
  - `border-radius` can be refined with `corner-shape`; `corner-shape: squircle` equals `superellipse(2)`, borders/shadows/clipping follow, but it is **experimental, limited availability, not Baseline**; use behind `@supports (corner-shape: squircle)`. **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/CSS/corner-shape
  - Continuous corners: a squircle's perimeter curvature is continuous, a rounded square's is not; Apple moved icons from rounded squares to squircles with iOS 7; the Figma article says smoothing parameter 0.6 "just about nails the iOS shape". **Verified (fetched).** https://www.figma.com/blog/desperately-seeking-squircles/
  - Nested radius rule: inner radius = outer radius minus the padding between them (clamped at 0). This is geometry, not a cited rule; **Recommendation.** Encode it in a token or a Tailwind plugin (`radius.inner = calc(var(--radius-outer) - var(--space-padding))`) so nested cards, tiles inside glass panels and chips inside cards stay concentric.
  - **Recommendation:** radius scale 4 / 8 / 12 / 16 / 24 / 999, with card = 16, input/button = 10-12, chip = 999 (reference images use pills and 16-24 cards). In Figma use corner smoothing 60% on cards to match.

---

## 5. Glass, blur and light effects

- **`backdrop-filter`.** Applies filter functions to what is behind the element; the element or its background must be transparent or partially transparent; Baseline 2024 ("newly available" since September 2024). **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- **Backdrop roots (common failure).** The filter only sees content up to the nearest backdrop root; an ancestor with `opacity` below 1, `filter`, `mask`, `clip-path`, `mix-blend-mode` other than normal, or `will-change` for those becomes a root, so the blur silently shows nothing or less than expected. **Verified (fetched).** Same page. This matters in the extension (Shadow DOM host) and with animated parents.
- **Edge-light border (gradient border).** The padding-box / border-box layering pattern with a transparent border, as shown on MDN's `background-clip` page: top layer clipped to `padding-box`, gradient layer clipped to `border-box`. MDN notes this pattern is "general CSS practice" and not documented in detail there. **Verified (fetched)** for `padding-box`/`border-box` semantics, https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip . For a gradient ring on a transparent glass interior (no solid inner layer), use a pseudo-element with a gradient background and `mask-composite: exclude` (or `subtract`) against a content-box mask; `mask-composite` is Baseline widely available since December 2023. **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/CSS/mask-composite
- **Inset highlight.** `inset` shadows draw inside the padding box above the background and below content; multiple shadows are comma-separated with the first on top. A 1px inset white at 10-20% alpha on the top edge plus an outer low-alpha blue glow gives the glassy edge light. **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
- **Grain / noise.** `feTurbulence` generates Perlin noise; `type="fractalNoise"` gives soft cloud-like results, `turbulence` sharper; `baseFrequency` (lower is smoother), `numOctaves` (more layers cost more), `stitchTiles="stitch"` makes it tile; default color interpolation is linearRGB. **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence . **Recommendation:** ship noise as one small tiled SVG data URI (for example `baseFrequency` about 0.8, `numOctaves` 2-3, `stitch`) overlaid at 3-6% opacity with `mix-blend-mode: overlay` or `soft-light`; do not apply the SVG filter directly to large live elements. Note `mix-blend-mode` other than normal makes a backdrop root (see above), so place the grain on a sibling layer, not on the glass panel itself.
- **User preferences and fallbacks.**
  - `prefers-reduced-transparency` (`no-preference | reduce`) is **experimental, limited availability**, not Baseline. **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency
  - `prefers-contrast` (`more | less | custom | no-preference`) is Baseline widely available since May 2022. **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast
  - `forced-colors: active`: author colors replaced by system colors; `box-shadow` and `text-shadow` forced to `none`; non-URL `background-image` forced to `none`; the page does not say how `backdrop-filter` is handled. **Verified (fetched).** https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
  - **Recommendation:** under `reduce` transparency and `prefers-contrast: more`, set glass fill to opaque `surface.overlay`, `backdrop-filter: none`, border to `line.strong`; under `forced-colors`, add a real `border: 1px solid CanvasText`/`ButtonText` since the shadow-based edge light disappears. Because `prefers-reduced-transparency` has limited support, the default styling must already be legible when blur fails (opaque-enough fill, at least 80% alpha behind text).
- **Performance.** I found no primary source (web.dev, Chrome, spec) in this session. Third-party sources claim cost scales with blurred area and radius, large animated or scrolling blurs are the worst case, and radius above about 20px adds little. **UNVERIFIED** (third-party only: https://blog.openreplay.com/creating-blurred-backgrounds-css-backdrop-filter/ ). **Recommendation:** measure in Chrome DevTools Performance on a mid-range laptop; cap blur at 12-24px; at most 2-3 blurred layers on screen; none on long scrolling lists, none in the content-script overlay on arbitrary host pages (host pages are the unknown).
- **WebGL / shaders.** Optional marketing-hero only, lazy loaded, with a static CSS fallback image. No source needed; this is a **Recommendation**.
- **Token shape (Recommendation).** `effect.glass.fill` (rgba), `effect.glass.blur` (dimension), `effect.glass.edge` (gradient + 1px), `effect.glass.inner-highlight` (shadow), `effect.noise.opacity`. Build as CSS custom properties; compose in one `.glass` component class.

---

## 6. AI-readable documentation

### 6.1 Conventions and what the primary sources say

- **AGENTS.md.** Open plain-Markdown "README for agents", no required fields, stewarded by the Agentic AI Foundation under the Linux Foundation; recommended content: overview, build/test commands, code style, testing, security; the nearest file in the tree wins; an explicit user prompt overrides it; many tools read it (Codex, Cursor, Copilot coding agent, Gemini CLI, Aider, Zed and others). **Verified (fetched).** https://agents.md/
- **CLAUDE.md in Claude Code.** Can read a repository's `AGENTS.md` in place of CLAUDE.md; loaded every session; "target under 200 lines per CLAUDE.md file"; longer files reduce adherence; imports with `@path` are expanded at launch (so they organize but do not reduce context cost), max depth four hops; `.claude/rules/*.md` files are discovered recursively and can be scoped by `paths:` frontmatter so they load only when matching files are touched; conflicting instructions may be resolved arbitrarily. **Verified (fetched).** https://code.claude.com/docs/en/memory
- **Agent Skills.** `SKILL.md` frontmatter needs `name` (max 64 chars, lowercase letters/digits/hyphens) and `description` (max 1,024 chars, say what and when, third person); keep SKILL.md body under 500 lines; progressive disclosure with reference files one level deep; give files a table of contents when over 100 lines; use consistent terminology; prefer scripts for deterministic checks; add validation loops; avoid too many options (give a default). **Verified (fetched).** https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- **llms.txt.** A Markdown file at a site root or subpath: required H1, then a blockquote summary, optional free text, then H2 sections of `[name](url): notes` links, with an `Optional` section for skippable links; pages may have `.md` twins. Meant for inference-time use on docs sites. **Verified (fetched).** https://llmstxt.org/
- **shadcn registry.** Described as a way to distribute "components, hooks, pages, config, rules and other files" via the CLI; the schema pages (registry.json, registry-item.json, theme items, `cssVars`, MCP) did not load: **UNVERIFIED** beyond that sentence. https://ui.shadcn.com/docs/registry . Its theming doc (section 3.1) is the sourced model for CSS-variable semantic tokens with paired foregrounds.
- **Machine-readable token precedents.** Carbon documents AI-specific tokens (general AI, chat, chat button) next to core tokens. **Verified (fetched).** https://carbondesignsystem.com/elements/color/tokens/ . Primer lists an MCP server under Foundations in its nav, content not read: **UNVERIFIED**. https://primer.style/foundations/primitives/getting-started
- **DESIGN.md.** I found no primary specification for a "DESIGN.md" convention in this session; the repo's own `design.md` and `DESIGN_SYSTEM.md` are the only precedent here. Treat the name as a local convention. **UNVERIFIED** as an external standard.

### 6.2 Recommended file layout (Recommendation)

```
tokens/
  primitive/
    color.blue.json        # 50-950
    color.neutral.json
    color.amber.json       # second brand
    color.status.json      # green, red, orange (+ tag pastels)
    typography.json        # family, weight, size, line-height
    space-radius.json
    effect.json            # blur, glow, noise primitives, gradients
  semantic/
    light.json             # same names as dark.json
    dark.json
    shared.json            # mode-independent: type roles, radius roles, motion
  tokens.manifest.json     # list of names, types, one-line "use for", $deprecated flags
style-dictionary.config.mjs
src/styles/tokens/         # GENERATED, do not edit: primitives.css, light.css, dark.css, channels.css
docs/DESIGN_TOKENS.md      # human + AI rules (see below), under ~200 lines
docs/design-tokens/        # one-level-deep references: color.md, type.md, effects.md, components.md
AGENTS.md                  # 20-40 lines: points at docs/DESIGN_TOKENS.md, lists commands
CLAUDE.md                  # existing; add one `@docs/DESIGN_TOKENS.md` import (or keep as a link)
scripts/lint-tokens.mjs    # fails on raw hex, primitive use in components, missing dark twin
.claude/rules/design-tokens.md  # `paths: ["src/components/**","src/app/**"]` so it loads only when editing UI
```

Contents of `docs/DESIGN_TOKENS.md` (hard rules, each with a one-line why):
1. Components use semantic tokens only (`bg-surface-raised`, never `bg-blue-600`, never hex).
2. Every filled surface pairs with its foreground token; do not choose text color yourself.
3. Interactive states per section 3.3; focus ring is `focus-visible`, 2px, 2px offset, 3:1.
4. Glass only through `.glass` / `effect.glass.*`, with the three fallbacks.
5. Use the 4px spacing scale and the radius roles; nested radius = outer minus padding.
6. A table: token name, light value, dark value, use-for, do-not-use-for.
7. A short "how to add a token" checklist (edit JSON, run build, run lint, update manifest).

`tokens.manifest.json` is the piece that helps Claude most: a flat list with `name`, `type`, `use`, `avoid`, `pairsWith`, so it can search by intent without reading CSS. **Recommendation.**

Skill option: wrap the same material as a project skill (`.claude/skills/researchie-design/SKILL.md`, under 500 lines, name in lowercase-hyphen form, description saying when to use it, references one level deep to the `docs/design-tokens/*.md` files). Note the skills page forbids "claude"/"anthropic" in skill names. **Verified (fetched)** (same best-practices page above).

### 6.3 Verification loop (Recommendation, grounded in the skills guide's "validator then fix" pattern)

Add `npm run tokens:build` and `npm run tokens:lint` to `npm run verify`, plus a Playwright check that renders a "token gallery" page (`src/app/test-lab` already exists) in light, dark, `prefers-contrast: more`, and `forced-colors` and runs an axe contrast scan. The gallery doubles as the portfolio artifact.

---

## Reference image observations

Not cited; my description of the six reference images supplied with the brief.

1. **Glassy deep-blue tiles.** A grid of near-square rounded tiles in deep navy to royal blue; the focal tile has a bright glowing edge (thin cyan-white light along the top/side border and a soft outer bloom), while peripheral tiles are dimmer and lower contrast so attention falls on the center. Implies tokens: tile fill gradient 900 to 700, edge-light gradient, a dim state for non-focused tiles, glow shadow.
2. **Blue-grey gradient with line overlays.** A cool blue-grey gradient background with a thin square grid, large concentric circle outlines and visible film grain. Implies tokens: hairline pattern strokes at 5-10% alpha, noise overlay, a gradient primitive that shifts from slate to blue.
3. **Soft light-grey phone UI.** Light grey app background, saturated royal-blue cards, pill-shaped chips, and a high-contrast black headline. Implies a light-mode neutral ramp with a cool tint, strong text token near black, large radii, filled blue cards with white text (white on `#325FEC` is 5.27:1, Calculated).
4. **White card kit.** White cards on a pale background; royal blue primary buttons; light-blue tint chips; a green success accent. Implies `brand.subtle` (blue 100 fill, blue 700 text), `status.success`, the standard solid-button states.
5. **Bold blue slide.** A full-bleed royal blue slide with pastel pill chips in mint, peach, lavender and coral, and a clean white timeline panel. Implies a tag/category palette of pastel fills with dark text, and white panels as an inverted surface on brand blue.
6. **Sky-blue cloud hero.** A sky-blue hero with clouds, a frosted glass navigation bar (blur plus translucent white), and white cards with black buttons. Implies a light-mode glass variant (white at 30-60% alpha, blur, soft shadow), a black/inverse button style, and a `gradient.sky` primitive.

Cross-cutting: one dominant royal blue, high-contrast type, big rounded corners, pill chips, light as the primary signal for focus, grain used sparingly. The set mixes dark and light modes, so both semantic files need glass variants, not only dark.

---

## Open questions

1. Which DTCG color/dimension syntax should the JSON use: hex strings and `"16px"` strings (works with Style Dictionary v4 today, matches older drafts) or the 2025.10 object forms (spec-current but "not fully supported")? Test one build before committing.
2. Second color: amber (needs a warning-hue change) or violet (no collision, more generic)? Decide with a visual test on the actual tiles.
3. Is the headline font Figtree or JetBrains Mono? `tailwind.config.ts` and `globals.css` set `display` to JetBrains Mono, but the reference images use a clean geometric sans.
4. Does the Chrome extension's Shadow DOM need its own token build (CSS custom properties inherit through the shadow boundary, but fonts and `data-theme` placement need a test), and does `backdrop-filter` behave on arbitrary host pages (backdrop roots)?
5. Light mode: cool-tinted neutral ramp (slate-like) or reuse zinc? The existing `--canvas-bg #EAEEF4` suggests cool.
6. Status palette values for dark mode need contrast measurement for each state pair (fill, text, border), including colorblind checks.
7. Is the 12-column grid needed at all in a Next.js app that is mostly panels and canvas? No primary source for gutter values was found; verify against Material layout guidance if the grid stays.
8. Material 3 (roles, tiers, type scale), Apple HIG color, Polaris tokens, and shadcn registry schema pages did not render for the fetcher; re-read them in a browser if they will be cited in the portfolio.
9. Backdrop-filter performance has no primary source here; measure on target hardware.
10. Does the repo want the Figma library too, and who owns Figma-to-JSON sync (Figma Variables REST export versus JSON-first)? Not investigated beyond the Variables concepts above.

---

## Sources

W3C and standards
- DTCG Format Module draft: https://www.designtokens.org/tr/drafts/format/
- DTCG Color Module draft: https://www.designtokens.org/tr/drafts/color/
- DTCG Resolver Module draft: https://www.designtokens.org/tr/drafts/resolver/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WCAG 2.2 Understanding, Focus Appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- WCAG 2.2 Understanding, Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- WCAG 2.2 Understanding, Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- APCA in a Nutshell: https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html

Tooling docs
- Style Dictionary, config: https://styledictionary.com/reference/config/
- Style Dictionary, DTCG: https://styledictionary.com/info/dtcg/
- Style Dictionary, predefined formats: https://styledictionary.com/reference/hooks/formats/predefined/
- Style Dictionary, predefined transform groups: https://styledictionary.com/reference/hooks/transform-groups/predefined/
- Style Dictionary, preprocessors: https://styledictionary.com/reference/hooks/preprocessors/
- Figma, variables overview: https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes
- Figma, modes: https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables
- Figma, create and manage variables (scoping, snippet only): https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables-and-collections
- Figma plugin API, VariableScope (snippet only): https://developers.figma.com/docs/plugins/api/VariableScope/
- Figma blog, squircles: https://www.figma.com/blog/desperately-seeking-squircles/
- Tailwind v3, customizing colors: https://v3.tailwindcss.com/docs/customizing-colors
- Tailwind v3, dark mode: https://v3.tailwindcss.com/docs/dark-mode
- Tailwind v3, spacing: https://v3.tailwindcss.com/docs/customizing-spacing
- Tailwind v3, screens: https://v3.tailwindcss.com/docs/screens
- Tailwind v3, font size: https://v3.tailwindcss.com/docs/font-size
- Tailwind v3.4.17 source (`<alpha-value>`): https://raw.githubusercontent.com/tailwindlabs/tailwindcss/v3.4.17/src/util/pluginUtils.js

Design systems
- Radix, understanding the scale: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Radix, composing a palette: https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette
- Radix, usage: https://www.radix-ui.com/colors/docs/overview/usage
- Material Color Utilities (HCT, tonal palettes): https://github.com/material-foundation/material-color-utilities
- Material 3 pages (did not render): https://m3.material.io/styles/color/roles , https://m3.material.io/foundations/design-tokens/overview , https://m3.material.io/styles/typography/type-scale-tokens
- Android window size classes: https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes
- Apple HIG color (did not render): https://developer.apple.com/design/human-interface-guidelines/color
- shadcn/ui theming: https://ui.shadcn.com/docs/theming
- shadcn/ui registry: https://ui.shadcn.com/docs/registry
- Carbon color tokens: https://carbondesignsystem.com/elements/color/tokens/
- Primer primitives: https://primer.style/foundations/primitives/getting-started
- Polaris (redirected, not read): https://shopify.dev/docs/api/polaris
- Modular Scale: https://www.modularscale.com/

CSS and web platform (MDN)
- backdrop-filter: https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- prefers-reduced-transparency: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency
- prefers-contrast: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast
- forced-colors: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
- :focus-visible: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- color-mix(): https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix
- light-dark(): https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
- corner-shape: https://developer.mozilla.org/en-US/docs/Web/CSS/corner-shape
- box-shadow: https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
- background-clip: https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip
- mask-composite: https://developer.mozilla.org/en-US/docs/Web/CSS/mask-composite
- feTurbulence: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence

AI-readable docs
- AGENTS.md: https://agents.md/
- llms.txt: https://llmstxt.org/
- Claude Code memory / CLAUDE.md / rules: https://code.claude.com/docs/en/memory
- Agent Skills best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

Third-party (low authority, used only to flag the gap)
- backdrop-filter performance overview: https://blog.openreplay.com/creating-blurred-backgrounds-css-backdrop-filter/
