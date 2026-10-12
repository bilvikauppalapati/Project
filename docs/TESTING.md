# PawShare Testing

Tested on a MacBook Air M2 (macOS, Apple Silicon), Node.js 24, MongoDB 9.0, Google Chrome. Every run starts from `npm run seed` and uses the three fixed demo accounts (password `Test@12345`).

## Summary (13 October 2026)

| Suite | What it covers | Result |
|---|---|---|
| Automated API tests | Every REST endpoint and socket.io event, all 7 features, roles, validation and error cases | **80 / 80 passed** |
| Automated browser tests | Real Chrome driving the React app as guest, adopter, caregiver and admin, including live notifications and chat across two browsers | **33 / 33 passed**, 0 browser console errors |
| Lint | ESLint (no-undef, no-unused-vars, JSX rules) on client and server | 0 problems |
| Production build | `npm run build` | Builds successfully |

## Manual test checklist

Use this list during a demo or after changing code. Expected results were confirmed by the automated suites below.

| # | Feature | Steps | Expected result |
|---|---|---|---|
| 1 | Login | Log in as each fixed account | Each lands on its own dashboard (admin / adopter / caregiver) |
| 2 | Password rule | Register with `password1` | “Password must be at least 8 characters and include a letter, a number and a special character” |
| 3 | Roles | As adopter, open `/animals/new` | Redirected to the dashboard; API returns 403 |
| 4 | F1 Create listing | Caregiver → List an animal, add 2 photos, tags, vaccination with a date | Listing page shows gallery, tags and health records; location defaults to the caregiver's |
| 5 | F1 Limits | Try 6 photos or a GIF | “Too many photos (max 5)” / “Only JPG, PNG or WEBP images are allowed” |
| 6 | F1 Soft delete | Remove a listing without open applications | Hidden from search, still visible to the owner and admin |
| 7 | F2 Filters | Browse → species Cat, size Small, tag good-with-cats | Only matching cards; URL contains the filters |
| 8 | F2 Distance | Browse → Near me → Within 5 km | Cards show km, sorted nearest first |
| 9 | Matching | As user@gmail.com, browse | Cards show “% match” with reasons; Coco and Pepper rank at the top, Bruno lower (large dog, apartment) |
| 10 | F3 Apply | Adopter → Coco → Apply to foster (with duration) | Timeline page shows “Submitted”; caregiver gets a live notification |
| 11 | F3 Approve | Caregiver → Pepper application → Start review → Approve with note | Adopter sees a live toast; Pepper becomes “Pending” |
| 12 | F3 Complete | Caregiver → Mark as completed | Pepper becomes “Adopted”, other applicants auto-rejected, 3 check-ins created |
| 13 | F3 Withdraw | Adopter withdraws a submitted application | Status “Withdrawn” |
| 14 | F4 Chat | Open the same conversation as adopter and caregiver in two browsers | Messages appear instantly, “typing…” shows, “Seen” appears |
| 15 | F4 Unread | Send a message while the other user is elsewhere | Message badge and bell count increase |
| 16 | F5 Check-in | Adopter → dashboard → Luna 1-month check-in → submit notes, weight, mood, photo | Status “Completed”; caregiver sees it under Check-ins |
| 17 | F5 Cron | Admin → Run reminders now | Toast shows reminders sent / missed counts; emails printed in the server console |
| 18 | F6 Profile | Open /shelters → Demo Caregiver | Verified badge, 4.5★, reviews, adoption history, current animals, map pin |
| 19 | F6 Review | Adopter → completed application → rate 5★ | Rating and review count update on the profile |
| 20 | F6 Verify | Admin → Shelter verification → Verify Kukatpally Paws Collective | Badge appears; shelter notified |
| 21 | F7 Map | Open /map (allow location) | Shelter and animal markers with popups; radius circle; list sorted by distance |
| 22 | F7 Fallback | Open /map with location blocked | “Showing Hyderabad” message, map centred on Hyderabad |
| 23 | Notifications | Click the bell | Latest notifications, unread dot, “Mark all read” |
| 24 | Responsive | Resize to phone width | No horizontal scrolling; menu collapses into the hamburger |
| 25 | 404 | Visit /does-not-exist | Friendly 404 page |

## Automated API test results

#### Auth & roles

| Check | Result |
|---|---|
| admin@gmail.com logs in as admin | ✅ Pass |
| user@gmail.com logs in (case-insensitive email) as adopter | ✅ Pass |
| care@gmail.com logs in as verified individual caregiver | ✅ Pass |
| user preferences seeded | ✅ Pass |
| password never returned | ✅ Pass |
| weak password rejected (needs special char) | ✅ Pass |
| short password rejected | ✅ Pass |
| shelter registration creates ShelterProfile | ✅ Pass |
| duplicate email -> 409 | ✅ Pass |
| cannot self-register as admin | ✅ Pass |
| adopter cannot create animals (role middleware) | ✅ Pass |
| shelter cannot open admin API | ✅ Pass |
| no token -> 401 | ✅ Pass |

#### F1 Animal listings

| Check | Result |
|---|---|
| create with 2 photos, tags, health records | ✅ Pass |
| location defaults to caregiver profile location | ✅ Pass |
| 6 photos rejected (max 5) | ✅ Pass |
| GIF rejected (jpg/png/webp only) | ✅ Pass |
| edit status + partial health keeps vaccinations | ✅ Pass |
| cannot edit another shelter's animal | ✅ Pass |
| delete is a soft delete | ✅ Pass |
| removed listing hidden from search | ✅ Pass |
| cannot remove animal with open applications | ✅ Pass |
| detail: shelter profile, verified, rating, health, match | ✅ Pass |
| caregiver owns animals in every status | ✅ Pass |
| admin can reactivate/deactivate a listing | ✅ Pass |

#### F2 Search & filters

| Check | Result |
|---|---|
| species filter | ✅ Pass |
| breed text search | ✅ Pass |
| age range (years) | ✅ Pass |
| size + gender | ✅ Pass |
| listing type foster includes "both" | ✅ Pass |
| temperament tags ($all) | ✅ Pass |
| vaccinated + sterilised | ✅ Pass |
| $geoNear within 5 km of Gachibowli, nearest first | ✅ Pass |
| pagination | ✅ Pass |
| verified-only filter hides unverified shelter | ✅ Pass |
| cards carry shelter verification for labelling | ✅ Pass |

#### Matching

| Check | Result |
|---|---|
| best-match sort is descending | ✅ Pass |
| cards include match reasons | ✅ Pass |
| large high-energy dog ranks low for apartment user | ✅ Pass |
| breakdown sums to score | ✅ Pass |
| guests get no match score | ✅ Pass |

#### F3 Applications

| Check | Result |
|---|---|
| user has applications in many statuses | ✅ Pass |
| Pepper application is submitted (ready for live approval) | ✅ Pass |
| caregiver sees incoming submitted applications | ✅ Pass |
| duplicate active application blocked | ✅ Pass |
| foster needs a duration | ✅ Pass |
| foster application with duration | ✅ Pass |
| adopter withdraws before decision | ✅ Pass |
| adopter cannot approve | ✅ Pass |
| submitted -> under_review | ✅ Pass |
| under_review -> approved, animal pending | ✅ Pass |
| statusHistory has changedBy names | ✅ Pass |
| approved -> completed, animal adopted, adoptionCount +1 | ✅ Pass |
| notification created for adopter | ✅ Pass |

#### F4 Messaging

| Check | Result |
|---|---|
| socket rejects bad JWT | ✅ Pass |
| seeded conversation with caregiver, unread count | ✅ Pass |
| message delivered in real time | ✅ Pass |
| no notification while recipient has the chat open | ✅ Pass |
| notification when recipient is not in the chat | ✅ Pass |
| typing indicator | ✅ Pass |
| read receipt + unread reset | ✅ Pass |
| message history stored | ✅ Pass |
| start conversation from an animal (reuses pair) | ✅ Pass |

#### F5 Check-ins

| Check | Result |
|---|---|
| Luna: 1 week completed with health update, 1 month due | ✅ Pass |
| completing Pepper auto-scheduled 3 check-ins | ✅ Pass |
| adopter logs health update with photo + mood | ✅ Pass |
| shelter cannot complete adopter check-in | ✅ Pass |
| caregiver sees check-in history | ✅ Pass |
| admin can run the reminder job on demand | ✅ Pass |

#### F6 Profiles, verification, reviews

| Check | Result |
|---|---|
| profile: verified, rating, reviews, history, animals | ✅ Pass |
| one review per adoption | ✅ Pass |
| review after completed adoption updates rating | ✅ Pass |
| admin sees shelters awaiting verification | ✅ Pass |
| admin verifies a shelter | ✅ Pass |
| admin recent activity feed | ✅ Pass |
| admin overview counts | ✅ Pass |
| caregiver dashboard summary | ✅ Pass |

#### F7 Map

| Check | Result |
|---|---|
| $near shelters sorted by distance | ✅ Pass |
| $geoWithin animal markers with species filter | ✅ Pass |
| small radius only returns close animals | ✅ Pass |

## Automated browser test results

#### Public pages

| Check | Result |
|---|---|
| home: hero + featured animals + how it works | ✅ Pass |
| home has no horizontal scroll at phone width | ✅ Pass |
| search page applies URL filters | ✅ Pass |
| unverified shelter labelled on cards | ✅ Pass |
| shelters list with verified badges | ✅ Pass |
| caregiver profile: verified, rating, history, reviews | ✅ Pass |
| 404 page | ✅ Pass |
| protected route redirects guests to login | ✅ Pass |

#### Adopter (user@gmail.com)

| Check | Result |
|---|---|
| demo box + login lands on adopter dashboard | ✅ Pass |
| dashboard shows applications, favourites, due check-in | ✅ Pass |
| browse sorted by best match with match % | ✅ Pass |
| animal detail: gallery, health, tags, shelter card, match breakdown | ✅ Pass |
| favourite toggle works | ✅ Pass |
| foster application form asks for duration | ✅ Pass |
| application submitted -> status timeline page | ✅ Pass |

#### Caregiver (care@gmail.com) + live updates

| Check | Result |
|---|---|
| caregiver lands on shelter dashboard with stats | ✅ Pass |
| listings tab shows status counts | ✅ Pass |
| caregiver approves application in UI | ✅ Pass |
| adopter receives live toast notification | ✅ Pass |
| bell dropdown lists notifications | ✅ Pass |

#### Real-time chat

| Check | Result |
|---|---|
| typing indicator shows for adopter | ✅ Pass |
| message appears instantly for adopter | ✅ Pass |

#### Check-in

| Check | Result |
|---|---|
| adopter completes due check-in | ✅ Pass |
| caregiver sees check-in history | ✅ Pass |

#### Map

| Check | Result |
|---|---|
| map centres on browser location with shelter + animal markers | ✅ Pass |
| map falls back to Hyderabad without location | ✅ Pass |

#### Admin (admin@gmail.com)

| Check | Result |
|---|---|
| admin lands on admin dashboard with counts + activity | ✅ Pass |
| pending shelter listed | ✅ Pass |
| admin verifies shelter | ✅ Pass |
| admin runs reminder job from UI | ✅ Pass |
| admin listings moderation tab | ✅ Pass |

#### Register & profile

| Check | Result |
|---|---|
| weak password blocked with rule message | ✅ Pass |
| new adopter lands on preferences page | ✅ Pass |

## Bugs found and fixed during testing

| Bug | Fix |
|---|---|
| Tailwind 4 refused `@apply` of custom classes (build failed) | Converted the custom button/card classes to Tailwind 4 `@utility` rules |
| App crashed on load (“destroy is not a function”) | A `useEffect` returned the result of `window.scrollTo`; changed to a block body |
| Future dates showed “just now” | `timeAgo` now uses the absolute difference |
| Message badge counted messages in the chat you were reading | Unread count ignores the conversation currently open |
| New message notifications were sent even while the recipient was in the chat | Server checks the socket room before notifying |
| Seed could not drop the database (app user has read/write only) | Seed drops each collection instead |
| Distances on the detail page differed from search by 0.1 km | Haversine uses MongoDB's Earth radius (6378.1 km) |
| Mongoose 9 deprecation warning for `new: true` | Switched to `returnDocument: 'after'` |
