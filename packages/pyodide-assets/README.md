# Pyodide assets

`VERSION` is the single source of truth for the Pyodide version used by the web and desktop apps.

Run `bun run sync:pyodide` from the repository root. The runtime files are cached under `dist/<version>/` and copied to both `apps/web/public/pyodide/` and `apps/desktop/public/pyodide/`.
