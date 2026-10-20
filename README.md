# Setu Rakshak

Setu Rakshak is a bilingual structural-health monitoring dashboard for bridge operations. It combines simulated vibration, strain, tilt, scour, water-level, and visual-inspection signals into an IRC-style risk view.

## Highlights

- Live bridge digital twin with selectable sensor nodes
- Scenario simulation: healthy, overload, monsoon scour, and combined failure
- Vibration anomaly scoring, visual-defect assessment, and sensor-fusion risk scoring
- Alert log, time-series analytics, CSV export, and English/Hindi interface

## Run locally

Prerequisites: Node.js 20+ and Python 3.10+.

1. Start the API in one terminal:

   ```powershell
   cd backend
   python -m venv .venv
   .\\.venv\\Scripts\\Activate.ps1
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

2. Start the dashboard in another terminal:

   ```powershell
   npm install
   npm run dev
   ```

Open the URL printed by Vite (normally `http://localhost:5173`). The API health check is at `http://127.0.0.1:8000/api/health`.

## Deployment configuration

Set `VITE_API_BASE_URL` at frontend build time to point to a deployed API, for example `https://api.example.gov.in`. Restrict browser access by setting `FRONTEND_ORIGINS` on the API to a comma-separated list of permitted frontend origins.

## Quality checks

```powershell
npm run lint
npm run build
```
