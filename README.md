# QR maker

Client-side QR code generator, no backend. Content presets for plain text or URL,
Wi-Fi, email, SMS and vCard. Four modes:

- **Minimal**: lowest QR version that fits at level L, plain squares or round dots.
- **Logo**: level H, a box in the centre (square or rectangular, following the logo's
  aspect ratio) cleared for an uploaded logo. The version grows until the code
  still decodes with the logo cleared out.
- **Pixel art**: spells text like "NOS" in the modules with a 5×7 pixel font.
  `src/codec.ts` is a byte-mode level H encoder that knows which module carries which
  codeword bit. The free padding bits are set to the letters, and the remaining
  mismatches are flipped within the Reed-Solomon budget of each block. Bigger versions
  leave more room for the text.
- **Background picture**: dots over an uploaded image, finder, timing and alignment
  patterns kept solid.

Every render is decoded again in the browser with jsQR and shows whether it scans.
Download as SVG, PNG or WebP.

```bash
npm install
npm run dev
npm run build
```

Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`
(set Settings > Pages > Source to "GitHub Actions").
