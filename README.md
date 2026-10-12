# 🐾 PawShare – Pet Adoption & Community Foster Care Platform

A full-stack **MERN** web application that connects animal shelters and individual caregivers with people who want to adopt or foster.

> Woxsen University · School of Technology · Full Stack Development (24TU05MJC1) · PBL 2

---

## Problem statement

Shelters and individual caregivers often struggle to find suitable adopters or temporary foster homes for animals in need, while prospective pet owners find it difficult to discover verified, nearby animals awaiting adoption. PawShare is a full-stack MERN platform that lets shelters and individuals list animals available for adoption or fostering with detailed profiles, matches adopters based on lifestyle and location preferences, and tracks the adoption or foster journey through status updates and post-adoption check-ins.

## Features

| # | Feature | What it does |
|---|---|---|
| F1 | Animal listings | Shelters add animals with up to 5 photos, health records (vaccinations with dates, sterilisation, deworming, medical notes, special needs), temperament tags, listing type and status. Listings can be edited, have their status changed, or be soft-deleted. |
| F2 | Search & filters | Species, breed, age range, size, gender, adopt/foster, temperament tags, vaccinated/sterilised, verified shelters only, and distance from your location (MongoDB `$geoNear`). Sort by nearest, newest or best match. Pagination. Filters live in the URL. |
| F3 | Application workflow | Adopters apply to adopt or foster with a lifestyle questionnaire. Shelters review, approve, reject and complete applications. Status timeline, automatic animal status changes, auto-rejection of other applicants, notifications and emails. |
| F4 | Messaging | Real-time chat with socket.io (JWT-authenticated): conversation list, unread counts, history, typing indicator, read receipts, online status. |
| F5 | Check-ins | Completing an adoption schedules check-ins at 1 week, 1 month and 3 months. A daily node-cron job sends reminders and flags missed check-ins. Adopters log health updates (notes, weight, mood, vet visit, photo). |
| F6 | Verified profiles | Public shelter/caregiver profiles with verified badge, map pin, average rating, reviews, adoption count, current animals and adoption history. Admins verify shelters. Adopters review once per completed adoption. |
| F7 | Map view | Leaflet + OpenStreetMap map of nearby shelters and adoptable animals with different markers, popups, radius and filters. Uses browser location, falls back to Hyderabad. |
| ★ | Lifestyle matching | A transparent 0–100 score (species, size, age, kids, other pets, activity, home & yard, distance, experience) with reasons such as "Good with cats" and "Within 4 km". |

Also included: in-app notifications with a bell and live push, adopter / shelter / admin dashboards, role-based access, toasts, a responsive design that works on phones, and a 404 page.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Vite), React Router 7, Tailwind CSS 4, Axios, react-leaflet + Leaflet (OpenStreetMap tiles), socket.io-client, react-hot-toast |
| Backend | Node.js 24, Express 5, Mongoose 9, jsonwebtoken, bcryptjs, multer, socket.io, node-cron, nodemailer, dotenv, cors |
| Database | MongoDB 9 (local) with 2dsphere geospatial indexes |
| Tools | Git, nodemon, concurrently |

## Demo accounts

Run `npm run seed` first. Every account uses the password **`Test@12345`**.

| Role | Name | Email | What you'll see |
|---|---|---|---|
| Admin | Admin | `admin@gmail.com` | Platform stats, recent activity, 1 shelter awaiting verification, listing moderation |
| Adopter | Demo User | `user@gmail.com` | Applications in every status, a completed adoption (Luna) with a due check-in, chat with the caregiver, favourites, notifications, a review |
| Individual caregiver (verified) | Demo Caregiver | `care@gmail.com` | Listings in every status, a submitted application from Demo User (Pepper) to approve live, messages, reviews (4.5★) |

Extra accounts: `happytails@pawshare.org`, `secshelter@pawshare.org` (verified shelters), `kukatpallypaws@pawshare.org` (awaiting verification), and `asha@pawshare.org`, `ravi@pawshare.org`, `meera@pawshare.org` (adopters).

In development mode the login page has a **Demo accounts** box that fills these in with one click.

## Setup on macOS (Apple Silicon)

### 1. Prerequisites

```bash
node -v                 # v20 or newer
node -p process.arch    # arm64
git --version
```

MongoDB Community Server, either way:

- **Homebrew:** `brew tap mongodb/brew && brew install mongodb-community mongosh && brew services start mongodb-community`
- **Without Homebrew** (how this machine is set up): MongoDB is installed in `~/mongodb` and started at login by `~/Library/LaunchAgents/org.mongodb.mongod.plist`.

Check that it is running:

```bash
mongosh --eval "db.runCommand({ping:1})"      # { ok: 1 }
```

### 2. Install

```bash
git clone https://github.com/bilvikauppalapati/Project.git pawshare
cd pawshare
npm run install-all
```

### 3. Configure

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env`:

| Variable | Example | Notes |
|---|---|---|
| `PORT` | `5001` | 5000 is used by AirPlay on macOS |
| `MONGO_URI` | `mongodb://localhost:27017/pawshare` | If MongoDB has a password: `mongodb://USER:PASS@localhost:27017/pawshare?authSource=pawshare` (write `@` in the password as `%40`) |
| `JWT_SECRET` | long random string | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | `http://localhost:5173` | Allowed by CORS and socket.io |
| `SMTP_*` | empty | Leave empty to print emails in the server console |
| `CHECKIN_CRON` | `0 9 * * *` | When the reminder job runs (daily 9 AM) |

`client/.env` can stay empty: Vite proxies `/api`, `/uploads` and `/socket.io` to port 5001.

### 4. Seed and run

```bash
npm run seed     # clears the database, creates demo accounts and data
npm run dev      # starts backend (5001) and frontend (5173) together
```

Open **http://localhost:5173**.

## One-command start

```bash
./start.sh           # frees ports, checks/starts MongoDB, installs packages if needed, starts everything, runs health checks, opens the browser
./start.sh --seed    # same, but resets the demo data first
./stop.sh            # stops the website and frees ports 5001 and 5173
```

`start.sh` keeps watching the backend and website and restarts them automatically if either stops responding. Logs are written to `.logs/`.

## Scripts

| Where | Command | Does |
|---|---|---|
| root | `npm run install-all` | Installs root, server and client dependencies |
| root | `npm run dev` | Runs server (nodemon) and client (Vite) together |
| root | `npm run seed` | Seeds the database |
| root | `npm run build` | Builds the client for production |
| server | `npm run dev` / `npm start` / `npm run seed` | Dev with auto-reload / production / seed |
| client | `npm run dev` / `npm run build` | Vite dev server / production build |

## Folder structure

```
pawshare/
├── server/
│   ├── config/db.js              MongoDB connection
│   ├── models/                   User, ShelterProfile, Animal, Application, Conversation,
│   │                             Message, CheckIn, Review, Notification (+ pointSchema)
│   ├── controllers/              Request handlers (one per resource)
│   ├── routes/                   Express routers
│   ├── middleware/               auth.js (JWT), roles.js, upload.js (multer), errorHandler.js
│   ├── utils/                    matching.js, scheduler.js (cron), checkins.js, notify.js,
│   │                             chat.js, email.js, geo.js, validate.js, parse.js, ...
│   ├── socket/index.js           socket.io server
│   ├── uploads/                  Uploaded images (git-ignored)
│   ├── seed-images/              Free Unsplash photos used by the seed
│   ├── seed.js                   Demo data
│   ├── app.js / server.js        Express app / HTTP + socket.io + cron startup
│   └── .env.example
├── client/
│   ├── src/api/client.js         Axios instance with JWT interceptor
│   ├── src/context/              AuthContext, SocketContext, ToastContext
│   ├── src/components/           Navbar, AnimalCard, LocationPicker, StatusTimeline, ...
│   ├── src/pages/                All pages + dashboards/
│   └── src/utils/                Formatting helpers and option lists
├── docs/                         API, database, architecture, flows, testing, demo, viva notes
├── package.json                  Root scripts (concurrently)
└── README.md
```

## Screenshots

| Home | Adopter dashboard |
|---|---|
| ![Home page](docs/screenshots/home.png) | ![Adopter dashboard](docs/screenshots/adopter-dashboard.png) |

| Animal detail with match breakdown | Map of nearby shelters and animals |
|---|---|
| ![Animal detail](docs/screenshots/animal-detail.png) | ![Map](docs/screenshots/map.png) |

| Caregiver dashboard | Admin dashboard |
|---|---|
| ![Shelter dashboard](docs/screenshots/shelter-dashboard.png) | ![Admin dashboard](docs/screenshots/admin-dashboard.png) |

| Real-time chat | Mobile |
|---|---|
| ![Chat](docs/screenshots/chat.png) | ![Mobile home](docs/screenshots/home-mobile.png) |

## Documentation

- [docs/API.md](docs/API.md): every REST endpoint and socket event
- [docs/DATABASE.md](docs/DATABASE.md): collections, fields, relationships, indexes, ER diagram
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system diagram, request, auth, socket and cron flows
- [docs/USER_FLOWS.md](docs/USER_FLOWS.md): adopter, shelter and admin journeys, application lifecycle
- [docs/TESTING.md](docs/TESTING.md): test checklist and results
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md): 5–7 minute live demo
- [docs/VIVA_NOTES.md](docs/VIVA_NOTES.md): concepts explained simply, plus 25 viva questions

## Notes

- Animal photos in the seed data are free photos from [Unsplash](https://unsplash.com/license); the hero image is also from Unsplash.
- Map tiles © OpenStreetMap contributors.
- Emails are printed to the server console unless SMTP settings are provided.
