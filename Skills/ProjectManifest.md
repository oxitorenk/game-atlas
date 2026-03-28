# Project Manifest: Game Atlas

## Overview
Game Atlas is a minimalist, iOS-inspired Progressive Web App (PWA) that acts as a reference library for game mechanics, UI/UX designs, and critical reviews of personal gaming experiences.

## Technical Stack
- **Core**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3.
- **PWA Features**: Service Worker (`sw.js`), Web App Manifest (`manifest.json`).
- **Data Architecture**: Flat JSON-based local database (`data/data.json`).
- **Styling**: Vanilla CSS with custom property tokens (e.g., `--ios-blue`, `--ios-bg-secondary`).
- **Icons**: Custom SVG paths (Bootstrap Icons-inspired) embedded in JS and HTML.

## Design Standards
- **Typography**: San Francisco / System Sans-Serif.
- **Components**: iOS-style cell-based lists, grid cards, and navigation bars.
- **Interactions**: Smooth parallax header on detail views, glassmorphism on search dropdowns.

## Never List
- NO external UI frameworks (React, Vue, BootStrap).
- NO external JS libraries (jQuery, Lodash).
- NO complex build systems (keep it simple for local file access when necessary).

## Ground Truth
- The source of truth for all game entries is `data/data.json`.
- The main entry point is `index.html`.
- Responsive design focuses on mobile-first (iPhone dimensions) but adapts for desktop.
