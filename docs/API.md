# PawShare API Reference

Base URL: `http://localhost:5001/api`

- **Auth:** send `Authorization: Bearer <token>` (the token comes from register/login).
- **Roles:** `adopter`, `shelter`, `admin`. "Any" means any logged-in user. "Public" means no token needed. "Optional" means it works without a token but returns extra data with one.
- **Success responses** look like `{ "success": true, ... }`.
- **Errors** always look like:

```json
{ "success": false, "message": "Validation failed: Size is required", "details": { "size": "Size is required" } }
```

| Status | Meaning |
|---|---|
| 400 | Invalid input (validation, bad id, bad coordinates, wrong file type) |
| 401 | Not logged in / invalid or expired token / wrong password |
| 403 | Logged in but not allowed (wrong role or not the owner) |
| 404 | Not found |
| 409 | Conflict (duplicate email, duplicate application, invalid status change) |
| 500 | Unexpected server error |

---

## Health & metadata

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | `{ status: "ok", time }` |
| GET | `/meta` | Public | Allowed values: species, sizes, temperament tags, statuses, check-in schedule, etc. |

## Auth: `/auth`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/register` | Public | `name, email, password, role ('adopter'\|'shelter'), phone?, city?, lat?, lng?` + for shelters `organisationName?, shelterType ('shelter'\|'individual caregiver'), description?, address?, website?` | Creates a user (and a ShelterProfile for shelters). Password: 8+ characters with a letter, a number and a special character. Shelters must send `lat`/`lng`. |
| POST | `/auth/login` | Public | `email, password` | Email is case-insensitive. |
| GET | `/auth/me` | Any | – | Current user, including `shelterProfile` for shelters |
| PATCH | `/auth/me` | Any | `name?, phone?, city?, lat?, lng?, preferences?` (adopters) `, shelterProfile?` (shelters) | Update profile and preferences |
| PATCH | `/auth/password` | Any | `currentPassword, newPassword` | Change password, returns a new token |

**Register / login response**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "6acd...",
    "name": "Demo User",
    "email": "user@gmail.com",
    "role": "adopter",
    "city": "Gachibowli, Hyderabad",
    "location": { "type": "Point", "coordinates": [78.3489, 17.4401] },
    "preferences": { "species": ["dog", "cat"], "sizes": ["small", "medium"], "ageRange": { "min": 0, "max": 8 },
      "hasKids": false, "hasOtherPets": true, "otherPetTypes": ["cat"], "homeType": "apartment",
      "hasYard": false, "activityLevel": "medium", "experience": "some", "maxDistanceKm": 15 },
    "favourites": []
  }
}
```

## Animals: `/animals`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/animals` | Optional | Search with filters and pagination (see below). Adopters also get `matchScore` and `matchReasons`. |
| GET | `/animals/map?lat&lng&radiusKm&species&size&listingType` | Public | Lightweight markers within a radius (`$geoWithin` + `$centerSphere`) |
| GET | `/animals/mine?status&removed&page` | shelter | Own listings with `activeApplications` per animal and `statusCounts` |
| GET | `/animals/favourites` | Any | Saved animals |
| GET | `/animals/:id?lat&lng` | Optional | Full details, `shelterProfile`, `distanceKm`. Adopters also get `match` (score, reasons, breakdown) and `myApplication`. |
| POST | `/animals/:id/favourite` | Any | Toggle favourite → `{ favourited, favourites }` |
| POST | `/animals` | shelter | Create (multipart/form-data, up to 5 `photos`) |
| PATCH | `/animals/:id` | owner shelter / admin | Update any field, add `photos`, remove `removePhotos` (JSON list of URLs) |
| DELETE | `/animals/:id` | owner shelter / admin | Soft delete (`isActive: false`). Blocked while applications are open. |
| PATCH | `/animals/:id/active` | admin | `{ isActive: true\|false }` to deactivate or reactivate a listing |

**Search query parameters** for `GET /animals`:

| Param | Example | Notes |
|---|---|---|
| `q` | `bruno` | Name or breed contains (case-insensitive) |
| `species` | `dog,cat` | Comma list |
| `breed` | `indie` | Contains |
| `minAge`, `maxAge` | `1`, `3` | Years (stored as months) |
| `size` | `small,medium` | Comma list |
| `gender` | `female` | |
| `listingType` | `adoption` / `foster` / `both` | `adoption` also matches `both` |
| `temperament` | `good-with-cats,calm` | Animal must have **all** tags |
| `vaccinated`, `sterilised` | `true` | |
| `verifiedOnly` | `true` | Only verified shelters |
| `status` | `available` (default) / `all` | |
| `shelter` | user id | One shelter's animals |
| `lat`, `lng`, `radiusKm` | `17.44`, `78.35`, `10` | Uses `$geoNear`, adds `distanceKm` |
| `sort` | `nearest`, `newest`, `match`, `youngest`, `eldest`, `name` | `match` only for adopters |
| `page`, `limit` | `1`, `12` | Max limit 50 |

**Create animal** (multipart fields): `name, species, breed, ageYears | ageMonths, size, gender, color, activityLevel, description, listingType, temperamentTags (JSON array or comma list), vaccinated, sterilised, dewormed, vaccinations (JSON [{name,date}]), medicalNotes, specialNeeds, city, lat?, lng?, photos (files)`. Location defaults to the shelter profile's location.

**Search response**

```json
{
  "success": true,
  "animals": [
    {
      "_id": "...", "name": "Coco", "species": "cat", "ageMonths": 10, "size": "small",
      "photos": ["/uploads/seed-cat-21.jpg"], "temperamentTags": ["friendly", "calm"],
      "status": "available", "listingType": "both", "distanceKm": 3.8,
      "shelterProfile": { "organisationName": "Demo Caregiver", "type": "individual caregiver", "isVerified": true, "averageRating": 4.5 },
      "matchScore": 100,
      "matchReasons": ["You like cats", "Small size suits you", "In your preferred age range"]
    }
  ],
  "page": 1, "limit": 12, "total": 19, "totalPages": 2
}
```

## Applications: `/applications`

| Method | Path | Auth | Body / query | Description |
|---|---|---|---|---|
| POST | `/applications` | adopter | `animalId, type ('adoption'\|'foster'), fosterDuration (required for foster), questionnaire { homeType, hasYard, hasKids, otherPets, experience, workHoursPerDay, reason }` | Submit. Blocks duplicate active applications and unavailable animals. Stores `matchScore`. |
| GET | `/applications/mine?status` | adopter | | My applications |
| GET | `/applications/incoming?status&animal&page` | shelter | | Applications for my animals |
| GET | `/applications/:id` | adopter / shelter of it / admin | | Details with populated `statusHistory` |
| PATCH | `/applications/:id/status` | see rules | `status, note?` | Move through the workflow |

**Allowed status changes**

| From | To | Who |
|---|---|---|
| submitted | under_review, approved, rejected | shelter |
| submitted, under_review | withdrawn | adopter |
| under_review | approved, rejected | shelter |
| approved | completed, rejected | shelter |

Side effects: approved → animal `pending`; rejecting an approved application → animal `available`; completed → animal `adopted`/`fostered`, shelter `adoptionCount + 1`, other open applications auto-rejected, 3 check-ins scheduled. Every change notifies the other party (in-app and by email).

## Conversations: `/conversations`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/conversations` | Any | My conversations with `otherUser` (and their online status), `lastMessage`, `unreadCount` |
| POST | `/conversations` | Any | `{ recipientId? , animalId?, text? }`. Starts or reuses the conversation between an adopter and a shelter. |
| GET | `/conversations/unread-count` | Any | `{ unread }` total |
| GET | `/conversations/:id` | participant | One conversation |
| GET | `/conversations/:id/messages?before&limit` | participant | History, oldest first; `hasMore` for paging older messages |
| POST | `/conversations/:id/messages` | participant | `{ text }` (REST fallback for the socket event) |
| PATCH | `/conversations/:id/read` | participant | Mark as read |

## Notifications: `/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications?unread=true&page` | Any | List with `unreadCount` |
| PATCH | `/notifications/:id/read` | owner | Mark one as read |
| PATCH | `/notifications/read-all` | Any | Mark all as read |
| DELETE | `/notifications/:id` | owner | Delete |

## Check-ins: `/checkins`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/checkins/mine?status` | adopter | My check-ins (by due date) |
| GET | `/checkins/shelter?status&animal` | shelter | Check-ins for my adopted animals |
| GET | `/checkins/application/:applicationId` | adopter / shelter of it | History for one adoption |
| GET | `/checkins/:id` | adopter / shelter of it | One check-in |
| POST | `/checkins/:id/complete` | adopter (owner) | multipart: `notes (required), weightKg, mood ('happy'\|'okay'\|'unwell'), vetVisit, vetNotes, photo` |
| POST | `/checkins/application/:applicationId/updates` | adopter (owner) | Extra health update at any time (same fields) |

## Reviews: `/reviews`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/reviews/shelter/:shelterId` | Public | Reviews for a shelter (paginated) |
| GET | `/reviews/mine` | adopter | My reviews |
| POST | `/reviews` | adopter | `{ applicationId, rating (1-5), comment? }`. Only for your own **completed** application, once per adoption. |
| PATCH | `/reviews/:id` | adopter (author) | Edit rating/comment |
| DELETE | `/reviews/:id` | author / admin | Delete (admin moderation). Rating is recalculated. |

## Shelters: `/shelters`

`:id` is the shelter **user id** (animals and applications reference the user).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/shelters?q&verified&type&city&page` | Public | Shelter profiles with `availableCount` |
| GET | `/shelters/nearby?lat&lng&radiusKm&verified` | Public | Sorted by distance using `$near` |
| GET | `/shelters/me/dashboard` | shelter | Counts by status, rating, recent applications, upcoming check-ins, latest reviews |
| GET | `/shelters/:id` | Public | Profile, stats, current animals, adoption history, reviews |

## Admin: `/admin` (admin only)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Users by role, shelters verified/pending, animals by status, adoptions, applications, check-ins, reviews |
| GET | `/admin/activity` | Recent activity feed (sign-ups, applications, adoptions, reviews) |
| GET | `/admin/shelters?status=pending\|verified\|all&q` | Shelter profiles for verification |
| PATCH | `/admin/shelters/:id/verify` | `{ verified: true\|false, note? }`. Notifies the shelter. |
| GET | `/admin/users?role&q` | User list |
| GET | `/admin/animals?active=true\|false&q` | All listings for moderation |
| POST | `/admin/run-reminders` | Runs the check-in reminder job now → `{ reminded, missed, ranAt }` |

## Static files

`GET /uploads/<file>` serves uploaded images (e.g. `http://localhost:5001/uploads/seed-cat-21.jpg`).

---

## Socket.io events

Connect to `http://localhost:5001` with `io(url, { auth: { token } })`. Connections without a valid JWT are refused.

| Direction | Event | Payload | Description |
|---|---|---|---|
| client → server | `conversation:join` | `conversationId`, ack | Join a chat room (participants only) |
| client → server | `conversation:leave` | `conversationId` | Leave the room |
| client → server | `message:send` | `{ conversationId, text }`, ack `{ ok, message \| error }` | Save and deliver a message |
| client → server | `conversation:read` | `conversationId`, ack | Mark messages read |
| client → server | `typing` | `{ conversationId, isTyping }` | Typing indicator |
| server → client | `message:new` | `{ message, conversationId, unread }` | New message for you |
| server → client | `conversation:read` | `{ conversationId, readerId }` | Read receipt |
| server → client | `typing` | `{ conversationId, userId, name, isTyping }` | Someone is typing |
| server → client | `presence` | `{ userId, online }` | A contact came online/offline |
| server → client | `notification:new` | Notification document | New bell notification |
| server → client | `notification:read` | `{ id }` or `{ all: true }` | Notifications marked read |
