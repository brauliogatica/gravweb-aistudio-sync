# V1 Security Review And V2 Plan

## V1 review

Scope reviewed:

- Root AI Studio app.
- `ia-studio/v1-helloworld`.
- Vite, package files, env examples and source entrypoints.

Result:

- The V1 app is intentionally small and compiles successfully.
- No real secrets were found in tracked source.
- `node_modules`, `dist`, logs and `.env*` are ignored.
- The first audit found moderate Vite/esbuild advisories in the nested V1 package.
- Vite and the React plugin were upgraded in root and nested V1.
- `npm audit` now reports 0 vulnerabilities in both root and `ia-studio/v1-helloworld`.

Security adjustments made:

- Removed client exposure of `process.env.GEMINI_API_KEY` from `vite.config.ts`.
- Removed unused AI dependencies from the root V1 app.
- Removed Tailwind, Express, dotenv, motion and GenAI from V1 because they are not needed yet.
- Replaced `.env.example` with a no-secrets note.
- Added package lock files for reproducible installs.

Verification:

```bash
npm install --ignore-scripts
npm run build
npm run lint
npm audit

cd ia-studio/v1-helloworld
npm install --ignore-scripts
npm run build
npm audit
```

## V2 goal

V2 should stop being only "Hello World" and become the first real controlled migration
of Gravweb. The scope must stay narrow:

- Page 1: analysis/map screen.
- Page 2: terrain demo screen.
- No full production migration yet.
- No backend secrets in the browser.
- No Auth0 client secret in source.
- No heavy data unless it is lazy-loaded from `public/demo` or a local API.

Status:

- V2 now lives in the repository root.
- `/analisis` and `/particles` are wired.
- The original migrated components were copied into `src`.
- The terrain demo data is loaded from `public/demo`.
- Google Maps is still optional through `VITE_GOOGLE_MAPS_API_KEY`.
- When no Google key exists, `/analisis` falls back to a local mode that keeps the
  polygon test flow functional.

## Recommended V2 structure

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    layout/
      Navbar.tsx
      ServiceStatus.tsx
    analysis/
      AnalysisToolbar.tsx
      ProjectDetailsPanel.tsx
      TerrainSearch.tsx
    terrain/
      TerrainControls.tsx
      TerrainViewer.tsx
  pages/
    AnalisisPage.tsx
    TerrenoDemoPage.tsx
  services/
    apiClient.ts
    config.ts
    demoProjectLoader.ts
  styles/
    app.css
    analysis.css
    terrain.css
  types/
    terrain.ts
    project.ts
```

Keep `ia-studio/v1-helloworld` as an archived snapshot of the first loop. Build V2 from
the root app so AI Studio has one clear entrypoint.

## Recommended libraries

Install only when the page needs them:

- `react-router-dom`: required for `/analisis` and `/particles`.
- `three`: only when migrating the real terrain demo viewer.
- `axios` or native `fetch`: choose one, not both. Prefer native `fetch` for V2 unless
  the original services require axios behavior.
- `@reduxjs/toolkit` and `react-redux`: only if we copy real original state slices.

Avoid for V2:

- Tailwind, unless the original app already depends on it.
- Auth libraries before the public demo routes are stable.
- GenAI dependencies in the browser.
- Express inside the front-end package.

## API and auth strategy

- Use `import.meta.env.VITE_*` only for public browser configuration.
- Keep real secrets in a backend or local processing service, never in React source.
- If Google Maps is needed, use a browser-restricted key and document it as public config.
- If Auth0 returns later, use Authorization Code with PKCE and never commit a client secret.
- Create `src/services/apiClient.ts` as the single API boundary.
- For local processing, call a local backend through `VITE_API_BASE_URL`.

## Tactical V2 sequence

1. Add routing and app shell.
2. Copy the real navbar and service status pattern from the original Gravweb frontend.
3. Migrate only the analysis/map screen layout and controls.
4. Wire the "Procesar el terreno" action to navigate to the terrain demo route.
5. Migrate the terrain demo viewer lazily so the map page stays light.
6. Add small demo data only after the screen shell is stable.
7. Run build, lint, audit and size checks before each GitHub handoff.
