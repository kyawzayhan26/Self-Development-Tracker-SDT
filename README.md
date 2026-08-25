# SDT (Self Development Tracker)

A simple local-only web app (no login) to track a 75-hard-style challenge on a calendar, with daily task checklists.

## Tech stack (same style as OJPMS)
- Node.js + Express backend
- Microsoft SQL Server database (SSMS)
- Frontend: HTML + Bootstrap + Vanilla JS + Axios-style fetch (native `fetch`)

---

## 1) Prerequisites
- Node.js (LTS)
- SQL Server + SSMS

---

## 2) Database setup
### Option A (recommended): Create the DB and tables in SSMS
1. Open SSMS
2. Run the script: `db/setup.sql`

This will:
- create a database named `SDT` (if it doesn't exist)
- create tables
- insert a few default tasks (you can rename later)

---

## 3) Configure environment
1. Copy `.env.example` to `.env`
2. Fill in:
- DB_SERVER
- DB_USER
- DB_PASSWORD
- DB_DATABASE (default is SDT)

---

## 4) Install & run
From the project folder:

```bash
npm install
npm run dev
```

Open:
http://localhost:3000

---

## How it works (high level)
- Main page: calendar with a completion ring per day
- Click a day -> Day Details modal: checklist of tasks, tick/untick, Save
- Backend stores daily completion per task in SQL Server

---

## Customize later (we’ll do step-by-step)
- Replace the default tasks with your own rules & conditions
- Add “fail/reset rules”, streaks, progress charts, notes, uploads, etc.
