# PawShare Viva Notes

Simple explanations of how PawShare works, with pointers to the exact files.

---

## 1. MERN in one minute

| Letter | Technology | Its job in PawShare |
|---|---|---|
| **M** | MongoDB | Stores users, shelter profiles, animals, applications, messages, check-ins, reviews and notifications as JSON-like documents |
| **E** | Express | The web server framework: receives HTTP requests (`/api/...`), runs middleware, calls controllers, returns JSON |
| **R** | React | The user interface in the browser: pages, forms, dashboards, map and chat |
| **N** | Node.js | Runs JavaScript on the server (Express, socket.io, node-cron all run inside it) |

The browser (React) talks to the server (Express) through a **REST API** for normal data and through **WebSockets** (socket.io) for live updates. The server talks to MongoDB through **Mongoose**.

## 2. REST API

REST means each URL is a **resource** and the HTTP method says what to do with it:

| Method | Meaning | Example |
|---|---|---|
| GET | read | `GET /api/animals?species=dog` |
| POST | create | `POST /api/applications` |
| PATCH | update part of something | `PATCH /api/applications/:id/status` |
| DELETE | remove | `DELETE /api/animals/:id` |

Responses are JSON with a status code (200 OK, 201 Created, 400 Bad request, 401 Not logged in, 403 Forbidden, 404 Not found, 409 Conflict). All errors go through one middleware (`server/middleware/errorHandler.js`), so every error has the same shape: `{ success: false, message }`.

## 3. Folder structure (MVC)

- **Models** (`server/models`): what the data looks like (Mongoose schemas, validation, indexes).
- **Controllers** (`server/controllers`): what happens for each request (business rules).
- **Routes** (`server/routes`): which URL calls which controller, and which middleware runs first.
- The **View** is the React app in `client/`.

## 4. JWT login flow

1. The user sends email + password to `POST /api/auth/login`.
2. The server finds the user and checks the password with `bcrypt.compare`.
3. If it's correct, the server creates a **JWT** (JSON Web Token) with `jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' })`.
4. The browser saves the token in `localStorage`. The Axios interceptor (`client/src/api/client.js`) adds `Authorization: Bearer <token>` to every request.
5. On protected routes, the `protect` middleware (`server/middleware/auth.js`) runs `jwt.verify`. If the signature is valid and not expired, it loads the user into `req.user`.

**Why it is secure:** the token is *signed* with a secret only the server knows. If anyone changes the role inside the token, the signature no longer matches and `jwt.verify` fails. The token holds no password.

## 5. bcrypt password hashing

- Passwords are never stored in plain text. A Mongoose `pre('save')` hook in `models/User.js` replaces the password with `bcrypt.hash(password, 10)`.
- A **hash** is one-way: you can't turn it back into the password. To log in we hash the attempt and compare.
- A **salt** (random data added before hashing) means two users with the same password get different hashes, which defeats precomputed "rainbow tables".
- **10 rounds** makes hashing deliberately slow, which slows down brute-force attacks.
- The password field has `select: false`, so it is never sent back in API responses.
- Password rule: at least 8 characters with a letter, a number and a special character (`PASSWORD_RULE` in `utils/constants.js`).

## 6. Role middleware

`authorize('shelter')` in `server/middleware/roles.js` runs **after** `protect` and checks `req.user.role`. Example:

```
router.post('/animals', protect, authorize('shelter'), upload.array('photos', 5), createAnimal)
```

Only logged-in shelters reach `createAnimal`. Inside controllers we also check **ownership**: a shelter can only edit its own animals (`animal.shelter.equals(req.user._id)`), and an adopter can only see their own applications. The frontend hides buttons and uses `ProtectedRoute`, but the **server** is what actually enforces it.

## 7. multer image uploads

- Forms with photos are sent as `multipart/form-data`.
- `multer` (`server/middleware/upload.js`) saves files to `server/uploads/` with a random file name, accepts only JPG/PNG/WEBP, and limits them to 5 MB each and 5 per animal.
- The database stores only the path (e.g. `/uploads/171234-ab12cd.jpg`). Express serves the folder with `express.static`.
- If validation fails after upload, the saved files are deleted so no orphan files are left.

## 8. Geospatial search

- Locations are stored as **GeoJSON points**: `{ type: 'Point', coordinates: [longitude, latitude] }`. Longitude comes first.
- A **2dsphere index** on `location` lets MongoDB calculate distances on the curved Earth.
- Three geo queries are used:

| Query | Where | What it does |
|---|---|---|
| `$geoNear` (aggregation) | `GET /api/animals?lat&lng&radiusKm` | Finds animals within the radius, adds `distanceMeters`, sorts nearest first. Works inside an aggregation, so we can also count the total for pagination. |
| `$near` | `GET /api/shelters/nearby` | Shelters sorted by distance (map side list) |
| `$geoWithin` + `$centerSphere` | `GET /api/animals/map` | All animals inside a circle for map markers. The radius is in radians = km ÷ 6378.1 (Earth's radius). |

- The browser gets the user's position with `navigator.geolocation`. If that is denied, it uses Hyderabad (17.3850, 78.4867).

## 9. Matching algorithm (`server/utils/matching.js`)

Each factor gives points; the total is out of **100**:

| Factor | Max | Full points when… |
|---|---|---|
| Species | 15 | animal's species is in the adopter's list (80% if no preference) |
| Size | 10 | size is in the preferred sizes |
| Age | 5 | age is inside the preferred age range |
| Kids | 15 | no kids, or the animal is tagged *kid-friendly* (0 if shy or needs an experienced owner) |
| Other pets | 15 | no pets, or the animal is *good-with-dogs* / *good-with-cats* for each pet the adopter has |
| Activity | 10 | same activity level (half if one level apart) |
| Home & yard | 10 | not a large animal in an apartment, and not a high-energy dog without a yard |
| Distance | 15 | within half of the adopter's max distance (less the further away) |
| Experience | 5 | animal doesn't need an experienced owner, or the adopter is experienced |

The function returns `{ score, reasons, concerns, breakdown }`. Cards show the score and top reasons, and the animal page shows every factor with its points.

**Why this approach:** it is *explainable*. Every point can be justified to the adopter, unlike a black-box ML model, and it needs no training data.

## 10. Application workflow

Statuses: `submitted → under_review → approved → completed`, plus `rejected` and `withdrawn`. A `TRANSITIONS` table in `applicationController.js` lists which changes are allowed. Only the shelter can approve, reject or complete, and only the adopter can withdraw. Each change is pushed into `statusHistory` (status, note, who, when), which the timeline shows. Side effects keep the animal's status in sync.

## 11. socket.io messaging

- HTTP is request–response: the server can't push. **WebSockets** keep a connection open in both directions.
- On connect, the client sends its JWT (`io(url, { auth: { token } })`). The server verifies it before accepting (`server/socket/index.js`).
- Each user joins a private **room** `user:<id>`, so the server can send to one person on all their tabs. Chat windows also join `conversation:<id>`.
- Sending a message: the client emits `message:send` → the server checks the sender is a participant → saves it in MongoDB → updates the unread count → emits `message:new` to both users → creates a notification if the recipient isn't viewing that chat.
- Extras: typing indicator (`typing` event), read receipts (`conversation:read`), online status (`presence`).

## 12. node-cron check-ins

- When an application is completed, `scheduleCheckIns` creates 3 check-ins (7, 30 and 90 days later).
- `utils/scheduler.js` uses **node-cron** with the expression `0 9 * * *` (minute 0, hour 9, every day), which means every day at 9 AM.
- The job:
  - marks check-ins due within a day as `due` and notifies + emails the adopter;
  - marks ones more than 7 days overdue as `missed` and alerts the shelter.
- It also runs once on server start, and admins can trigger it with **Run reminders now** (useful for demos).
- Emails use nodemailer. Without SMTP settings they are printed in the console, so the app never breaks.

## 13. React concepts used

- **Components** and **props** (e.g. `AnimalCard`), **state** with `useState`, side effects (loading data) with `useEffect`.
- **Context** for global state: `AuthContext` (logged-in user), `SocketContext` (live connection, unread counts), `ToastContext`.
- **React Router** for pages; `ProtectedRoute` redirects guests to login and wrong roles to their dashboard.
- **Controlled forms**, URL query strings for filters (`useSearchParams`), Tailwind utility classes for styling.

---

## 25 likely viva questions

1. **What problem does PawShare solve?**
   Shelters struggle to find adopters and fosterers, and adopters struggle to find verified animals nearby. PawShare connects them, matches them by lifestyle and location, and tracks the journey through to post-adoption check-ins.

2. **Why MongoDB instead of SQL?**
   Documents map naturally to JavaScript objects, nested data like health records and questionnaires fit in one document, the schema can evolve, and MongoDB has built-in geospatial indexes for distance search.

3. **What is Mongoose?**
   An ODM (Object Data Modelling) library. It gives schemas, validation, default values, hooks (like password hashing), references with `populate`, and indexes on top of MongoDB.

4. **How is a password stored?**
   As a bcrypt hash with a salt (10 rounds) created in a pre-save hook. It is never stored or returned in plain text.

5. **How does login work?**
   Email and password are checked with bcrypt. The server returns a signed JWT, which the browser sends in the Authorization header. The `protect` middleware verifies it on each protected request.

6. **What's inside your JWT? Can a user change their role?**
   Only the user id, role, and issue/expiry times. Changing the role breaks the signature, so `jwt.verify` rejects it. The user is also reloaded from the database on each request.

7. **What is middleware in Express?**
   A function that runs before the final handler and can stop the request or add data. We use `protect` (JWT), `authorize` (roles), `upload` (multer) and `errorHandler`.

8. **How do you stop a shelter editing another shelter's animal?**
   `loadOwnedAnimal` compares `animal.shelter` with `req.user._id` and returns 403 if they don't match (admins are allowed).

9. **How are images uploaded?**
   multer saves them to `server/uploads` with random names and checks type (jpg/png/webp), size (5 MB) and count (5). MongoDB stores only the path, and Express serves the folder statically.

10. **How does the distance search work?**
    Locations are GeoJSON points with a 2dsphere index. `$geoNear` with `maxDistance` finds animals within the radius and returns the distance, sorted nearest first.

11. **Why `[longitude, latitude]` and not the other way round?**
    That is the GeoJSON standard (x, y), and MongoDB requires it.

12. **Difference between `$near`, `$geoNear` and `$geoWithin`?**
    `$near` is a query operator that sorts by distance. `$geoNear` is the aggregation version that also returns the distance and can be combined with other stages and counts. `$geoWithin` just checks whether a point is inside a shape, without sorting.

13. **Explain your matching algorithm.**
    It is a weighted points system out of 100 across 9 factors (species, size, age, kids, other pets, activity, home & yard, distance, experience). Each factor returns points and a reason, so the score can be explained.

14. **Why not machine learning for matching?**
    There is no historical data to train on, and a rule-based score is transparent, fair, and easy to adjust or explain to adopters and examiners.

15. **How do you prevent duplicate applications?**
    Before creating one, we check for an existing application by the same adopter for the same animal with an active status (submitted, under review, approved) and return 409.

16. **What happens when an adoption is completed?**
    The animal becomes adopted or fostered, the shelter's adoption count goes up, other open applications are auto-rejected with a note, 3 check-ins are scheduled, notifications and emails are sent, and the adopter can leave a review.

17. **Why socket.io instead of polling?**
    Polling wastes requests and adds delay. WebSockets keep one open connection so the server pushes messages and notifications instantly.

18. **How is the socket connection secured?**
    The JWT is sent in the handshake (`auth.token`) and verified in `io.use` middleware. Joining a conversation checks that the user is a participant.

19. **How do unread counts work?**
    Each conversation stores a map `unread: { userId: count }`. Sending increments the recipient's count. Opening the chat sets it to 0 and adds the user to `readBy` on the messages (read receipts).

20. **What is node-cron and what cron expression do you use?**
    A scheduler that runs a function on a timetable. `0 9 * * *` means 09:00 every day: send check-in reminders and mark missed ones.

21. **What if email isn't configured?**
    `utils/email.js` checks for SMTP settings. Without them, emails are logged to the console instead of failing.

22. **How are ratings calculated?**
    A Review `post('save')` hook runs an aggregation (`$group` with `$avg` and `$sum`) over that shelter's reviews and stores `averageRating` and `reviewCount` on the ShelterProfile. A unique index on `application` allows one review per adoption.

23. **Why soft delete animals?**
    Applications, check-ins and reviews reference the animal. Setting `isActive: false` hides the listing but keeps the history intact, and an admin can reactivate it.

24. **How does the frontend protect pages?**
    `ProtectedRoute` checks `AuthContext`: guests go to login, wrong roles go to their dashboard. Real security is on the server; the frontend only improves the experience.

25. **What would you add next?**
    Image storage in the cloud (e.g. S3), push notifications on mobile, document uploads for shelter verification, tests in CI, and deployment with HTTPS (e.g. Render + MongoDB Atlas).

---

## Bonus quick facts

- Ports: backend **5001** (5000 is taken by macOS AirPlay), frontend **5173**.
- Collections: 9 · REST endpoints: 55 · Socket events: 11.
- Tests: 80 automated API checks + 33 browser checks, all passing.
- Fixed demo accounts: `admin@gmail.com`, `user@gmail.com`, `care@gmail.com`, all with password `Test@12345`.
