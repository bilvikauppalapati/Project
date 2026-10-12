# PawShare Architecture

## System overview

```mermaid
flowchart LR
    subgraph Browser["Browser (React + Vite, port 5173)"]
        UI[Pages & components]
        AX[Axios client<br/>adds JWT header]
        SC[socket.io-client]
        LF[Leaflet map]
    end

    subgraph Server["Node.js server (port 5001)"]
        EX[Express app<br/>routes → middleware → controllers]
        IO[socket.io server]
        CR[node-cron scheduler]
        ML[nodemailer<br/>or console fallback]
        UP[(uploads/ folder)]
    end

    DB[(MongoDB<br/>pawshare)]
    OSM[(OpenStreetMap tiles)]

    UI --> AX -->|REST /api| EX
    UI --> SC <-->|WebSocket /socket.io| IO
    LF -->|tiles| OSM
    EX -->|Mongoose| DB
    IO -->|Mongoose| DB
    CR -->|Mongoose| DB
    EX --> UP
    EX --> ML
    CR --> ML
    CR -.->|notification:new| IO
    EX -.->|notification:new / message:new| IO
```

- One Node.js process runs Express, socket.io and the cron job, all sharing the same HTTP server on port 5001.
- In development, Vite proxies `/api`, `/uploads` and `/socket.io` to port 5001, so the browser talks to a single origin.

## Backend layers (MVC)

```mermaid
flowchart TB
    R[routes/*.js<br/>URL + HTTP method] --> M1[middleware/auth.js<br/>protect / optionalAuth]
    M1 --> M2[middleware/roles.js<br/>authorize roles]
    M2 --> M3[middleware/upload.js<br/>multer, images only, 5 MB, max 5]
    M3 --> C[controllers/*.js<br/>validate input, business rules]
    C --> U[utils/<br/>matching, notify, chat, checkins, geo]
    C --> MD[models/*.js<br/>Mongoose schemas + indexes]
    U --> MD
    MD --> DB[(MongoDB)]
    C -->|throw AppError| E[middleware/errorHandler.js<br/>consistent JSON errors]
```

| Folder | Responsibility |
|---|---|
| `models/` | Schemas, validation rules, indexes, hooks (password hashing, rating recalculation) |
| `routes/` | Map URLs to controller functions and attach middleware |
| `controllers/` | Read the request, apply business rules, return JSON |
| `middleware/` | Cross-cutting concerns: authentication, roles, uploads, errors |
| `utils/` | Reusable logic: matching score, notifications, chat, check-in scheduling, email, geo helpers |
| `socket/` | Real-time connection handling |

Express 5 passes errors thrown in `async` handlers straight to the error middleware, so controllers just `throw new AppError('message', status)`.

## Request flow example: search animals near me

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as Express
    participant A as optionalAuth
    participant C as animalController.listAnimals
    participant D as MongoDB

    B->>E: GET /api/animals?species=dog&lat=17.44&lng=78.35&radiusKm=10&sort=match
    E->>A: check Authorization header
    A->>D: find user (if token valid)
    A->>C: req.user = adopter
    C->>D: aggregate [$geoNear (2dsphere, maxDistance 10 km), $lookup shelterprofiles]
    D-->>C: animals with distanceMeters
    C->>C: matchAnimal(adopter, animal) for each, sort by score
    C-->>B: { animals: [...matchScore, matchReasons, distanceKm], total, page }
```

## Authentication flow (JWT)

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server
    participant D as MongoDB

    B->>S: POST /api/auth/login { email, password }
    S->>D: find user by email (lowercase) + password hash
    S->>S: bcrypt.compare(password, hash)
    S->>S: jwt.sign({ id, role }, JWT_SECRET, 7d)
    S-->>B: { token, user }
    B->>B: localStorage.setItem(token)
    Note over B: Axios interceptor adds<br/>Authorization: Bearer TOKEN
    B->>S: GET /api/applications/mine (with token)
    S->>S: protect: jwt.verify(token) → id
    S->>D: load user (+ shelterProfile)
    S->>S: authorize('adopter'): role check
    S-->>B: 200 data (or 401 / 403)
```

- Passwords are never stored in plain text: a `pre('save')` hook hashes them with bcrypt.
- The token only contains the user id and role, and it is signed, so it can't be forged without `JWT_SECRET`.
- If the server ever answers 401, the frontend logs out automatically.

## Real-time messaging flow (socket.io)

```mermaid
sequenceDiagram
    participant A as Adopter browser
    participant S as socket.io server
    participant D as MongoDB
    participant C as Caregiver browser

    A->>S: connect({ auth: { token } })
    S->>S: verify JWT, join room user:adopterId
    C->>S: connect + join room user:caregiverId
    A->>S: conversation:join(convId)
    S->>D: check adopter is a participant
    A->>S: message:send { convId, text }
    S->>D: insert Message, update lastMessage, unread[caregiver] += 1
    S-->>A: ack { ok, message }
    S-->>C: message:new (room user:caregiverId)
    alt caregiver not viewing this chat
        S->>D: insert Notification
        S-->>C: notification:new (bell + toast)
    end
    C->>S: conversation:read(convId)
    S->>D: unread[caregiver] = 0, add caregiver to readBy
    S-->>A: conversation:read (shows "Seen")
```

- Every user joins a private room `user:<id>`, so the server can push to one person on all their open tabs.
- Chat windows also join `conversation:<id>` for typing indicators and to detect whether the recipient is already looking at the chat.

## Scheduled check-ins (node-cron)

```mermaid
flowchart TB
    A[Shelter marks application completed] --> B[scheduleCheckIns<br/>1 week · 1 month · 3 months]
    B --> C[(checkins: status upcoming)]
    D([node-cron: every day 09:00<br/>also on startup and via admin button]) --> E{upcoming check-in<br/>due within 1 day?}
    E -- yes --> F[status = due<br/>notify adopter + email]
    D --> G{due check-in more than<br/>7 days overdue?}
    G -- yes --> H[status = missed<br/>notify shelter + email]
    F --> I[Adopter logs health update<br/>notes · weight · mood · vet visit · photo]
    I --> J[status = completed<br/>notify shelter]
```

The schedule (7 / 30 / 90 days) lives in one place: `CHECKIN_SCHEDULE` in `server/utils/constants.js`.

## Frontend structure

```mermaid
flowchart TB
    main[main.jsx] --> BR[BrowserRouter]
    BR --> AP[AuthProvider<br/>user, token, login, logout]
    AP --> TP[ToastProvider<br/>react-hot-toast]
    TP --> SP[SocketProvider<br/>socket, unread counts, notifications]
    SP --> App[App.jsx routes]
    App --> L[Layout: Navbar + page + Footer]
    L --> P1[Public: Home, Animals, AnimalDetail, Map, Shelters, ShelterProfile, Login, Register]
    L --> P2[ProtectedRoute: Dashboard by role, Messages, Notifications, Profile, Applications, Check-ins]
    L --> P3[Role routes: AnimalForm shelter · Apply adopter]
```
