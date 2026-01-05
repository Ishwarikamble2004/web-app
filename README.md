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

Local separate teacher/student servers (for phone scanning):

- Start the app locally (it will open two HTTP ports by default):

```bash
# teacher -> http://<your-computer-ip>:3000/teacher.html
# student -> http://<your-computer-ip>:3001/student.html
npm start
```

You can override ports with env vars:

```bash
PORT_TEACHER=4000 PORT_STUDENT=4001 npm start
```

Note: Render exposes a single public port; the separate-ports behavior only runs when `NODE_ENV` is not `production`.
