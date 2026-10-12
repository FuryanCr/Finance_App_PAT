## What is this app?
A personal finance tracker built with React. Quincena helps you follow your income and expenses through each pay period, in colones and dollars, in Spanish or English.

> **Status:** in development. The dashboard and statistics screens work with sample data. Add-expense and history are placeholders, and nothing is saved yet.

## Features

- Income, expenses and remaining balance for the current pay period
- Spending statistics by time period and currency
- Spanish / English interface
- Dark and light themes
- Navigation between Dashboard, Add expense, Statistics and History

## Getting started

### Before you begin

You need **Node.js 22.12.0 or newer**. Check with:

```bash
node --version
```

If it is older, install the latest LTS from [nodejs.org](https://nodejs.org).

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/<your-username>/<repo-name>.git
```

**2. Go into the project folder**

```bash
cd finance-tracker
```

**3. Install dependencies**

```bash
npm install
```

This is the only install command you need. Do not install packages one by one.

**4. Start the app**

```bash
npm run dev
```

**5. Open it in your browser**

Vite prints a local address in the terminal, usually `http://localhost:5173`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Creates the production build in `dist/` |
| `npm run preview` | Previews the production build locally (run `build` first) |
| `npm run lint` | Checks the code with ESLint |

## Tech stack

| Layer | Technology | Status |
| --- | --- | --- |
| UI | React | In use |
| Build tool | Vite | In use |
| Routing | React Router | In use |
| App state | React Context | In use |
| Styling | Plain CSS | In use |
| Data | Sample data in `src/db/mockData.js` | In use (temporary) |
| Storage | SQLite | Planned |
| Android app | Capacitor | Installed, not built yet |
| Cloud backups | To be decided | Later |
| Linting | ESLint | In use |

### Why these choices

- **React** builds the interface from small, reusable components.
- **Vite** gives a fast dev server with hot reload and creates the production build.
- **React Router** handles navigation between screens without reloading the page.
- **React Context** holds app-wide settings such as language and theme.
- **Plain CSS** keeps styling simple, with no styling library.
- **SQLite** (planned) is a single local database file with no server to run, which suits a personal app.
- **Capacitor** (installed) will let the same React app be packaged as an Android app.
- **ESLint** uses the Vite template defaults. There is no Prettier or custom formatting.

### Data and storage

Right now the app reads sample categories and transactions from `src/db/mockData.js`, so nothing is saved between sessions. The plan is to replace it with SQLite so expenses persist on the device, then add cloud backups.

## Project structure

```text
src/
  components/         Shared interface components
  context/            App-wide settings (language, theme)
  db/mockData.js      Sample categories and transactions
  features/expenses/  Expense screens
  lib/                Date, money, statistics and translation helpers
  App.jsx             Routes and page layout
  main.jsx            App entry point
```

## Troubleshooting

- **`npm install` fails or shows engine warnings:** update Node.js to 22.12.0 or newer.
- **Port 5173 is already in use:** Vite will pick the next free port and print it in the terminal.
- **Blank page or stale content:** stop the server (`Ctrl + C`), run `npm run dev` again and refresh the browser.

## Roadmap

- [x] React project created and pushed to GitHub
- [x] Dashboard and statistics screens
- [x] Spanish / English and dark / light mode
- [x] Colones and dollars
- [ ] Add-expense screen
- [ ] History screen
- [ ] SQLite storage
- [ ] Android app with Capacitor
- [ ] Cloud backups

## Progress log

Newest first.

### 2026-10-12
- Project created and pushed to GitHub
- Dashboard and statistics screens working with sample data
- Language and theme switching in place