# Timber Mart Management System

Workforce and attendance management for Timber Mart
(Node.js · Express · EJS · MongoDB · Bootstrap 5).

## Run

1. Start MongoDB locally (`mongodb://127.0.0.1:27017/timber_mart`).
2. Install packages: `npm install`
3. Create your admin account (only needed once):

   ```
   npm run create-admin -- "Admin Name" admin@timbermart.com yourPassword 9876543210
   ```

   Running it again with the same email resets that admin's password.
4. Start the app: `npm run dev` (or `npm start`) and open http://localhost:3000

Workers create their own accounts on **Create Account**, or the admin adds
them from **Manage Workers → Add Worker**. Worker IDs (TM-001, TM-002, …)
are generated automatically.

## Attendance rules

Set in `backend/utils/attendanceUtils.js`:

- Check-in after **9:15 AM** is marked **Late**.
- **Sunday** is the weekly off day (`WEEKLY_OFF_DAYS`). On working days, a
  worker with no check-in is counted **Absent** (from their joining date up to
  yesterday; today counts once the admin views the day).

## API

| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register · /login · /logout | public |
| GET / PUT | /api/auth/me · /profile · /password | logged in |
| GET | /api/attendance/today · /history?month=YYYY-MM&status= | worker |
| POST | /api/attendance/check-in · /check-out | worker |
| GET | /api/admin/dashboard | admin |
| GET / POST | /api/admin/workers | admin |
| GET / PUT | /api/admin/workers/:id (Mongo ID or TM-001) | admin |
| PATCH | /api/admin/workers/:id/status `{ "status": "inactive" }` | admin |
| GET | /api/admin/attendance?date=YYYY-MM-DD | admin |
