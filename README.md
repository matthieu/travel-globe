# Travel Globe

Personal travel log visualised on an interactive 3D globe built with React, Vite, Tailwind CSS, and `react-globe.gl`.

## Quick start

```bash
npm install
npm run dev
```

The app is available at http://localhost:5173.

To build the static site:

```bash
npm run build
```

The production bundle is emitted to `dist/` and is ready to be published on GitHub Pages.

## Update your trips

The sample trip data lives in `src/components/travel-globe.jsx`. Update the `TRIPS` array with your own locations. Each item supports:

```js
{
  label: "City, Country", // Required: place name
  lat: 0,                  // Required: latitude (-90 → 90)
  lng: 0,                  // Required: longitude (-180 → 180)
  date: "YYYY-MM-DD",      // Required: ISO date string
  comments: "Notes",       // Optional: appears when the trip is selected
  color: "#22C55E"         // Optional: pin + label color
}
```

## Deploy to GitHub Pages

1. Push the repository to GitHub and enable **Pages → Build and Deployment → GitHub Actions**.
2. Merge to `main` (or trigger the workflow manually). The workflow at `.github/workflows/deploy.yml` builds the Vite site and publishes the `dist/` output using the official Pages actions.
3. The Vite config automatically detects the repository name from the GitHub Action (`GITHUB_REPOSITORY`) and sets the correct `base` path so that assets resolve on GitHub Pages.

If you publish from a branch other than `main`, update the workflow trigger accordingly.

## Stack

- React 19 + Vite 7
- Tailwind CSS 4 for styling, with small UI primitives in `src/components/ui/`
- `react-globe.gl` + `three` for the interactive Earth
- GitHub Actions for zero-config Pages deployments
