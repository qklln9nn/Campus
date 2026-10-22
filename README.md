# 🎓 CampusHub — Campus Event Management Platform

A full-stack campus event discovery and management platform built with Vue 3, Supabase, and AI-powered features. Designed for students, event organisers, and administrators to collaborate seamlessly around campus activities.

---

## ✨ Features

### 🎟️ For Students
- Browse and search campus events with filters (category, date, status)
- **AI Smart Search** — describe what you're looking for in natural language
- **AI Event Summary** — get a quick AI-generated brief for any event
- **AI Weekly Digest** — personalised weekly schedule summary based on your registrations
- **AI Recommendations** — suggested events tailored to your profile and interests
- Register, join waitlists, and cancel registrations
- Save (bookmark) events for later
- Rate completed events
- Receive in-app notifications (waitlist promotions, reminders)
- View events on an interactive map
- Report inappropriate events

### 🗓️ For Organisers
- Create and publish events (title, date, time, location, category, capacity, poster)
- Draft, edit, and delete events
- View attendee lists and manage check-ins
- Track event statistics (registrations, occupancy rate)

### 🛡️ For Administrators
- Dashboard with real-time stats (total events, users, registrations)
- Charts: events by category (bar + donut pie)
- Manage all events (publish, reject, cancel, delete)
- Manage user accounts (role changes, suspension)
- Review and resolve moderation reports
- Configure workflow and governance rules (auto-publish, review thresholds)

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

All AI features are powered by Supabase Edge Functions deployed on Deno:

| Function | Description |
|----------|-------------|
| `ai-summary` | Generates a short summary for a single event |
| `ai-smart-search` | Natural language event search across the full event list |
| `ai-recommendation` | Recommends events based on student profile and history |
| `ai-weekly-digest` | Generates a personalised weekly event schedule |
| `ai-copilot` | Assists organisers with event copy and descriptions |

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

### Prerequisites

- Node.js `^22.18.0` or `>=24.12.0`
- A [Supabase](https://supabase.com) project with the schema applied

### 1. Clone the repository

```bash
git clone https://github.com/qklln9nn/Campus.git
cd campus-eventhub-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

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
