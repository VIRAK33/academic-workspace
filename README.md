# 🎓 Academic Command Center (`aw` · `phd`)

[![Live Demo](https://img.shields.io/badge/Live_Demo-virak33.github.io%2Facademic--workspace-emerald?style=for-the-badge&logo=githubpages&logoColor=white)](https://virak33.github.io/academic-workspace/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-VIRAK33%2Facademic--workspace-blue?style=for-the-badge&logo=github)](https://github.com/VIRAK33/academic-workspace)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1_SQLite-F38020.svg?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2_Storage-F38020.svg?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)
[![CLI](https://img.shields.io/badge/CLI-aw_%7C_phd-black.svg?logo=gnubash&logoColor=white)](#-terminal-cli-aw--phd)

> 🚀 **Live Web App**: [https://virak33.github.io/academic-workspace/](https://virak33.github.io/academic-workspace/)  
> 📦 **GitHub Repository**: [https://github.com/VIRAK33/academic-workspace](https://github.com/VIRAK33/academic-workspace)

An all-in-one, high-performance command center tailored for PhD researchers, graduate students, and university scholars. Combines university course scheduling, 19-week academic semester matrices, literature reading pipelines, experiment tracking, advisor meeting digests, and a lightning-fast terminal CLI.

Works **100% offline-first** in the browser with localStorage persistence, and scales to **Cloudflare D1 (Serverless SQLite)** + **Cloudflare R2 (PDF Storage)** for multi-device sync.

---

## 🌟 Key Features

### 1. 📅 Daily Schedule Timeline
- **Proportional Time Canvas**: Time-accurate vertical axis (8:00 AM – 9:30 PM) showing courses, recurring habits, and academic events.
- **50% / 50% Non-Overlapping Layout**: Smart visual collision detection groups concurrent or touching classes/events and cleanly splits them side-by-side into columns with zero overlapping text.
- **Live Time Indicator & Time Travel**: Real-time red indicator synced to your system clock, or drag the simulation slider to preview your day at any hour.
- **Interactive Quick Scenarios**: Instant 1-click date switcher to test different timetable permutations (e.g. Thu Oct 15, Mon Oct 19, Wed Oct 21, Fri Oct 23).
- **Click-to-View Details**: Click any block on the canvas to inspect instructors, locations, active weeks, or tap the pencil to edit.

### 2. 🗓️ Weekly Timetable & 19-Week Matrix
- **University Session Slot Matrix**: Configurable Chinese university session periods (Sessions 1-2, 3-4, 5-6, 7-8, 9-10) with multi-row block spans and room indicators.
- **1–19 Week Interactive Toggle**: Individual week pills per course with 1-click **Odd Weeks**, **Even Weeks**, and **All Weeks** presets.
- **Routines & Commitments**: Track daily habits (e.g., morning paper reading, gym, library deep work) and one-off academic milestones (e.g., colloquiums, thesis defense).
- **Custom View Toggles**: Show/hide routines, show/hide one-off events, show/hide weekends, and filter off-week courses.

### 3. ⚡ Tasks & Academic To-Dos
- **Custom Tags on the Fly**: Type any custom tag in the New Task modal (e.g. `#Lab`, `#Exam`, `#Review`, `#TA`, `#Defense`) with auto-`#` prefixing and Enter key shortcut.
- **Dynamic Tag Filter Strip**: Filter across `#All`, standard presets (`#Research`, `#Class`, `#Paper`, `#Thesis`), and all custom tags detected across your workspace.
- **Segmented Workflow Tabs**: Switch seamlessly between **Open**, **Recently Done**, **All Active**, and **Archive**.
- **1-Click Archive Sweep**: Clean up your board by archiving finished tasks with one click while keeping complete historical records.

### 4. 🔬 PhD Research Pipeline (Kanban)
- **Academic Milestone Stages**: Visual progress tracking across *Literature Review $\rightarrow$ Experiments $\rightarrow$ Drafting $\rightarrow$ Under Review*.
- **Target Venues & Deadlines**: Associate milestones with target journals/conferences and track completion percentages.

### 5. 📚 Literature & Paper Matrix
- **Academic Reading Queue**: Track reading status (*Unread*, *Reading*, *Read*, *To Review*), ArXiv IDs, and code links.
- **1-Click BibTeX**: Instant citation copying formatted for LaTeX bibliographies.
- **Cloudflare R2 Attachments**: Upload and view full paper PDFs directly in your workspace.

### 6. 🤝 Advisor 1-on-1s & 1-Click Digest
- **Meeting Logs**: Record agendas, discussion notes, feedback, and action items from supervisor meetings.
- **Weekly Supervisor Digest**: Automatically compiles your completed tasks, experiment progress, and meeting points into a clean Markdown digest ready to copy to clipboard for emails or Slack.

### 7. ⏰ Conference Countdown Cards
- Real-time $D-X$ countdown cards for major conference submission deadlines (NeurIPS, ICML, ICLR, ACL, KDD).

### 8. 🧪 Experiment & Compute Logs
- Log deep learning and computational runs: model names, dataset benchmarks, hyperparameter configs, and evaluation metrics (e.g. F1, BLEU, latency).

### 9. 🧰 Tools & Utilities
- **AI Syllabus Importer**: Paste course outlines or raw schedules to extract and structure timetable data automatically.
- **Reminders & Alarms**: Configure audio and notification reminders before class or meeting start times.
- **Backup & Restore**: Export full workspace state as a portable JSON file or restore from previous backups.
- **Vector Emoji with Twemoji**: Consistent, crisp emoji rendering across all operating systems.
- **Lab Dark Mode**: High-contrast dark theme optimized for late-night lab environments.

### 10. 🔐 Accounts, Sync & Extras
- **Google Sign-In**: Multi-user support — each user's workspace is isolated on Cloudflare D1 (demo/guest mode available without signing in).
- **Web Push Notifications**: Scheduled class & deadline reminders sent from a 15-minute cron trigger, with configurable audio/notification preview in the Reminders modal.
- **Attendance Tracking**: Log and review attendance for classes and advisor meetings.
- **Research Sprints**: Timeboxed sprint planning on top of the research Kanban.
- **Apple Calendar Export**: One-click `.ics` export for classes, routines, and events.
- **Mobile-Friendly**: Dedicated bottom navigation for phone-sized screens.

---

## 💻 Terminal CLI (`aw` · `phd` · `acad`)

Manage your academic command center directly from terminal, tmux, or SSH sessions without opening a browser.

### Snapshot of Today
```bash
# View today's classes, rooms, recurring habits, and urgent tasks
npm run aw today
# or if globally linked:
aw today
```

```text
 🎓 ACADEMIC COMMAND CENTER   2026-2027 Fall
Thursday, 2026-10-15  ·  Week 5 of 19
───────────────────────────────────────────────────────

📚 Classes Today:
   ● CS820: Research Methodologies & Scientific Communication
     Time: 14:30–18:05 (S5-6+7-8)
     Room: Hopper Hall 204 · Prof: Prof. Grace Hopper
   ● MATH701: Statistical Learning & High-Dimensional Inference
     Time: 08:25–10:00 (S1-2)
     Room: Math Building 305 · Prof: Dr. Claude Shannon

🔁 Routines & Events Today:
   🔁 Library Deep Work Focus Block [Routine] Study
     Time: 19:30–21:10 · Loc: Science & Engineering Library 3F

⚡ Urgent / Due Tasks:
   [ ] Complete the research proposal draft
       #Research #Paper (Due: 2026-10-15)
   [ ] Review lecture notes & proofs for CS820
       #Class (Due: 2026-10-15)
```

### Task Management
```bash
# List open tasks
aw task list --pending

# Add a task with due date and tags
aw task add "Complete ablation study for Graph-RAG" --due tomorrow --tag "#Research"

# Mark a task as done
aw task done <id>

# Sweep completed tasks into Archive
aw task archive

# View archived historical tasks
aw task list --archived

# Restore an archived task
aw task unarchive <id>
```

### Routines & Events
```bash
# List all routines and scheduled academic events
aw event list
```

### Papers & BibTeX
```bash
# List reading queue
aw paper list

# Add a paper to the reading list
aw paper add "Attention Is All You Need" --authors "Vaswani et al." --arxiv 1706.03762

# Copy BibTeX citation to clipboard
aw paper bibtex p1 | pbcopy
```

### Logging ML & Scientific Experiments
```bash
# Pipe directly after training scripts
python train.py && aw exp log --name "Attn-k16" --project "Graph-RAG" --dataset "HotpotQA" --metric f1=88.4 --metric latency_ms=64
```

### Supervisor Weekly Digest
```bash
# Generate Markdown progress report and copy to clipboard
aw digest | pbcopy
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or later)
- `npm` (v9.0.0 or later)

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-username/academic-workspace.git
cd academic-workspace

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Link CLI Globally
To use the `aw` (or `phd`) command anywhere across your system:
```bash
npm link
```
Now you can run `aw today` from any directory or terminal window!

### Build for Production
```bash
npm run build
```

---

## ☁️ Cloudflare D1 & R2 Deployment (Optional)

The application includes native bindings for Cloudflare Workers/Pages with D1 (SQLite) and R2 (PDF storage). **See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the complete walkthrough**, including required secrets (`JWT_SECRET`, `VAPID_*`, Google OAuth):

```bash
# 1. Create Cloudflare D1 database
npx wrangler d1 create academic_workspace_db

# 2. Create Cloudflare R2 bucket for paper PDFs
npx wrangler r2 bucket create academic-workspace-files

# 3. Apply SQL migrations
npx wrangler d1 execute academic_workspace_db --remote --file=migrations/0001_initial_schema.sql
npx wrangler d1 execute academic_workspace_db --remote --file=migrations/0002_seed_data.sql

# 4. Deploy to Cloudflare Pages
npm run build
npx wrangler pages deploy dist
```

---

## 📁 Project Architecture

```
Academic_workspace/
├── bin/
│   ├── aw.ts                         # Complete terminal CLI implementation (Commander)
│   ├── aw.js                         # Node.js executable wrapper (aw / acad / phd)
│   └── phd.ts                        # Alias CLI entry point
├── docs/
│   ├── ARCHITECTURE.md               # System design, data flow, tech decisions
│   ├── API.md                        # Full /api endpoint reference
│   └── DEPLOYMENT.md                 # Cloudflare / GitHub Pages deployment guide
├── migrations/
│   ├── 0001_initial_schema.sql       # Relational D1 SQLite schema (core tables)
│   ├── 0002_seed_data.sql            # Seed dataset with courses, tasks, papers
│   ├── 0003_multi_user_and_push.sql  # Users + Web Push subscriptions
│   ├── 0004_multiday_events.sql      # Multi-day event support
│   ├── 0005_attendance_tracking.sql  # Attendance logging
│   └── 0006_sprints_and_advanced_kanban.sql  # Sprints & advanced Kanban
├── src/
│   ├── client/                       # Frontend application (React 18 + Vite + Tailwind)
│   │   ├── api.ts                    # REST client with localStorage offline fallback
│   │   ├── App.tsx                   # Main React entry & modal coordinator
│   │   ├── hooks/
│   │   │   ├── useWorkspace.ts       # Central workspace state & optimistic mutations
│   │   │   ├── useAuth.ts            # Google session state
│   │   │   └── useBodyScrollLock.ts
│   │   ├── utils/
│   │   │   └── icsExport.ts          # Apple Calendar (.ics) export
│   │   ├── components/
│   │   │   ├── common/               # ModalSheet, TimeInput, Twemoji
│   │   │   ├── modals/               # ~20 modals: Course, Task, Auth, Reminders,
│   │   │   │                         #   Sprint, Backup, Welcome guide ...
│   │   │   ├── views/                # Schedule timeline, 19-week matrix, tasks, kanban,
│   │   │   │                         #   papers, meetings, conferences, experiment logs
│   │   │   ├── Header.tsx            # Semester picker, Tools menu, live clock
│   │   │   ├── Navigation.tsx        # Navigation tabs with live counts
│   │   │   └── MobileBottomNav.tsx   # Phone bottom navigation
│   ├── server/
│   │   ├── index.ts                  # Hono backend API router (all /api endpoints)
│   │   ├── auth.ts                   # Google OAuth → signed JWT cookie
│   │   ├── push.ts                   # Web Push sender + cron handler
│   │   ├── db.ts                     # Database layer (Cloudflare D1 + localStorage fallback)
│   │   └── defaultData.ts            # Realistic default academic data
│   └── types/
│       └── index.ts                  # TypeScript data models & schemas
├── .github/workflows/deploy.yml      # GitHub Pages CI deploy (static mode)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml                     # Cloudflare bindings: D1, R2, cron, public vars
```

---

## ⌨️ CLI Quick Reference

| Command | Action |
|:---|:---|
| `aw today` | Print today's academic schedule, week number, routines, and urgent tasks |
| `aw task list` | Display active tasks (open + recently completed) |
| `aw task list --pending` | Show only incomplete/pending tasks |
| `aw task list --archived` | Display archived tasks |
| `aw task add "Title" --due tomorrow --tag "#Lab"` | Create a new task with due date and tag |
| `aw task done <id>` | Mark a task as completed |
| `aw task archive` | Sweep all completed tasks into archive |
| `aw task unarchive <id>` | Restore an archived task |
| `aw event list` | Display all recurring routines and one-off events |
| `aw paper list` | List papers in your reading queue |
| `aw paper bibtex <id>` | Print BibTeX citation for a paper |
| `aw exp list` | List past experiment runs |
| `aw exp log --name "Run1" --metric f1=88.5` | Log a training run with metrics |
| `aw conf` | Display upcoming conference deadlines and $D-X$ countdowns |
| `aw mode [preset]` | View or switch workspace mode (`basic` \| `research`) |
| `aw digest` | Generate Markdown weekly progress digest for your supervisor |

---

## 📚 Documentation

| Document | Contents |
|:---|:---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, offline-first data flow, directory layout, keyboard shortcuts |
| [`docs/API.md`](docs/API.md) | Complete `/api` endpoint reference (auth, data, push, storage, backup) |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deploy to GitHub Pages or Cloudflare Workers with D1 + R2, secrets setup, troubleshooting |

---

## 📄 License

MIT License. Designed with ❤️ for PhDs, researchers, and students everywhere.
