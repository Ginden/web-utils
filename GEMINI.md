# Gemini Code Assistant Context

This file provides context for the Gemini code assistant to understand the project structure, dependencies, and development conventions.

## Project Overview

This is a React-based web application built with Vite and TypeScript. It allows users to visually configure and control WS281x LED rings and matrices. The application provides a user-friendly interface for setting LED colors, and generating code snippets for hardware projects (likely Arduino/FastLED). It also includes a history feature to save and load configurations.

### Key Technologies

*   **Frontend:** React, TypeScript
*   **Build Tool:** Vite
*   **Styling:** CSS
*   **Linting:** ESLint

### Architecture

The application is structured as a single-page application (SPA).

*   `src/`: Contains all the source code for the application.
    *   `main.tsx`: The entry point of the application.
    *   `App.tsx`: The main application component that manages the state and logic.
    *   `components/`: Contains the React components for different parts of the UI (Display, ConfigPanel, HistoryPanel).
    *   `api/`: Contains the API for the summarizer.

## Building and Running

### Development

To run the application in development mode with hot-reloading:

```bash
npm install
npm run dev
```

### Important Note: Build after changes

Always run `npm run build` after making changes to the codebase to ensure the production-ready files are up-to-date.

### Production Build

To build the application for production:

```bash
npm install
npm run build
```

This will create a `dist` directory with the optimized and minified files.

### Linting

To check the code for any linting errors:

```bash
npm run lint
```

### Previewing the Production Build

To serve the production build locally:

```bash
npm run preview
```

## Development Conventions

*   **Styling:** Standard CSS is used for styling.
*   **State Management:** Component-level state is managed using React hooks (`useState`, `useEffect`).
*   **Code Style:** The code style is enforced by ESLint. The configuration can be found in `eslint.config.js`.
*   **History:** The application uses `localStorage` to persist the history of LED configurations.
