# Researchie — Multi-Modal Research Workspace & Web Extension

> Modern research workbench with seamless Chrome Extension capture, PDF Reader & Document Vault, automated OCR, AI synthesis, and spatial canvas.

---

## 🚀 Quick Setup & Development

### 1. Web Application
```bash
# Install dependencies
npm install

# Start Next.js Development Server (Runs on port 3001)
npm run dev -- -p 3001
```
- Open **Web Platform**: [http://localhost:3001](http://localhost:3001)
- Open **Test Sandbox**: [http://localhost:3001/sandbox/gorilla-research](http://localhost:3001/sandbox/gorilla-research)
- Open **DOM Test Lab**: [http://localhost:3001/test-lab](http://localhost:3001/test-lab)

### 2. Chrome Extension (Manifest V3)
1. Navigate to `chrome://extensions` in Google Chrome or Brave.
2. Enable **Developer Mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` folder from this repository.
4. Shortcuts available on any webpage:
   - <kbd>Alt + P</kbd>: Open Side Panel & Live Feed
   - <kbd>Alt + S</kbd>: Save Selected Text with W3C Deep Link
   - <kbd>Alt + L</kbd>: Capture Link
   - <kbd>Alt + I</kbd>: Pick Web Image
   - <kbd>Alt + B</kbd>: Pick DOM Element Container (<kbd>↑</kbd> parent / <kbd>↓</kbd> child)
   - <kbd>Alt + C</kbd>: Marquee Crop Screen Region

---

## 📂 Documentation & Context Index

For full context, architecture, decisions, and changelog, refer to the `docs/` directory:
- **[`docs/CONTEXT.md`](docs/CONTEXT.md)**: Current active project status, implementation matrix, and architecture.
- **[`docs/CHANGELOG.md`](docs/CHANGELOG.md)**: Detailed version history (`v1.0.0` through `v1.5.0`).
- **[`docs/RESEARCH_TOOL_PRD.md`](docs/RESEARCH_TOOL_PRD.md)**: Complete Product Requirements Document & UX specifications.
- **[`docs/DECISIONS.md`](docs/DECISIONS.md)**: Key architectural choices and data models.

---

## 🧪 Testing & Verification
```bash
# Run automated end-to-end test suite
node tests/testEndToEndSidepanel.mjs

# Run TypeScript typecheck
npx tsc --noEmit
```
