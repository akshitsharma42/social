# Deployment

## Backend (Render)

- Create a new Web Service from the `server` folder.
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Node version: 20 or later
- Root directory: `server`
- Health check path: `/`

### Render environment variables
- `MONGODB_URI`
- `JWT_SECRET`
- `ZERNIO_API_KEY`
- `CLIENT_URL`
- `PORT` is optional; Render usually injects it automatically.

### Recommended `CLIENT_URL`
Use your final Vercel URL, for example:
- `https://social-scheduler.vercel.app`

## Frontend (Vercel)

- Import the `client` folder as a new project.
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `client`
- Node version: 20 or later

### Vercel environment variables
- `VITE_API_BASE_URL=https://your-render-service.onrender.com`

## Local development

### server/.env
- `PORT=3000`
- `MONGODB_URI=...`
- `JWT_SECRET=...`
- `ZERNIO_API_KEY=...`
- `CLIENT_URL=http://localhost:5173`

### client/.env
- `VITE_API_BASE_URL=http://localhost:3000`
