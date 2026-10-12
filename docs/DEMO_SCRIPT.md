# PawShare Live Demo Script (5–7 minutes)

## Before you start (2 minutes, before the panel arrives)

1. MongoDB is running: `mongosh --eval "db.runCommand({ping:1})"`
2. Reset the demo data and start the app:
   ```bash
   cd pawshare
   npm run seed
   npm run dev
   ```
3. Open **two browser windows** side by side:
   - **Window A** (normal): http://localhost:5173, log in as **user@gmail.com**
   - **Window B** (incognito/private): http://localhost:5173, log in as **care@gmail.com**
   - Password for every account: **Test@12345** (or click the *Demo accounts* buttons on the login page)
4. Keep the terminal visible. Emails from the app are printed there.
5. Allow location access when the map asks (otherwise it uses Hyderabad, which is also fine).

---

## 0:00 – Introduction (30 s)

> "PawShare is a MERN platform that helps shelters and individual caregivers find adopters and foster homes, matches adopters to animals by lifestyle and location, and tracks the whole journey through applications, chat and post-adoption check-ins. I'll show it with three accounts: an adopter, a caregiver and an admin."

Show the **Home page** (log out first, or use a third tab): hero, "Why adopt", featured animals, "How it works".

## 0:30 – F2 Search and matching (1 min) · Window A (user@gmail.com)

1. Click **Adopt & Foster**.
   > "As a logged-in adopter, results are sorted by **best match**. Each card shows a match percentage and reasons like *You like cats* or *Within 4 km*."
2. Click **Near me**, then choose **Within 5 km**. Cards now show distance, nearest first.
   > "Distance uses MongoDB's `$geoNear` on a 2dsphere index."
3. Tick **Cat** and the tag **Good with cats**. Point out the URL now contains the filters.
4. Change sort to **Best match**. Point out Bruno (large, high-energy dog) is lower: *"apartment, no yard"*.

## 1:30 – F1 Animal profile (45 s) · Window A

1. Open **Coco**.
   > "The profile has a photo gallery, health records with vaccination dates, temperament tags, and the caregiver card with a verified badge and 4.5-star rating."
2. Scroll to **Your match**: each factor shows its points and reason.
   > "The score is out of 100: species, size, age, kids, other pets, activity, home and yard, distance and experience."
3. Click the **heart** (favourite).

## 2:15 – F3 Application workflow (1 min 15 s) · both windows

1. **Window A:** Coco → **Apply to foster** → enter "6 weeks" → **Submit application**. The status timeline appears.
2. **Window B (care@gmail.com):** a toast pops up instantly: *New foster application for Coco*.
   > "Notifications are pushed in real time over socket.io and also emailed. Here's the email in the server console."
3. **Window B:** Dashboard → **Applications** → open **Demo User → Pepper** → **Start review** → **Approve** with the note "Come meet Pepper on Saturday" → **Confirm**.
4. **Window A:** a toast appears: *Application approved: Pepper*. Open it to show the timeline (Submitted → Under review → Approved).
   > "Approving sets Pepper to *pending*, and only one application per animal can be approved."
5. **Window B:** **Mark as completed**.
   > "Completing it marks Pepper adopted, auto-rejects other applicants, increases the adoption count, and schedules check-ins at 1 week, 1 month and 3 months."

## 3:30 – F4 Messaging (45 s) · both windows

1. **Window A:** chat icon → **Demo Caregiver**. **Window B:** chat icon → **Demo User**.
2. Type in Window B: Window A shows *typing…*. Send it: it appears instantly in Window A, and Window B shows **Seen**.
   > "socket.io with JWT authentication in the handshake. Messages are stored in MongoDB, and unread counts are kept per user."

## 4:15 – F5 Check-ins (45 s) · both windows

1. **Window A:** Dashboard → **Check-ins waiting for you** → **Luna · 1 month** → choose mood, type notes, weight 4.2, tick vet visit, add a photo → **Complete check-in**.
2. **Window B:** Dashboard → **Check-ins**. Luna's update is there with the 1-week history.
   > "A node-cron job runs every morning: it reminds adopters a day before a check-in and alerts the shelter if one is more than a week overdue."

## 5:00 – F6 Verified profiles and reviews (30 s)

1. **Window A:** **Shelters** → **Demo Caregiver**: verified badge, rating, reviews, adoption history, current animals, map pin.
2. Point out **Kukatpally Paws Collective** shows *Awaiting verification*.

## 5:30 – Admin (45 s) · Window B: log out, then log in as admin@gmail.com

1. **Overview:** counts, recent activity, application and check-in breakdowns.
2. **Shelter verification** → **Verify** Kukatpally Paws Collective.
   > "Shelters stay unverified until an admin checks them; adopters can filter to verified shelters only."
3. **Run reminders now**: shows how many reminders were sent (the emails print in the terminal).
4. **Listings** tab: show **Deactivate** for inappropriate listings.

## 6:15 – F7 Map (30 s)

Click **Map**.
> "Leaflet with OpenStreetMap, no API key. Green house pins are verified shelters, orange pins are animals. It uses my browser location and falls back to Hyderabad. Shelters come from a `$near` query, animals from `$geoWithin` with the selected radius."

Change the radius to **10 km** and the species to **Cat**, then open a popup → **Meet Coco →**.

## 6:45 – Wrap-up (15 s)

> "All seven required features plus lifestyle matching are implemented with MongoDB, Express, React and Node, tested with 80 automated API checks and 33 browser checks. Thank you, happy to take questions."

---

### If something goes wrong

| Problem | Fix |
|---|---|
| Login fails | Run `npm run seed` again (it recreates the fixed accounts) |
| "Cannot reach the server" toast | Backend not running: `npm run dev` in the project root |
| Map tiles blank | No internet: markers and lists still work; mention tiles come from OpenStreetMap |
| Pepper already approved | You ran the demo before. Run `npm run seed` to reset |
