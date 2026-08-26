# SDT — Self Development Tracker

SDT (Self Development Tracker) is a local-first full-stack web application for creating, tracking, and reviewing structured personal development challenges.

It was designed for users who want more than a simple habit checklist. SDT lets you define a challenge before it begins, lock in the rules, record daily progress, monitor strikes and completion, generate progress reports, and produce a final report when the challenge ends.

The application runs locally on your computer and does not require user accounts, authentication, or cloud hosting.

## Features

- Create a custom challenge from a setup screen
- Choose a challenge name, start date, duration, and allowed strikes
- Add, remove, and reorder custom rules before the challenge begins
- Lock challenge rules once the challenge starts
- Calendar-based challenge tracking
- Automatically grey out dates outside the challenge period
- Daily checklist with tick/untick and save
- “Today” shortcut for quickly opening the current day’s checklist
- Overall challenge progress tracking
- Per-day completion percentages
- Per-rule strike tracking
- Recorded and unrecorded days treated separately
- Progress report with:
  - current day
  - recorded days
  - perfect days
  - average recorded completion
  - completed and missed tasks
  - unrecorded days
  - strikes used
  - strongest and weakest rules
  - rule-by-rule performance
  - daily performance
- Printable progress report
- Manual challenge ending
- Automatic completion when the configured challenge period ends
- Printable final challenge report
- Historical challenge data retained in SQL Server after completion

## Tech Stack

### Frontend
- HTML5
- CSS3
- Bootstrap 5
- Vanilla JavaScript
- Native Fetch API

### Backend
- Node.js
- Express.js
- REST API architecture

### Database
- Microsoft SQL Server
- SQL Server Management Studio (SSMS)
- Parameterised SQL queries using the `mssql` Node.js package

### Configuration
- `dotenv`
- Local `.env` configuration
- `.env.example` provided for setup

## Project Structure

```text
Self-Development-Tracker-SDT-local-/
│
├── db/
│   └── setup.sql
│
├── public/
│   ├── app.js
│   ├── index.html
│   ├── report.css
│   ├── report.html
│   ├── report.js
│   └── styles.css
│
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   │
│   ├── middleware/
│   │   └── errorHandler.js
│   │
│   ├── routes/
│   │   ├── challenges.routes.js
│   │   ├── days.routes.js
│   │   ├── reports.routes.js
│   │   └── tasks.routes.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── sdt-run.bat
└── README.md
```

## How SDT Works

### 1. Configure the challenge

When there is no active challenge, SDT opens on the challenge setup page.

Before starting, you can configure:

- challenge name
- start date
- number of days
- strikes allowed per rule
- custom rules and tasks
- rule ordering

When **Start Challenge** is selected, the challenge and its rules are written to SQL Server.

### 2. Track daily performance

During an active challenge, the main dashboard displays the challenge calendar.

Each valid challenge date can be opened to display the daily checklist. Tasks can be checked or unchecked and then saved.

The **Today** button provides a shortcut directly to the current day’s checklist.

### 3. Monitor challenge progress

The dashboard displays:

- overall challenge completion
- calendar completion percentages
- completed days
- strikes used and remaining for each rule

Dates before the challenge starts and after it ends are disabled.

### 4. Recorded vs. unrecorded days

SDT intentionally distinguishes between:

- **Recorded days** — days that were explicitly saved
- **Unrecorded days** — days where no result was submitted

An unrecorded day is not automatically treated as a failed day.

### 5. Strike system

Each rule can be given a configurable number of strikes.

A strike represents a missed rule on a recorded day.

Using all available strikes does not automatically restart, cancel, or punish the challenge. The strike system is informational and designed to make rule consistency visible.

### 6. Progress reports

The Progress Report can be opened at any point during an active challenge.

It includes:

- current challenge day
- recorded days
- perfect days
- average completion on recorded days
- completed and missed task instances
- unrecorded days
- strikes used
- strongest and weakest rules
- per-rule statistics
- daily performance

The report can be printed or saved as a PDF using the browser print function.

### 7. Ending a challenge

A challenge can finish in two ways:

- **Natural completion** — the configured challenge period ends
- **Manual completion** — the user selects **End Challenge**

Existing challenge data is preserved.

When a challenge is completed, SDT can generate a final challenge report using the recorded performance data.

## Database Design

SDT currently uses three main tables:

### `Challenges`

Stores challenge-level configuration such as:

- challenge ID
- challenge name
- start date
- duration
- allowed strikes
- challenge status
- completion date
- completion reason

### `Tasks`

Stores the rules/tasks associated with a challenge.

Each task belongs to one challenge through `challengeId`.

### `DayStatus`

Stores the daily completion status for each task.

The combination of `dateKey` and `taskId` uniquely identifies a daily task record.

## Running SDT

See [INSTALL.md](INSTALL.md) for complete installation and local setup instructions.

Once configured:

```bash
npm install
npm run dev
```

By default, SDT runs at:

```text
http://localhost:4000
```

## Resetting the Development Database

The included `db/setup.sql` script is destructive by design.

Running it will:

1. close existing connections to the `SDT` database
2. delete the existing `SDT` database
3. recreate the database
4. recreate all required tables and indexes
5. remove all previous challenge and test data

Do not run `db/setup.sql` if you want to preserve existing challenge data.

## Security Notes

- `.env` should never be committed to Git.
- Keep real SQL Server credentials only in your local `.env`.
- Use `.env.example` as the configuration template.
- This project is currently designed for local use rather than internet-facing deployment.

## Project Purpose

SDT was built as a personal full-stack development project focused on combining application development with real-world business logic.

Key development areas include:

- database modelling
- REST API design
- frontend/backend integration
- asynchronous data handling
- date-based business rules
- state management
- data reporting
- print-friendly reporting
- environment configuration
- challenge lifecycle management

## Future Improvements

Possible future additions include:

- challenge history browser
- historical report reopening
- trend charts and visual analytics
- notes or journals attached to individual days
- export to CSV
- backup/restore utilities
- responsive mobile improvements
- optional cloud deployment
- optional multi-user authentication  