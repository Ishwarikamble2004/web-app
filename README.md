# Attendance System — Render Deployment

This repo runs a Node/Express app backed by MongoDB.

Quick steps to deploy on Render:

1. Create a new **Web Service** on Render.
   - Environment: `Node`
   - Build Command: (leave blank) or `npm install`
   - Start Command: `npm start`
   - Branch: your repo branch

2. Set environment variables on Render:
   - `MONGODB_URI` — the MongoDB connection string (required).
   - `NODE_ENV=production` (optional).

3. Port: Render provides `PORT` automatically; the app uses `process.env.PORT`.

Notes:
- The app serves static files from the repository root.
- The app will seed demo data on startup (unless `NODE_ENV=test`).
- If you want to use a managed MongoDB on Render, create a Managed Database and copy its connection string to `MONGODB_URI`.

Local testing:

```bash
npm install
# Start local MongoDB or set MONGODB_URI to a reachable MongoDB
npm start
```
