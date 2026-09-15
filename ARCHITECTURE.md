# Architecture

## 1. Overview

The app is a **single-file client** (`index.html`) — all markup, CSS, and JavaScript live in one document, with Firebase (Auth + Firestore) as the only backend. There is no server code: all business logic (role checks, edit windows, roster parsing) runs client-side, and is **re-enforced in `firestore.rules`** so it can't be bypassed by a direct API call.

```
┌────────────────────────────┐        ┌───────────────────────────┐
│         index.html          │        │        Firebase           │
│  (screens, state, logic)    │◄──────►│  Auth (email/password)    │
│  - SheetJS (roster import)  │        │  Firestore (data + rules) │
│  - jsPDF (report export)    │        └───────────────────────────┘
│  - Service worker (offline) │
└──────────────────────────────┘
```

## 2. Screen map

Screens are plain `<div class="screen">` elements shown/hidden by adding an `active` class (no router/framework):

`login` → `home` → `dashboard` (professor) / `principal` (admin)
├─ `subject` — per-class Mark / Students / Reports tabs
├─ `add-class`, `catalog`
├─ `master-roster` — bulk roster upload
├─ `manage-hods`, `manage-batches`, `dept-dashboard`, `batch-dashboard`
├─ `notices`, `feedback-form`, `feedback-inbox`, `feedback-verify`
├─ `public-view` — student self-service, no login
├─ `audit-log`, `settings`, `privacy-policy`, `terms`

## 3. Roles & permission model

Enforced identically in the UI and in `firestore.rules`:

| Role | Where it's stored | Scope |
|---|---|---|
| **Creator** | `creators/{uid}` (Console-only) | Superadmin — everything a Principal can do, plus editing any class directly |
| **Principal / Admin** | `admins/{uid}` (Console-only) | Institution-wide read, manages professors, departments, courses |
| **Department Incharge (HoD)** | `hods/{uid}` → `{ departmentId }` | Master rosters + Batch Incharge assignment for **their** department only |
| **Batch Incharge** | `batchIncharges/{uid}` → `{ departmentId, ... }` | Read-only aggregate dashboard for **their** batch; assigned by their Department Incharge |
| **Professor** | `professors/{uid}` | Owns/collaborates on `classes`; marks attendance, manages own students |
| **Student** | no account | `publicView` (roll number + last-5 phone digits) and `feedback` (roll-number-gated via `rollRegistry`), both write-once / non-enumerable |

Role hierarchy (each level's powers are a superset of the one below it, scoped narrower geographically as you go down):

```
Creator
  └─ Principal (Admin)
       └─ Department Incharge (per department)
            └─ Batch Incharge (per batch, read-only)
                 └─ Professor (per class, owner or collaborator)
                      └─ Student (no account — token-gated public reads/writes)
```

## 4. Data model (Firestore collections)

| Collection | Purpose |
|---|---|
| `admins/{uid}`, `creators/{uid}` | Role flags, Console-managed only |
| `professors/{uid}` | Full profile (name, phone, department) |
| `professorNames/{uid}` | Lightweight public name directory (for pickers) |
| `departments/{id}`, `courses/{id}` | Institution catalog |
| `hods/{uid}` | Department Incharge assignment |
| `batchIncharges/{uid}` | Batch Incharge assignment, scoped by `departmentId` |
| `masterRosters/{dept_course_section}` | Bulk-uploaded student lists, shared read across professors |
| `classes/{classId}` | A professor's subject/section; `professorId` + `collaboratorIds[]` |
| `classes/{classId}/students/{id}` | Roster for that class |
| `classes/{classId}/attendance_records/{YYYY-MM-DD}` | One doc per session/date; supports multiple sessions/day via `submittedBy` |
| `classes/{classId}/syllabus/{topicId}` | Topics covered log |
| `deletedClassBackups` | Snapshot kept when a class is deleted |
| `publicView/{rollNumber_phoneDigits}` | Student self-lookup, `get`-only (never listable) |
| `rollRegistry/{docId}` | Roll-number existence check for feedback gating |
| `feedback/{id}`, `feedbackThrottle/{id}` | Anonymous feedback, 1/student/day |
| `announcements/{id}` | Notice board |
| `institutionStats`, `auditLog` | Principal-level aggregates and accountability trail |

## 5. Key design decisions

- **7-day attendance edit window** (`withinAttendanceEditWindow` in `firestore.rules`, mirrored client-side): a record can be created any time (e.g. to restore a deleted class from backup) but only *edited or deleted* within 7 days of its date — after that, only Principal/Creator can touch it.
- **Per-session attendance records**: rather than one doc per class/date, each professor's submission for a date is its own session doc, so a collaborator marking a different period on the same day never overwrites another professor's entry.
- **No student accounts**: `publicView` and `feedback` use possession of a shared secret (roll number + phone digits) or a roll-number allowlist (`rollRegistry`) instead of Firebase Auth, keeping student-facing flows frictionless while still bounding what an anonymous caller can read (`get`-only, `list: false` everywhere sensitive).
- **Offline-first**: `db.enablePersistence({ synchronizeTabs: true })` caches all reads in IndexedDB and queues simple writes while offline; Firestore *transactions* (used for attendance submission) are the one write path that isn't queued offline, so that path has its own explicit retry/freeze handling.
- **Service worker update flow**: because the app never does a full page navigation (screens are shown/hidden, not routed), the browser's normal ~24h update check is unreliable — the app explicitly calls `registration.update()` on load and again whenever the tab regains focus, and only reloads when the professor chooses (to avoid wiping an in-progress attendance form).
- **Service worker caching strategy** (`sw.js`): network-first for the app shell and CDN libraries (fresh code when online, falling back to cache when offline), with the cache versioned via `CACHE_NAME` (bumped on each deploy so `activate` can purge the old one). Only genuinely successful (`response.ok`) responses are cached, so a transient 404/500 mid-deploy can't get stuck as "the app". Firestore/Auth/Identity Toolkit requests are explicitly passed through untouched, since Firebase's own offline persistence already handles that traffic.

## 6. Known limitations / next steps

- Semester rollover (carrying students forward to a new semester/section without re-uploading) and archiving of past-semester data are not yet implemented.
- `firebaseConfig` is currently hardcoded in `index.html` rather than injected via a build step — acceptable for a no-build static PWA, but a public fork should swap in its own Firebase project (see README).
