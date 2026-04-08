---

# CLAUDE.md — Project Instructions for Claude Code

## Project
"The Ride of Aravind" — an interactive, canvas-driven cycling portfolio.

## Architecture
The definitive architecture document is `architecture.md` in this repo root. Read it fully before making any decisions. It is the single source of truth for structure, naming, tech choices, and build order.

## Tech Stack
- React 18 (Vite), JavaScript (JSX) — no TypeScript
- HTML5 Canvas API (raw) — no animation libraries
- CSS Modules + CSS variables for UI overlays
- Hash-based routing (no react-router, no server rewrites)
- Deployment: GitHub Pages via gh-pages

## Rules

### General
- Follow the file/folder structure in architecture.md exactly. Do not invent new files or rename existing ones unless explicitly told to.
- One step at a time. Each step in the build plan (Section 12 of architecture.md) is a discrete unit. Do not work ahead.
- Ask before combining steps.

### Code Style
- JavaScript only. No TypeScript. No .ts or .tsx files.
- Functional components with hooks. No class components.
- Use CSS Modules (*.module.css) for all component styles.
- CSS variables defined in src/styles/variables.css — use them everywhere.
- No default exports from data files or engine modules. Use named exports. Components may use default exports.
- Keep files focused — one module, one responsibility.

### Canvas
- All canvas rendering uses the raw Canvas 2D API. No Pixi, no Fabric, no Konva, no Three.js.
- WorldState is a plain mutable JS object — NOT React state. React reads it via useSyncExternalStore.
- The rAF loop lives in WorldCanvas.js. All layer draw functions are called from there.
- Theme files export draw overrides. WorldCanvas calls theme.drawX() — layers do not pick their own theme.

### Performance
- Particle pool uses Float32Array — zero allocations after init.
- OffscreenCanvas caching for sky/background layers.
- Early rAF exit when world is idle (speed === 0, no particles, no transition).
- dt capped at 50ms to prevent physics explosion after tab switch.

### Do Not
- Do not install animation libraries (GSAP, Framer Motion, anime.js, etc.)
- Do not add TypeScript
- Do not use Redux, Zustand, Jotai, or any state management library
- Do not add react-router
- Do not modify the build plan order without permission
- Do not create files outside the structure defined in architecture.md

## Build Plan
Follow Section 12 of architecture.md. Steps are sequential. Each step has a defined output. Verify that output before moving on.

## When In Doubt
Re-read architecture.md. The answer is almost certainly there.

---
