# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CNC equipment parts inventory management system (Korean/Vietnamese bilingual). React + TypeScript frontend with Express backend for auth, Supabase PostgreSQL for all data operations.

## Commands

```bash
npm run dev              # Run frontend (Vite:5173) + backend (Express:3001) concurrently
npm run dev:client       # Frontend only
npm run dev:server       # Backend only (cd server && node index.js)
npm run build            # Production build (vite build → dist/)
npm run lint             # ESLint (flat config)
npm run preview          # Preview production build
```

Server dependencies are separate: `cd server && npm install`

## Architecture

**Data flow:** Components → Zustand stores (`use[Feature]Store`) → Services (`[feature].service.ts`) → Supabase client directly

- Frontend services call Supabase JS client directly for all CRUD operations
- Express server is only used for **custom authentication** (POST `/api/auth/login`) using bcryptjs against a `users` table
- Vite dev server proxies `/api` requests to `localhost:3001`
- In production, Express serves the built React app from `dist/`

**Key directories:**
- `src/store/` — Zustand stores with `persist` middleware (localStorage)
- `src/services/` — Supabase data access layer
- `src/pages/` — Route-level page components
- `src/components/` — Shared UI components (Layout, forms, tables)
- `src/i18n/` — i18next config + `locales/ko.json`, `locales/vi.json`
- `src/types/database.types.ts` — Complete Supabase schema types
- `server/` — Express server (separate package.json and node_modules)

## Database (Supabase)

Tables: `parts`, `inventory`, `inbound`, `outbound`, `suppliers`, `users`, `departments`

- UUIDs for all primary keys
- Parts use codes like MT001, MT002
- `inventory` links to `parts` via `part_id` FK
- `inbound`/`outbound` link to `parts` and `suppliers` via FKs
- User roles: `admin`, `manager`, `user`

## Auth

Custom auth (not Supabase Auth). Login endpoint validates email+password with bcrypt against `users` table using Supabase service role key. Frontend stores session in Zustand auth store. `ProtectedRoute` component guards authenticated routes.

## Tech Stack

- **UI**: Ant Design 5 + Tailwind CSS 4
- **State**: Zustand 5 with persist
- **Routing**: React Router 7
- **Charts**: Recharts
- **i18n**: i18next (ko/vi, default: ko)
- **Excel**: XLSX library for export
- **Dates**: dayjs

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=        # Supabase project URL (used by frontend + server)
VITE_SUPABASE_ANON_KEY=   # Supabase anon key (frontend)
SUPABASE_SERVICE_KEY=     # Supabase service role key (server only)
PORT=3001                 # Express server port
NODE_ENV=development      # development | production
```

## Deployment

Vercel with `vercel.json`: region `icn1` (Seoul), SPA rewrites, security headers. Build output: `dist/`.

## Path Aliases

`@/*` maps to `src/*` (configured in vite.config.ts and tsconfig).
