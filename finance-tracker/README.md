## What is this app?
A personal finance tracker built with React. Quincena helps you follow your income and expenses through each pay period, in colones and dollars, in Spanish or English.

> **Status:** in development. All screens work and your data is saved in a SQLite database (in the browser it lives in IndexedDB), so it survives a refresh. The app starts empty; sample data is optional. The Android app is next.

## Features

- Income, expenses and remaining balance for the current pay period
- "Safe to spend per day": what is left this pay period, minus recurring bills that are still due, divided by the days remaining
- Add expenses and income with a numeric keypad, in colones or dollars, with note suggestions from past entries
- Edit or delete any transaction by tapping it, or repeat it as a new entry with today's date
- Custom expense categories: name your own and reuse them
- Spending statistics by time period and currency, plus a comparison of past quincenas
- Monthly history: balance, income and spent per currency, with transactions grouped by day, plus search and filters by text, type and category
- CSV export of the month shown in History
- Settings screen: language, theme, export everything as CSV, download and restore a backup file, load sample data and clear all data
- Manage custom categories: rename, recolor, or delete and move their transactions
- Budgets: a spending limit per category and currency for each pay period, with a warning at 80% and an alert when it is exceeded
- Recurring transactions: rent, salary or subscriptions show up as due each pay period, and you confirm or skip them; typing a due bill by hand offers to mark it as paid, so it is not counted twice
- Spanish / English interface
- Dark and light themes
- Navigation between Home, Add, Statistics and History, with Settings behind the gear icon

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
| `npm test` | Runs the automated tests once |

## Tech stack

| Layer | Technology | Status |
| --- | --- | --- |
| UI | React | In use |
| Build tool | Vite | In use |
| Routing | React Router | In use |
| App state | React Context | In use |
| Styling | Plain CSS in `src/index.css` | In use |
| Storage | SQLite via `@capacitor-community/sqlite` (WebAssembly + IndexedDB in the browser) | In use |
| Android app | Capacitor | Installed, not built yet |
| Cloud backups | To be decided | Later |
| Tests | Vitest, plus sql.js to run the real SQL of the database layer against an in-memory SQLite | In use |
| Linting | ESLint | In use |

### Why these choices

- **React** builds the interface from small, reusable components.
- **Vite** gives a fast dev server with hot reload and creates the production build.
- **React Router** handles navigation between screens without reloading the page.
- **React Context** holds app-wide settings such as language and theme, plus the transactions and categories.
- **Plain CSS** keeps styling simple, with no styling library. All styles live in one file, `src/index.css`, with comments in Spanish.
- **SQLite** (in use) is a single local database file with no server to run, which suits a personal app.
- **Capacitor** (installed) will let the same React app be packaged as an Android app.
- **Poppins**, the title font, is bundled with the app through `@fontsource/poppins`, so it works offline.
- **ESLint** uses the Vite template defaults. There is no Prettier or custom formatting.

### Data and storage

Data lives in a SQLite database named `quincena`, with a `categories` table, a `transactions` table, a `budgets` table and a `recurring` table. Amounts are stored as whole cents to avoid rounding errors. A fresh install starts with no transactions and the four built-in categories. `src/db/database.js` opens the database and runs versioned migrations.

Screens never touch storage directly: they read and write through `TransactionsProvider`, and `src/db/storage.js` is the only file with SQL for reading and writing. On the first launch after upgrading, data saved by the older `localStorage` version is imported once, and the old copy is left untouched.

In the browser, `public/assets/sql-wasm.wasm` is the SQLite WebAssembly binary. It must match the version `jeep-sqlite` expects (currently the one from sql.js 1.11.0). `src/db/mockData.js` still holds the built-in categories and the optional sample transactions. History exports the month on screen as CSV, and Settings has export everything, load sample data (when the app is empty) and clear all data. A backup is a JSON file with your custom categories, transactions, budgets and recurring items; restoring one replaces all current data. It is the way to move your data between browsers or to protect it if the browser's storage is cleared. Cloud backups come later.

The app can only be open in one tab at a time: a second tab is blocked, because each tab saves the whole database and would overwrite the other. It also asks the browser to keep the data (persistent storage), which the browser may or may not grant. Home shows a reminder when the last backup is more than 14 days old.

## Project structure

```text
src/
  components/         Shared interface components
  context/            App-wide settings (language, theme) and transactions
  db/database.js      Opens SQLite and runs the migrations
  db/migrations.js    Schema migrations
  db/mockData.js      Built-in categories and optional sample transactions
  db/storage.js       Reads and writes data (SQLite)
  db/tabLock.js       Allows only one open tab at a time
  db/testDb.js        In-memory SQLite used by the tests
  features/expenses/  Expense screens (home, add and edit, statistics, history)
  features/settings/  Settings, category, budget and recurring screens
  lib/                Date, money, category, CSV, backup, search, suggestion, statistics and translation helpers
  App.jsx             Routes and page layout
  Header.jsx          App title
  index.css           All styles
  main.jsx            App entry point
```

## Troubleshooting

- **`npm install` fails or shows engine warnings:** update Node.js to 22.12.0 or newer.
- **Port 5173 is already in use:** Vite will pick the next free port and print it in the terminal.
- **Blank page or stale content:** stop the server (`Ctrl + C`), run `npm run dev` again and refresh the browser.
- **"Quincena is already open in another tab":** close the other tab and press Try again.
- **Stuck on "Opening your data…":** the database only starts when the tab is visible; bring the tab to the front.

## Roadmap

- [x] React project created and pushed to GitHub
- [x] Dashboard and statistics screens
- [x] Spanish / English and dark / light mode
- [x] Colones and dollars
- [x] Add-expense screen
- [x] Custom categories
- [x] History screen
- [x] Data saved in the browser
- [x] CSV export
- [x] Start empty, with optional sample data
- [x] Edit and delete transactions
- [x] "Safe to spend per day" on the dashboard
- [x] Settings screen
- [x] SQLite storage
- [ ] Android app with Capacitor
- [x] Backup file and restore
- [ ] Cloud backups

## Progress log

Newest first.

### 2026-10-12
- Project created and pushed to GitHub
- Dashboard and statistics screens working with sample data
- Language and theme switching in place
- Add-expense screen with custom categories
- History screen, one month at a time
- Styles commented in Spanish
- Cleanup: removed unused starter files and merged repeated code
- Data saved in the browser, behind a small storage module
- CSV export of the month shown in History
- App starts empty; sample data and "clear all data" are optional actions
- Edit and delete transactions from any list
- "Safe to spend per day" on the dashboard
- Storage moved from localStorage to SQLite, with a one-time import of existing data
- English is now the default language
- Settings screen with language, theme and data actions
- Recurring transactions with a confirm list on the dashboard
- Categories screen: rename, recolor and delete custom categories
- Budgets per category, shown on the dashboard
- Code review fixes: per-day rounding, date validation, write queue, shared helpers, self-hosted font
- Automated tests for the money, date, statistics, category and CSV helpers
- Past quincenas on Statistics; search and filters in History
- Add screen remembers the last currency and category; pending bills counted in safe-to-spend; uncategorized spending shown
- Backup file and restore in Settings
- Visual polish: larger touch targets, readable disabled buttons and placeholders, consistent type sizes; highlighted balance card fixed for dollar-only periods
- One tab at a time, persistent storage request, backup reminder and a loading message
- Tests for migrations and the storage layer
- Dashboard: the day count stays current overnight, a currency with only pending bills is shown, and later-dated expenses are flagged
- Note suggestions and "Repeat today"
- A hand-typed bill that matches a due recurring item can be marked as paid
- Visual refinements (suggestion pills, primary backup button, disabled style, title on loading screens, light-theme contrast); History filters behind a toggle; past quincenas trimmed