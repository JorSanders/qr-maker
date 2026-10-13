# QR maker

Client-side QR code generator: plain HTML, CSS and ES modules, no build step, no
backend. Content presets for plain text or URL, Wi-Fi, email, SMS and vCard. Four modes:

- **Minimal**: lowest QR version that fits at level L, plain squares or round dots.
- **Logo**: level H, a box in the centre (following the logo's aspect ratio) cleared
  for an uploaded logo. Two sizes: the widest logo the smallest code still decodes
  with, or one version up for a bigger logo. Both are found by binary search with
  jsQR and keep a 2% margin.
- **Pixel art**: spells text like "NOS" in the modules with a 5×7 pixel font. The
  free padding bits are set to the letters, and the remaining mismatches are flipped
  within the Reed-Solomon budget of each block. Bigger versions leave more room.
- **Picture**: dots over an uploaded image, finder, timing and alignment patterns
  kept solid.

Every render is decoded again in the browser with jsQR and shows whether it scans.
Download as SVG, PNG or WebP.

## Code

- `src/codec.js`: byte-mode QR encoder for all four error-correction levels. It
  keeps track of which module carries which codeword bit, which pixel art needs.
- `src/qr.js`, `src/render.js`: matrix building, the four renderers and SVG output.
- `src/pixel.js`, `src/presets.js`, `src/image.js`, `src/main.js`: pixel font and
  stamping, payload formats, image loading and the UI.
- `vendor/jsQR.js`: the only dependency, vendored as-is (Apache 2.0).
- `fonts/`: Montserrat (SIL Open Font License), shared with [jor.dev](https://jor.dev).

## Run

Serve the folder with any static server, for example:

```bash
python3 -m http.server 5173
```

Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`, which uploads
the repository as-is (set Settings > Pages > Source to "GitHub Actions").
