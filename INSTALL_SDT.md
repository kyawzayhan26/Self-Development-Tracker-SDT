# SDT — Complete Installation & First-Time Setup Guide

This guide is written for someone who has **never used Node.js, Microsoft SQL Server, or SQL Server Management Studio (SSMS) before**.

By the end of this guide, you will have the Self Development Tracker (SDT) running locally on your Windows PC.

---

# What You Are Installing

SDT runs entirely on your own computer.

You will install four things:

1. **Node.js** — runs the SDT backend server.
2. **Microsoft SQL Server** — stores challenge, task, progress, strike, and report data.
3. **SQL Server Management Studio (SSMS)** — graphical software used to create/manage the SDT database.
4. **The SDT project files** — downloaded from GitHub.

You do **not** need web hosting, a domain name, a cloud account, or a paid database service.

---

# Step 1 — Download and Install Node.js

Official download:

https://nodejs.org/en/download

Choose the **LTS** version rather than the Current version. LTS means Long-Term Support and is the recommended choice for normal application use.

On Windows, download the `.msi` installer, normally for **x64** systems.

Install Node.js using the normal/default options and make sure **npm package manager** is included.

After installation, open Command Prompt and run:

```bash
node --version
npm --version
```

Both commands should return version numbers.

If Windows says `node` is not recognised, close Command Prompt and open it again. If it still fails, restart the PC.

---

# Step 2 — Download Microsoft SQL Server

Official Microsoft download:

https://go.microsoft.com/fwlink/?linkid=2344626&culture=en-us

For personal development use, **SQL Server Developer** is recommended.

Microsoft provides Developer edition free for development and testing.

SQL Server Express can also work, but Developer edition is usually easier for a full local development environment.

Download SQL Server Developer and open the installer.

---

# Step 3 — Install SQL Server

For a first-time SDT setup, use the **Custom** installation path so you can configure the Database Engine clearly.

When the installer opens:

1. Choose **Custom**.
2. Wait for the installer files to download.
3. Open **Installation**.
4. Choose **New SQL Server standalone installation**.
5. Continue through the licence and setup checks.
6. On **Feature Selection**, select at least **Database Engine Services**.
7. Continue to **Instance Configuration**.

For the easiest SDT setup, use the default instance if available:

```text
MSSQLSERVER
```

If you install SQL Server Express, you may instead see:

```text
SQLEXPRESS
```

Write down the instance name.

Continue to **Database Engine Configuration**.

Under authentication mode, choose:

```text
Mixed Mode
(SQL Server authentication and Windows authentication)
```

Create a strong password for the built-in `sa` account and save it securely.

Then click:

```text
Add Current User
```

under SQL Server administrators.

This makes your Windows account a SQL Server administrator.

Finish the installation and wait until the Database Engine installs successfully.

---

# Step 4 — Download and Install SSMS

Official Microsoft SSMS installation page:

https://learn.microsoft.com/en-us/ssms/install/install

Download the latest SQL Server Management Studio installer.

Open the installer, keep the normal/default SSMS components selected, and click **Install**.

Restart Windows if the installer asks you to.

---

# Step 5 — Open SSMS for the First Time

Press the Windows key and search for:

```text
SQL Server Management Studio
```

Open it.

When the connection window appears:

**Server type**

```text
Database Engine
```

**Authentication**

```text
Windows Authentication
```

**Server name**

Try:

```text
localhost
```

Then click **Connect**.

If `localhost` does not work, try:

```text
.
```

or:

```text
YOUR-PC-NAME
```

If you installed SQL Server Express, try:

```text
localhost\SQLEXPRESS
```

or:

```text
.\SQLEXPRESS
```

If you do not know your PC name, open Windows Settings and go to **System > About > Device name**.

Once connected, expand:

```text
Databases
```

You should see system databases such as:

```text
master
model
msdb
tempdb
```

That confirms SSMS is connected to SQL Server.

---

# Step 6 — Enable TCP/IP

The SDT Node.js backend connects to SQL Server over TCP/IP.

Open **SQL Server Configuration Manager**.

If it does not appear in Windows Search, open the version-specific MMC file manually. Common paths are:

```text
SQL Server 2025:
C:\Windows\SysWOW64\SQLServerManager17.msc

SQL Server 2022:
C:\Windows\SysWOW64\SQLServerManager16.msc

SQL Server 2019:
C:\Windows\SysWOW64\SQLServerManager15.msc
```

In SQL Server Configuration Manager:

1. Expand **SQL Server Network Configuration**.
2. Open **Protocols for MSSQLSERVER** or **Protocols for SQLEXPRESS**.
3. Right-click **TCP/IP**.
4. Choose **Enable**.

Then right-click **TCP/IP** again and open **Properties**.

Go to the **IP Addresses** tab.

Scroll to **IPAll**.

For a simple local SDT setup:

1. Clear the **TCP Dynamic Ports** field if it contains `0`.
2. Set **TCP Port** to:

```text
1433
```

Click **OK**.

Now restart SQL Server:

1. Open **SQL Server Services** in SQL Server Configuration Manager.
2. Right-click **SQL Server (MSSQLSERVER)** or **SQL Server (SQLEXPRESS)**.
3. Click **Restart**.

---

# Step 7 — Confirm Mixed Mode Authentication

If you selected Mixed Mode during installation, this should already be correct.

To verify it in SSMS:

1. Right-click the SQL Server name at the top of Object Explorer.
2. Click **Properties**.
3. Select **Security**.
4. Confirm:

```text
SQL Server and Windows Authentication mode
```

If you changed this option, restart the SQL Server service.

---

# Step 8 — Download SDT

GitHub repository:

https://github.com/kyawzayhan26/Self-Development-Tracker-SDT-local-

## Option A — Download ZIP

1. Open the repository.
2. Click **Code**.
3. Click **Download ZIP**.
4. Extract the ZIP to a permanent folder, for example:

```text
C:\Users\YourName\Documents\SDT
```

Do not run the app from inside the ZIP archive.

## Option B — Clone with Git

```bash
git clone https://github.com/kyawzayhan26/Self-Development-Tracker-SDT-local-.git
cd Self-Development-Tracker-SDT-local-
```

---

# Step 9 — Install SDT Packages

Open the SDT folder in File Explorer.

Click the File Explorer address bar, type:

```text
cmd
```

and press Enter.

This opens Command Prompt inside the project folder.

Run:

```bash
npm install
```

npm reads `package.json` and installs the required packages.

A `node_modules` folder will appear. This is normal.

---

# Step 10 — Create the SDT Database

The repository includes:

```text
db\setup.sql
```

Open SSMS.

1. Click **File > Open > File**.
2. Open `db\setup.sql`.
3. Make sure SSMS is connected to your local SQL Server.
4. Click **Execute** or press **F5**.

The script creates the `SDT` database and its required tables.

After execution:

1. Right-click **Databases** in Object Explorer.
2. Click **Refresh**.
3. Expand **SDT > Tables**.

You should see tables including:

```text
dbo.Challenges
dbo.Tasks
dbo.DayStatus
```

## Important warning

`setup.sql` is also a **reset script**.

If an `SDT` database already exists, running the script again deletes the existing database and all challenge data before rebuilding it.

Only run it for first-time installation or when you intentionally want to erase all SDT data.

---

# Step 11 — Create a Dedicated SQL Login for SDT

Do not use the `sa` account as the normal application login.

In SSMS, click **New Query** and make sure the database dropdown is set to:

```text
master
```

Run this script after replacing the example password with your own strong password:

```sql
CREATE LOGIN sdt_user
WITH PASSWORD = 'ChangeThisToYourOwnStrongPassword123!';
GO

USE SDT;
GO

CREATE USER sdt_user
FOR LOGIN sdt_user;
GO

ALTER ROLE db_owner
ADD MEMBER sdt_user;
GO
```

You should see:

```text
Commands completed successfully.
```

Now test the account.

Open a new SSMS connection using:

```text
Authentication:
SQL Server Authentication
```

Login:

```text
sdt_user
```

Password:

```text
the password you created
```

If it connects successfully, the SDT SQL login is ready.

---

# Step 12 — Create the `.env` File

The project contains:

```text
.env.example
```

Make a copy of it and rename the copy:

```text
.env
```

Make sure Windows does not rename it to:

```text
.env.txt
```

If necessary, enable:

```text
File Explorer > View > Show > File name extensions
```

Open `.env` in Notepad or VS Code.

The template looks like:

```env
# Server
PORT=4000
NODE_ENV=development

# SQL Server
DB_SERVER=localhost
DB_PORT=1433
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_DATABASE=SDT
```

Change it to your own values, for example:

```env
PORT=4000
NODE_ENV=development

DB_SERVER=localhost
DB_PORT=1433
DB_USER=sdt_user
DB_PASSWORD=ChangeThisToYourOwnStrongPassword123!
DB_DATABASE=SDT
```

Save the file.

Never upload `.env` to GitHub because it contains your database password.

---

# Step 13 — Start SDT

Open Command Prompt inside the SDT project folder.

Run:

```bash
npm run dev
```

If startup succeeds, open your browser and go to:

```text
http://localhost:4000
```

If you changed `PORT` in `.env`, use that port instead.

You should see the **Build Your Challenge** page.

---

# Step 14 — Create Your First Challenge

Enter:

- Challenge name
- Start date
- Challenge duration
- Strikes allowed per rule
- Rules/tasks

Example rules:

```text
Gym workout
10,000 steps
Read 10 pages
No alcohol
1 hour coding
```

Add, remove, or reorder the rules.

When ready, click:

```text
Start Challenge
```

The challenge is saved to SQL Server and the dashboard opens.

---

# Step 15 — Daily Use

You can record a day in two ways.

## Method 1 — Today button

Click:

```text
Today
```

This immediately opens today's checklist.

## Method 2 — Calendar

Click a valid challenge date.

Dates before the challenge begins and after it ends are disabled.

Tick or untick your tasks and click:

```text
Save
```

The data is stored in SQL Server.

---

# Step 16 — Understand Progress and Strikes

A **perfect day** means every configured rule was completed.

A missed rule on a recorded day counts as a strike for that rule.

Running out of strikes does not restart or cancel the challenge. Strikes are informational.

An **unrecorded day** is not automatically treated as a failed day.

---

# Step 17 — Generate a Progress Report

During an active challenge, click:

```text
Progress Report
```

The report includes:

- current challenge day
- recorded days
- perfect days
- average recorded completion
- completed tasks
- missed tasks
- unrecorded days
- strikes used
- strongest rule
- weakest rule
- rule performance
- daily performance

Click:

```text
Print Report
```

You can print the report or select **Save as PDF**.

---

# Step 18 — End a Challenge

A challenge can end naturally when its configured period finishes or manually through:

```text
End Challenge
```

Manual ending preserves existing challenge data.

The final report opens when the challenge is completed.

After reviewing or printing the final report, return to SDT and create another challenge.

---

# Step 19 — Start SDT Again Later

Every time you want to use SDT:

1. Make sure SQL Server is running.
2. Open the SDT project folder.
3. Open Command Prompt in that folder.
4. Run:

```bash
npm run dev
```

5. Open:

```text
http://localhost:4000
```

Your challenge data remains stored in SQL Server.

---

# Step 20 — Stop SDT

In the Command Prompt window running SDT, press:

```text
Ctrl + C
```

If Windows asks whether to terminate the batch job, type `Y`.

---

# Optional Windows Shortcut

The repository includes:

```text
sdt-run.bat
```

You can create a desktop shortcut to this file for easier daily launching.

---

# Troubleshooting

## `node` is not recognised

Reinstall Node.js LTS from:

https://nodejs.org/en/download

Then reopen Command Prompt.

## `npm install` fails

Make sure you are in the project folder and that `package.json` is visible.

Run:

```bash
dir
npm install
```

## Cannot connect to SQL Server in SSMS

Try:

```text
localhost
.
YOUR-PC-NAME
localhost\SQLEXPRESS
.\SQLEXPRESS
```

Also check that the SQL Server service is running.

## SDT database connection error

Check `.env`:

```env
DB_SERVER=localhost
DB_PORT=1433
DB_USER=sdt_user
DB_PASSWORD=your_password
DB_DATABASE=SDT
```

Confirm:

- SQL Server is running
- TCP/IP is enabled
- port 1433 is configured
- Mixed Mode is enabled
- `sdt_user` exists
- the password is correct
- the `SDT` database exists

## `Login failed for user 'sdt_user'`

Test the same account directly in SSMS using SQL Server Authentication.

## `ECONNREFUSED`

Check SQL Server service status, TCP/IP, port 1433, and restart SQL Server after network changes.

## Port 4000 is already in use

Change:

```env
PORT=4000
```

to another port such as:

```env
PORT=4001
```

Restart SDT and open:

```text
http://localhost:4001
```

---

# Resetting SDT Completely

To erase all SDT data:

1. Stop SDT with `Ctrl + C`.
2. Open SSMS.
3. Open `db\setup.sql`.
4. Execute the script.
5. Restart SDT with:

```bash
npm run dev
```

This permanently deletes existing challenges, tasks, daily records, strikes, and reports.

---

# Updating SDT

If you cloned the repository with Git:

```bash
git pull
npm install
```

Before running a newer `setup.sql`, read the update notes because the setup script is destructive.

---

# Security Notes

SDT is designed for local personal use.

Recommended practices:

- never commit `.env`
- never publish your real SQL password
- do not use `sa` as the normal SDT login
- keep SQL Server local unless you know how to secure remote access
- do not expose the current app directly to the public internet without authentication, HTTPS, hardened database configuration, and proper secret management

---

# Official Download Links

Node.js:

https://nodejs.org/en/download

Microsoft SQL Server:

https://www.microsoft.com/en/sql-server/sql-server-downloads

SQL Server Management Studio:

https://learn.microsoft.com/en-us/ssms/install/install

SDT GitHub repository:

https://github.com/kyawzayhan26/Self-Development-Tracker-SDT-local-

---

# Installation Checklist

- [ ] Node.js installed
- [ ] `node --version` works
- [ ] `npm --version` works
- [ ] SQL Server installed
- [ ] Database Engine Services installed
- [ ] Mixed Mode Authentication enabled
- [ ] Current Windows user added as SQL Server administrator
- [ ] SSMS installed
- [ ] SSMS connects successfully
- [ ] TCP/IP enabled
- [ ] SQL Server configured for port 1433
- [ ] SQL Server service restarted
- [ ] SDT downloaded and extracted
- [ ] `npm install` completed
- [ ] `db/setup.sql` executed successfully
- [ ] `SDT` database visible in SSMS
- [ ] `sdt_user` login created
- [ ] `.env` created
- [ ] `.env` contains correct credentials
- [ ] `npm run dev` starts successfully
- [ ] `http://localhost:4000` opens
- [ ] Build Your Challenge page appears

If every item is checked, SDT is ready to use.
