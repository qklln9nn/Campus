# 🎓 CampusHub — Campus Event Management Platform

A full-stack campus event discovery and management platform built with Vue 3, Supabase, and AI-powered features. Designed for students, event organisers, and administrators to collaborate seamlessly around campus activities.

---

## ✨ Features

### 🎟️ For Students

- Browse and filter events by keyword, category, date, and registration status
- Search in natural language with **AI Smart Search**
- Generate concise AI summaries for individual events
- Receive AI event recommendations based on profile interests and availability
- Generate a personalised AI weekly digest from registered and saved events
- Register for events, join waitlists, and cancel registrations
- Automatically move from a waitlist into an available place
- Save events for later
- View event locations on an interactive map
- Rate attended events and report inappropriate content
- Receive in-app reminders and waitlist notifications
- Manage profile details, interests, clubs, availability, and notification preferences

### 🗓️ For Organisers

- Create events with dates, times, categories, capacity, map locations, and posters
- Use **AI Copilot** to draft or improve event descriptions
- Save drafts and submit events for administrator review
- Edit, cancel, and delete owned events
- View confirmed attendees and the waitlist
- Check attendees in at an event
- Track registrations, waitlists, occupancy, and ratings

### 🛡️ For Administrators

- View live totals for events, users, registrations, and attendance
- Analyse event categories with bar and donut charts
- Approve, reject, cancel, and delete events
- Change user roles and suspend or reactivate accounts
- Review and resolve moderation reports
- Manage event categories, report thresholds, and governance settings
- Receive notifications for moderation and event workflow activity

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | Vue 3 (Composition API) + TypeScript |
| **Build Tool** | Vite |
| **UI Component Library** | Element Plus |
| **State Management** | Pinia |
| **Routing** | Vue Router 5 |
| **Charts** | ECharts + vue-echarts |
| **Map** | Leaflet + leaflet-geosearch |
| **Backend / Database** | Supabase (PostgreSQL + Row Level Security) |
| **Authentication** | Supabase Auth (email/password + RBAC) |
| **AI Features** | Supabase Edge Functions (Deno) |
| **Fonts** | Lexend, Noto Sans SC, OpenDyslexic |

---

## 🤖 AI Edge Functions

AI features run as Supabase Edge Functions on Deno and use Zhipu BigModel
(`glm-4.5-flash`). The AI provider key is stored as the server-side
`AI_API_KEY` secret and is never exposed to the frontend.

| Function | Purpose |
|----------|---------|
| `ai-summary` | Generates a concise summary for an individual event |
| `ai-smart-search` | Understands natural-language queries and ranks matching events |
| `ai-recommendation` | Recommends events from a student's interests, clubs, and availability |
| `ai-weekly-digest` | Produces a personalised schedule from registered and saved events |
| `ai-copilot` | Helps organisers draft and improve event titles and descriptions |

---

## 📁 Project Structure

```
src/
├── assets/          # CSS stylesheets and static assets
├── components/      # Shared components (EventCard, etc.)
├── layouts/         # Page layout wrappers (Student, Organiser, Admin)
├── lib/             # Supabase client, AI helpers, utility functions
├── router/          # Vue Router configuration with RBAC guards
├── stores/          # Pinia stores (auth, event, moderation)
├── types/           # TypeScript type definitions
└── views/
    ├── auth/        # Login & registration pages
    ├── student/     # Dashboard, Profile
    ├── organiser/   # Dashboard, Create Event
    └── admin/       # Dashboard, Events, Users, Reports, Settings

supabase/
├── functions/       # AI Edge Functions (Deno / TypeScript)
└── migrations/      # Database schema migrations
```

---

## 🚀 Getting Started

CampusHub is connected to a preconfigured Supabase demonstration backend.

The Supabase URL and publishable key included in `.env.example` are public
browser connection details. You do not need to create a Supabase project or
configure an AI API key.

The AI provider key is securely stored in the server-side Supabase Edge
Functions and is never exposed to the frontend.

An internet connection is required.

### Prerequisites

- Node.js `^22.18.0` or `>=24.12.0`
- npm

Check your installed versions:

```bash
node --version
npm --version
```

### 1. Clone the repository

```bash
git clone https://github.com/qklln9nn/Campus.git campus-eventhub-frontend
cd campus-eventhub-frontend
```

Alternatively, download and extract the project ZIP from GitHub.

### 2. Install dependencies

```bash
npm ci
```

### 3. Create the local environment file

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS or Linux:

```bash
cp .env.example .env.local
```

The supplied configuration connects the application to the hosted CampusHub
demonstration backend. No additional Supabase or AI configuration is required.

### 4. Start the application

```bash
npm run dev
```

Open the URL displayed in the terminal, normally:

[http://localhost:5173](http://localhost:5173)

Keep the terminal open while using the application. Press `Ctrl + C` to stop
the development server.

## 👥 Demonstration Accounts

For security reasons, accounts created through the registration page are
assigned the Student role by default.

**Demonstration login credentials for the Organiser and Administrator roles will be provided privately.**
Passwords are not stored in this public repository.

If you register your own account and would like to test Organiser or
Administrator functionality, please contact the project team so that the
account role can be updated.

---

## 📦 Build for Production

```bash
npm run build
```

The output will be in the `dist/` folder, ready to be deployed to any static hosting service (Vercel, Netlify, Nginx, etc.).

### Type check only

```bash
npm run type-check
```

### Lint & Format

```bash
npm run lint     # ESLint + oxlint
npm run format   # Prettier
```

---

## 👥 User Roles

| Role | Access |
|------|--------|
| `STUDENT` | Browse events, register, rate, report |
| `ORGANISER` | All student features + create & manage own events |
| `ADMIN` | Full platform access including user and content moderation |

Role-based access is enforced both on the frontend (Vue Router guards) and backend (Supabase Row Level Security policies).

---

## 📝 License

This project was developed as a university group project. All rights reserved.
