# SDT — Self Development Tracker

SDT (Self Development Tracker) is a full-stack web application for creating, tracking, and reviewing structured personal development challenges.

The project originally began as a local single-user application in V1.0.0. Following post-release evaluation, SDT V2 was developed to remove the local-installation barrier and make the application accessible as a secure, cloud-hosted, multi-user system.

V2 introduces authentication, user-level data isolation, cloud persistence, responsive mobile access, challenge history, and daily notes while retaining the core challenge-tracking and reporting functionality established in V1.

## Live Application

**Production:**  
https://self-development-tracker-sdt.vercel.app

No local installation is required to use the deployed application.

---

## Key Features

### Challenge Management

- Create custom self-development challenges
- Configure:
  - challenge name
  - start date
  - duration
  - strikes allowed per rule
- Add and order custom rules/tasks
- Maintain one active challenge per user
- Manually end an active challenge
- Automatically recognise natural challenge completion
- Start a new challenge after completing a previous one

### Daily Tracking

- Calendar-based challenge tracking
- Open individual challenge days
- Record task completion through a daily checklist
- Quick access to the current day
- Add one optional note/remark per challenge day
- Reopen saved days and review recorded information
- Distinguish recorded days from unrecorded days

Unrecorded days are intentionally not treated as failed days and do not automatically consume strikes.

### Progress & Strike Monitoring

- Overall challenge progress based on recorded days
- Per-day completion percentages
- Perfect-day tracking
- Rule-level strike monitoring
- Completed and missed task statistics
- Strongest and weakest rule analysis
- Average completion across recorded days

### Reports

SDT provides both active progress reports and final challenge reports.

Reports include:

- challenge duration and current progress
- recorded and perfect days
- completed and missed task instances
- average recorded completion
- unrecorded days
- strikes used
- strongest and weakest rules
- rule-by-rule performance
- daily performance
- daily notes

Reports are print-friendly and can be saved as PDF through the browser.

### Challenge History

Completed challenges are retained and available through **Challenge History**.

Users can:

- view their previous challenges
- review challenge details
- access historical performance
- reopen final reports

Historical information is restricted to the authenticated owner.

### Authentication & User Isolation

SDT V2 supports multiple users through Supabase Authentication.

Each user's challenge data is isolated through:

- authenticated user ownership
- protected API routes
- bearer-token authentication
- PostgreSQL Row Level Security (RLS)
- user-specific database queries

Users cannot access another user's challenges, daily records, task status, notes, or challenge history.

### Responsive Mobile Interface

SDT V2 is designed for both desktop and mobile browsers.

The mobile interface includes:

- compact challenge summary
- responsive seven-column calendar
- touch-friendly daily tracking
- mobile navigation menu
- challenge history access
- progress report access
- account and logout controls

The application remains a responsive web application rather than a separate native mobile app.

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- Bootstrap 5
- Vanilla JavaScript
- Fetch API
- Supabase JavaScript client

### Backend

- Node.js
- Express.js
- REST API architecture
- Authentication middleware
- Per-request authenticated Supabase clients

### Database & Authentication

- Supabase
- PostgreSQL
- Supabase Authentication
- PostgreSQL Row Level Security (RLS)

### Deployment

- Vercel
- Supabase Cloud

### Configuration

- `dotenv`
- environment-based configuration
- `.env.example`
- Vercel environment variables

---

## Architecture

```text
┌─────────────────────────────┐
│       Web Browser           │
│   Desktop / Mobile Client   │
└──────────────┬──────────────┘
               │
               │ HTTPS
               ▼
┌─────────────────────────────┐
│           Vercel            │
│                             │
│  Frontend + Express API     │
└──────────────┬──────────────┘
               │
               │ Authenticated requests
               │ Bearer access token
               ▼
┌─────────────────────────────┐
│          Supabase           │
│                             │
│  Authentication             │
│  PostgreSQL Database        │
│  Row Level Security         │
└─────────────────────────────┘
```

The browser authenticates through Supabase and obtains a user session.

Protected API requests send the user's access token to the Express backend. The backend verifies the authenticated user and creates a request-scoped Supabase client using that user's token.

Database Row Level Security provides an additional ownership boundary at the data layer.

---

## Database Design

SDT V2 uses four application tables.

### `challenges`

Stores challenge-level information including:

- challenge ID
- authenticated owner
- challenge name
- start date
- duration
- strikes allowed
- challenge status
- completion timestamp
- completion reason

Each challenge belongs to an authenticated Supabase user.

### `tasks`

Stores the rules associated with each challenge.

Each task belongs to a challenge and includes its display order and active status.

### `daily_records`

Represents a recorded challenge day.

Each record belongs to a challenge and stores:

- challenge date
- optional daily note
- creation timestamp
- update timestamp

This day-level entity allows notes and other daily information to be stored independently from individual tasks.

### `task_status`

Stores whether each task was completed for a particular daily record.

The relationship between `daily_records` and `task_status` separates the day itself from the individual rule results recorded on that day.

---

## Security Model

Security was a major architectural change between V1 and V2.

### Authentication

Supabase Authentication manages user accounts and sessions.

Protected Express routes require:

```text
Authorization: Bearer <access_token>
```

The backend validates the session before allowing access to protected application resources.

### Row Level Security

Row Level Security is enabled on the V2 application tables.

Ownership originates from:

```text
auth.users
    │
    ▼
challenges.user_id
    │
    ├── tasks
    │
    └── daily_records
            │
            └── task_status
```

This ownership chain prevents authenticated users from reading or modifying data belonging to another user.

The backend also applies explicit user filtering where appropriate, providing application-level checks alongside database-level RLS.

### Environment Configuration

Sensitive configuration is not committed to the repository.

The application uses:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

Production values are configured through Vercel environment variables.

---

## Challenge Lifecycle

```text
Create Account / Sign In
          │
          ▼
No Active Challenge
          │
          ▼
Configure Challenge
          │
          ▼
Start Challenge
          │
          ▼
Daily Tracking
          │
          ├── Checklist
          ├── Daily Note
          ├── Progress
          ├── Strikes
          └── Progress Report
          │
          ▼
Challenge Completion
   ┌──────┴──────┐
   │             │
Natural        Manual
Completion    Completion
   │             │
   └──────┬──────┘
          ▼
     Final Report
          │
          ▼
   Challenge History
          │
          ▼
 Start Another Challenge
```

---

## Recorded vs. Unrecorded Days

One of SDT's core business rules is the distinction between a **recorded day** and an **unrecorded day**.

A recorded day is a day for which the user explicitly saves their checklist.

An unrecorded day has no submitted daily record.

SDT does not automatically interpret missing data as failure. Therefore:

- recorded missed rules may consume strikes
- unrecorded days do not automatically consume strikes
- overall challenge progress is based on recorded days
- perfect days are tracked separately

This prevents absence of data from being treated as an explicit negative result.

---

## V1 → V2 Evolution

SDT V2 was developed as a controlled enhancement of the V1.0.0 baseline rather than as a separate application.

### V1.0.0

The original release provided:

- local Node.js/Express application
- Microsoft SQL Server persistence
- single-user operation
- challenge setup
- daily checklist tracking
- calendar
- strikes
- progress reporting
- final reports

V1 successfully demonstrated the core challenge-management workflow but required users to configure and run the application locally.

### Post-Release Evaluation

After V1 was published, the local installation requirement was identified as a practical adoption barrier for casual testers.

Continued use also identified three usability improvements:

- mobile-responsive access
- challenge history
- optional daily notes

These findings were formally captured as V2 change requests.

### V2 Change Set

| Change Request | Enhancement | Priority |
|---|---|---|
| CR-001 | Cloud Deployment & Multi-User Access | Critical |
| CR-002 | Mobile-Responsive Interface | High |
| CR-003 | Challenge History | High |
| CR-004 | Daily Notes / Remarks | Medium |

The changes required both functional enhancement and architectural redesign.

Most significantly, CR-001 resulted in migration from the local SQL Server architecture to Supabase PostgreSQL, Supabase Authentication, Row Level Security, and Vercel deployment.

---

## Business Analysis & Change Management

SDT is also used as a practical Business Analysis portfolio project.

The V2 lifecycle included:

1. post-release evaluation of V1
2. identification of adoption and usability issues
3. formal change requests
4. impact assessment
5. prioritisation and approval
6. database redesign
7. cloud architecture design
8. implementation
9. regression testing
10. production deployment
11. Production User Acceptance Testing
12. change closure

This provides traceability from an identified problem through requirement, implementation, verification, and release.

---

## Project Documentation

Project documentation is maintained under the `docs` directory.

### V2 Documentation

```text
docs/v2/
├── 01_SDT_V2_Change_Register.pdf
├── 02_SDT_V2_Change_Requests_and_Impact_Assessment.pdf
├── 03_SDT_V2_Database_ERD.png
└── 04_SDT_V2_Production_UAT_Pack.xlsx
```

The documentation provides traceability between the approved V2 changes, solution design, implementation, and Production UAT.

Earlier V1 analysis and design artifacts are retained separately to preserve the project's development history.

---

## Production UAT

SDT V2 was validated in the deployed production environment using a formal UAT pack.

Testing covered areas including:

- production accessibility
- authentication
- session persistence
- challenge creation
- daily tracking
- notes
- progress calculations
- strikes
- progress reports
- final reports
- challenge history
- multi-user data isolation
- new-user registration
- challenge lifecycle
- mobile responsiveness
- desktop regression

Multi-user testing specifically verified that authenticated users could retain their own challenge information without accessing another user's data.

The completed UAT record is maintained in:

```text
docs/v2/04_SDT_V2_Production_UAT_Pack.xlsx
```

---

## Running Locally

The production application is available through the live URL, so local installation is not required for normal use.

For development, clone the repository and install dependencies:

```bash
git clone https://github.com/kyawzayhan26/Self-Development-Tracker-SDT.git
cd Self-Development-Tracker-SDT
npm install
```

Create a `.env` file using `.env.example` as the template:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Then start the development server:

```bash
npm run dev
```

By default, the application runs at:

```text
http://localhost:4000
```

A compatible Supabase project and database schema are required for full local functionality.

Never commit real environment values or privileged Supabase credentials to the repository.

---

## Project Structure

```text
Self-Development-Tracker-SDT/
│
├── docs/
│   └── v2/
│
├── public/
│   ├── app.js
│   ├── auth.js
│   ├── auth-ui.js
│   ├── index.html
│   ├── report.css
│   ├── report.html
│   ├── report.js
│   └── styles.css
│
├── src/
│   ├── config/
│   │   ├── env.js
│   │   └── supabase.js
│   │
│   ├── middleware/
│   │   ├── auth.js
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
├── vercel.json
└── README.md
```

---

## Project Purpose

SDT demonstrates both software implementation and Business Analysis practices through the evolution of a working application.

Technical areas demonstrated include:

- full-stack web development
- REST API design
- PostgreSQL data modelling
- authentication
- Row Level Security
- cloud deployment
- responsive frontend design
- reporting
- asynchronous data handling
- challenge lifecycle management

Business Analysis areas demonstrated include:

- requirements identification
- post-release evaluation
- change request management
- impact assessment
- prioritisation
- functional requirements
- data modelling
- acceptance criteria
- UAT design and execution
- traceability
- change closure

---

## Version

**Current Release:** SDT V2.0.0

**Baseline Release:** SDT V1.0.0

V1 is retained in the repository history as the original local implementation. V2 represents the production cloud migration and approved functional enhancement release.

---

## Author

**Kyaw Zay Han**

Business Analyst / Developer

SDT was designed, analysed, developed, tested, and deployed as an end-to-end personal portfolio project.