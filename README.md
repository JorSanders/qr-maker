# QR maker

Client-side QR code generator, no backend. Four modes:

- **Minimal**: lowest QR version that fits, plain squares, selectable error correction.
- **Logo**: level H, centre cleared for an uploaded logo (capped at 20% of the area).
- **Art**: dots over an uploaded image, finder, timing and alignment patterns kept solid.
- **Dots**: round modules and softly rounded corner eyes.

Every render is decoded again in the browser with jsQR and shows whether it scans.
Download as SVG or PNG.

```bash
npm install
npm run dev
npm run build
```

Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`
(set Settings > Pages > Source to "GitHub Actions").
