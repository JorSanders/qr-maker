# QR maker

Client-side QR code generator, no backend. Content presets for plain text or URL,
Wi-Fi, email, SMS and vCard. Five modes:

- **Minimal**: lowest QR version that fits, plain squares, selectable error correction.
- **Logo**: level H, a box in the centre (square or rectangular, following the logo's
  aspect ratio, capped at 20% of the area) cleared for an uploaded logo.
- **Art**: dots over an uploaded image, finder, timing and alignment patterns kept solid.
- **Dots**: round modules and softly rounded corner eyes.
- **Pixel**: paint directly on the code, or stamp text like "NOS" with a pixel font.
  `src/codec.ts` is a byte-mode level H encoder that knows which module carries which
  codeword bit. The free padding bits are set to the painting, and the remaining
  mismatches are flipped within the Reed-Solomon budget of each block. Bigger versions
  leave more room for the drawing.

Every render is decoded again in the browser with jsQR and shows whether it scans.
Download as SVG or PNG.

```bash
npm install
npm run dev
npm run build
```

Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`
(set Settings > Pages > Source to "GitHub Actions").
