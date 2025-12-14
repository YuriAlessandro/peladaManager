# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pelada Manager is a React application for managing pickup sports games ("peladas" in Brazilian Portuguese). It handles player management, team balancing using TrueSkill rating system, score tracking, and match history.

## Development Commands

```bash
npm run dev      # Start Vite dev server with host flag (http://localhost:5173)
npm run build    # TypeScript compile + Vite build (outputs to /build)
npm run lint     # Run ESLint
npm run preview  # Preview production build
npm run deploy   # Build and deploy to GitHub Pages
```

## Backend Requirement

The app requires a separate backend server running:
- Local development: `http://localhost:4000`
- Production: `https://plankton-app-xoik3.ondigitalocean.app`

Backend repository: https://github.com/isaacbatst/pelada-manager-backend

## Architecture

### Tech Stack
- React 18 with TypeScript
- Vite with SWC for fast compilation
- TailwindCSS (classes prefixed with `tw-`)
- React Router for navigation (uses HashRouter for GitHub Pages)
- SWR for data fetching/caching
- Socket.io-client for real-time updates
- react-hook-form + zod for form validation
- ts-trueskill for player rating calculations

### Key Directories
- `src/api.ts` - API client with all backend endpoints
- `src/lib/` - Core business logic (ELO/TrueSkill calculations, match scheduling, socket management)
- `src/hooks/` - SWR-based data fetching hooks
- `src/pages/` - Route components organized by feature
- `src/components/` - Reusable UI components
- `src/types.ts` - TypeScript type definitions

### Data Flow
1. `useActiveGameDay` hook fetches current game day session from backend
2. Game state updates go through `api.updateGameDay()`
3. Real-time sync via Socket.io with polling fallback every 10 seconds
4. Player ratings updated using TrueSkill algorithm after each match

### Core Types
- `Player` - Base player with TrueSkill mu/sigma ratings
- `GameDayPlayer` - Player instance for a game day with match stats
- `GameDay` - Complete game day state including teams, scores, and configuration

### Team Balancing
The `src/lib/elo.ts` module uses TrueSkill to:
1. Generate all possible team combinations
2. Calculate match quality for each combination
3. Select the most balanced matchup

### Routes (Portuguese)
- `/` - Home (create/join game)
- `/criar-pelada` - Create new game day
- `/pelada` - Active game day view
- `/pelada/editar` - Edit game day settings
- `/historico` - Match history
