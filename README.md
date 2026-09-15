# AttendEase — College Attendance PWA

A single-file, installable Progressive Web App for managing student attendance at **Govt. V.Y.T. P.G. Autonomous College, Durg** — built to replace paper/spreadsheet attendance registers with a centralized, role-based system that scales to 700–800 students per subject.

Built for **My Bharat's "Hack For Social"** (theme: *Education & Skill Development*).

## ✨ Features

- **Centralized master rosters** — a Department Incharge (HoD) uploads a bulk student list once (Excel/CSV via SheetJS), instead of every professor maintaining their own.
- **Role-based access**
  - **Creator** (superadmin) — full edit access everywhere.
  - **Principal / Admin** — institution-wide read access, professor management.
  - **Department Incharge (HoD)** — manages one department's master rosters and Batch Incharge assignments.
  - **Batch Incharge** — read-only aggregate attendance dashboard for their batch.
  - **Professor** — takes attendance for their own classes; can share a class with collaborator professors (co-teaching).
- **Hierarchical monitoring** — Department → Course → Batch → Section, with rollup dashboards at each level.
- **Per-session attendance** — multiple professors can each record their own period/session for the same class on the same date without overwriting one another.
- **7-day edit window** — attendance records can be corrected for 7 days after the date, enforced both client-side and in Firestore Security Rules.
- **Public "Check Attendance"** — students can look up their own attendance with no account, using roll number + last 5 digits of a registered phone number.
- **Anonymous feedback inbox** — students can submit feedback/complaints with no identifying information stored.
- **College notice board** — announcements visible to signed-in staff and signed-out visitors alike.
- **Reports** — printable/downloadable monthly or custom-range attendance registers as PDF (jsPDF + autoTable) or Excel.
- **Offline-first PWA** — installable, works offline via Firestore's offline persistence and a service worker, with an in-app "update available" banner.
- **Audit log** for principal/creator-level accountability.

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| App shell | Single `index.html` (no build step / framework) |
| Auth | Firebase Authentication (email/password), compat SDK v10.12.2 |
| Database | Cloud Firestore (offline persistence enabled) |
| Spreadsheet import/export | SheetJS (`xlsx`) |
| PDF export | jsPDF + jspdf-autotable |
| PWA | Web App Manifest + Service Worker (`/sw.js`) |
| Hosting | Any static host (Firebase Hosting, Netlify, GitHub Pages, etc.) |

## 📂 Repository Structure

```
.
├── index.html          # entire app: markup, styles, and logic
├── firestore.rules     # Firestore Security Rules (roles & permissions)
├── manifest.json        # PWA manifest
├── sw.js                 # service worker (network-first caching, update flow)
├── college_logo.png
├── icon-32.png, icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png
├── ARCHITECTURE.md       # system design & data model
└── LICENSE
```

## ⚙️ Setup

### 1. Create a Firebase project
1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Enable **Firestore Database** (production mode).

### 2. Deploy the security rules
Copy `firestore.rules` into your project's Firestore Rules tab (or deploy via the Firebase CLI: `firebase deploy --only firestore:rules`).

### 3. Configure the app
`index.html` contains a `firebaseConfig` object (search for `FIREBASE CONFIGURATION`). Replace it with **your own project's config**, copied from Firebase Console → Project Settings → Your apps → SDK setup:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

> **Note on "environment variables":** this app is a single static HTML file with no build step, so there is no `.env` file — the Firebase web config above is the only per-deployment setting, and it is safe to keep client-side (Firebase's web config is not a secret; access is controlled entirely by `firestore.rules`, not by hiding this object). **Do not**, however, commit the *production* API key/project ID for a real institution's data into a public repo — use a separate demo/test Firebase project for the public version of this repository.

### 4. Bootstrap your first admin accounts
The `admins/{uid}`, `creators/{uid}`, and `hods/{uid}` collections can only be written from the Firebase Console (never from the app, by design — see `firestore.rules`). After creating your first professor account through the app:
1. Firestore Console → create collection `admins` → document ID = that user's Auth UID (this makes them **Principal**).
2. (Optional) create collection `creators` → same UID, for full superadmin access.
3. Use the Principal dashboard to assign **Department Incharges (HoDs)** and **Batch Incharges** from there on.

### 5. Run it
No build step — just serve `index.html` over HTTPS (required for service workers):
```bash
# any static file server works, e.g.
npx serve .
# or deploy to Firebase Hosting
firebase deploy --only hosting
```

## 🧪 Sample Data / Test Cases

- A sample master-roster spreadsheet (Student Name, Roll Number/UID, Course, Group/Combination, GEC selection) can be uploaded from the **Master Roster** screen — see `screen-master-roster` in `index.html`.
- Manual test flow: create a class as a Professor → mark attendance for a date → confirm it's editable for 7 days and locked afterward → view the same date as a collaborator to confirm no accidental overwrite → check the Principal dashboard rollup updates.

## 📜 License

MIT — see [`LICENSE`](./LICENSE).

## 🙋 Author

Anubhav Jha, B.Sc. (CBZ), Govt. V.Y.T. P.G. Autonomous College, Durg — submitted to My Bharat's Hack For Social (Education & Skill Development).
