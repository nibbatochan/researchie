# design.md

**Project:** Researchie · **Lane:** Project · **Type:** Concept / Web Extension & Workspace  
**Sources:** 5 Master Brand & UI Reference Assets (Brand Color Swatches, Luminous Blue Refraction Cards, Poseidon Aerospace Atmospheric Blur, uxdam Dual-Mode Grayscales, KOAH GenAI Light Refractions)  
**Status:** Canonical Brand & UI Token Grounding File  

> All numeric values below are extracted from the supplied brand specifications and calibrated for implementation. Treat these as strict constraints for all downstream generations.

---

## 1. Master Brand Colors

| Role | Hex Code | RGB | Systematic Brand & UI Job |
| :--- | :--- | :--- | :--- |
| **Obsidian Black** | `#081116` | `8, 17, 22` | Deepest canvas void, marketing hero backdrop |
| **Midnight Black** | `#0A0E15` | `10, 14, 21` | Base dark surface (Black 100) for platform dark mode |
| **Royal Blue** | `#325FEC` | `50, 95, 236` | Solid primary brand actions, buttons, and structural anchors |
| **Electric Cyan Blue** | `#518FFF` | `81, 143, 255` | Specular edge refractions, active highlights, live text citations |
| **Pure White** | `#FFFFFF` | `255, 255, 255` | High-contrast typography & clean light-mode card surfaces |

---

## 2. Dual-Mode Grayscale Matrix (`uxdam` Standard)

### Light Mode Grayscale (White Ramp)
| Token Name | Hex Code | Assigned UI Job |
| :--- | :--- | :--- |
| **White 100** | `#FFFFFF` | Primary card surfaces, modal sheets, popups |
| **White 90** | `#F0F1F5` | Main application canvas, extension side panel background |
| **White 80** | `#E0E4EB` | Secondary surfaces, input backgrounds, inactive tabs |
| **White 70** | `#D1D6E0` | Default component borders, table dividers, stroke lines |
| **White 60** | `#BFC6D4` | Hover borders, subtle icons, disabled input containers |

### Dark Mode Grayscale (Black Ramp)
| Token Name | Hex Code | Assigned UI Job |
| :--- | :--- | :--- |
| **Black 100** | `#0A0E15` | Main dark canvas, extension side panel deep background |
| **Black 90** | `#202531` | Primary dark card surfaces, floating command bars |
| **Black 80** | `#37404F` | Secondary dark cards, active row highlights, input backgrounds |
| **Black 70** | `#4E5766` | Dark component borders, keylines, subtle separators |
| **Black 60** | `#667085` | Muted dark text, inactive icons, secondary timestamps |

---

## 3. Optical Physics: Refractions, Gradients, Blurs & Grids

### 3.1 Specular Refraction Rim Lighting (CSS Recipe)
```css
/* Luminous Refraction Card */
background: linear-gradient(135deg, rgba(20, 36, 64, 0.7) 0%, rgba(10, 14, 21, 0.85) 100%);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(81, 143, 255, 0.4);
box-shadow: 
  inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.6),
  inset 0 0 20px 0 rgba(81, 143, 255, 0.25),
  0 16px 36px -6px rgba(8, 17, 22, 0.7),
  0 0 24px -2px rgba(81, 143, 255, 0.35);
```

### 3.2 Master Gradients
- **Oceanic Momentum (Brand Hero):** `linear-gradient(135deg, #081116 0%, #0E223D 45%, #1D4ED8 80%, #518FFF 100%)`
- **Kinetic Prismatic Ray:** `radial-gradient(circle at 50% 0%, rgba(81, 143, 255, 0.4) 0%, rgba(50, 95, 236, 0.15) 50%, rgba(8, 17, 22, 0.95) 100%)`
- **Atmospheric Dispersion:** `radial-gradient(circle at 30% 30%, #518FFF 0%, #1D4ED8 40%, #081116 85%)`

### 3.3 Blur Tiers
- **Subtle (4px):** `backdrop-blur-sm` — Tooltips, small dropdowns.
- **Frosted Glass (12–16px):** `backdrop-blur-md` — Chrome Extension Side Panel, floating project switcher.
- **Atmospheric Glow (64–96px):** `blur-3xl` — Background ambient light orbs.

### 3.4 Spatial Grid
- **40px Orthogonal Grid:** `rgba(81, 143, 255, 0.08)` (Dark) / `rgba(209, 214, 224, 0.50)` (Light).
- **8pt Base Unit:** All margins, paddings, and card gaps snap strictly to `4px`, `8px`, `12px`, `16px`, `24px`, `32px`.

---

## 4. Type Scale

| Name | Size / Line Height | Weight | Letter Spacing | Applied Location | Font Family |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display 2XL** | 44px / 52px | Extrabold (800) | `-0.03em` | Marketing Hero Headline | `JetBrains Mono` |
| **Display XL** | 32px / 40px | Extrabold (800) | `-0.025em`| Workspace & Project View Header | `JetBrains Mono` |
| **Heading LG** | 22px / 28px | Bold (700) | `-0.02em` | Section Titles, Modal Headers | `JetBrains Mono` |
| **Heading MD** | 17px / 24px | Bold (700) | `-0.015em`| Note Card Titles, Side Panel Topics | `JetBrains Mono` |
| **Body Regular**| 13.5px / 20px | Medium (500) | `normal` | Captured text quotes, Timeline card body | `Figtree` |
| **Caption / Tag**| 11px / 14px | Bold (700) | `+0.04em` (UPPER)| Project tags, Status pills, Category tags | `Figtree` / `JetBrains Mono` |
| **Code / Selector**| 11.5px / 16px| Medium (500) | `normal` (Mono) | DOM Selectors (`div.pricing`), OCR strings | `JetBrains Mono` |

**Canonical Font Hierarchy:**
- **Headers & Display:** `JetBrains Mono` (Weights: 600, 700, 800)
- **Body, UI & Reading Text:** `Figtree` (Weights: 400, 500, 600)
- **Code, Selectors, Citations & Timestamps:** `JetBrains Mono` (Weights: 400, 500, 600)
- *(All other fonts like Plus Jakarta Sans or Inter are strictly prohibited)*

---

## 5. Three-Tier Distribution Matrix: Where What Applies

**Rule:** Visual intensity is inversely proportional to reading density.

1. **Marketing Website (`/web/landing`): 100% Visual Richness**
   - Full Oceanic & Prismatic gradients, specular rim refractions, animated glass cards, rich marketing spotlights.
2. **Chrome Extension Plugin (`/extension`): 40% Focused Visual Load**
   - Compact floating selection pill (`Alt + S`), 12px blur side panel, crisp electric cyan hover outlines (`#518FFF`). Zero heavy background gradients over host content.
3. **Web Platform Reading & Synthesis Workspace (`/app`): 15% Minimal Visual Load**
   - Monochromatic eye-comfort palette (`White 100/90` or `Black 100/90`). 
   - Pure, distraction-free reading typography.
   - Blue (`#325FEC` / `#518FFF`) is reserved **strictly** for interactive triggers (e.g. `Jump to text`, `Synthesize`).

---

## 6. Component System & Note Cards

- **Corner Radii:** `16px`–`20px` for cards & dialogs; `9999px` (Pill) for selection badges & filter tabs; `8px` for data chips & buttons.
- **The 4 Note Cards:**
  - *Text Clip:* Clean white card with left cyan citation accent, deep scroll-to-text link button (`#:~:text=`).
  - *DOM Layout Block:* Interactive component preview with monospaced CSS selector tag (`div.pricing-card`).
  - *Link Note:* Rich URL card with favicon, domain chip, and AI one-sentence takeaway.
  - *Image Note:* OCR crop thumbnail with selectable text extraction drawer.

---

## 7. Do NOT Inherit

- **No generic purple/lime candy pastels:** Strict adherence to Royal Blue (`#325FEC`), Electric Cyan (`#518FFF`), and Obsidian/Midnight (`#081116` / `#0A0E15`).
- **No low-contrast grey-on-dark:** All secondary text must meet WCAG AA (≥ 4.5:1 ratio).
- **No heavy refraction glows inside the reading stream:** Keep reading surfaces clean and calm.

---

## 8. Generation Constraints

Use only the type sizes, spacing steps, grayscale tokens, and brand roles defined above.
Do not introduce a new size, step, or colour. If something seems to need one, that is a hierarchy problem — solve it with the existing scale.

Fidelity is gated by session:
- S1–S2: structure only. Greyscale, system font, real content, no imagery, no brand.
- S3 onward: the full language above applies.
