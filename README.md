# QR maker

Client-side QR code generator: plain HTML, CSS and ES modules, no build step, no
backend. Content presets for plain text or URL, Wi-Fi, email, SMS and vCard. Four modes:

- **Minimal**: lowest QR version that fits at level L. Round dots are an option in
  every mode, the finder patterns become rounded frames.
- **Logo**: level H, a box in the centre (following the logo's aspect ratio) cleared
  for an uploaded logo, the jor.dev wordmark until you pick one. Two sizes: the widest logo the smallest code still decodes
  with, or one version up for a bigger logo (the default). Both are found by binary
  search that must decode with the box filled light and filled dark, so a dark logo
  is as safe as a light one, and keep a 2% margin.
- **Pixel art**: spells text like "NOS" in the modules with a 5×7 pixel font. Typing
  picks the smallest version where the whole text fits, the size select overrides it. The
  free padding bits are set to the letters, and the remaining mismatches are flipped
  within the Reed-Solomon budget of each block. Bigger versions leave more room.
- **Picture**: dots over an uploaded image (the jor.dev mark until you pick one),
  finder, timing and alignment patterns kept solid. Dot size starts at 30%. Drag the
  preview to move the picture, use the size slider to scale it (100% fills the code,
  the default mark starts at 45% so it sits between the finder patterns) and reset
  both with a button.

Every render is decoded again in the browser with jsQR and shows whether it scans.
Download as SVG, PNG or WebP.

## Code

- `src/codec.js`: byte-mode QR encoder for all four error-correction levels. It
  keeps track of which module carries which codeword bit, which pixel art needs.
- `src/qr.js`, `src/render.js`: matrix building, the four renderers and SVG output.
- `src/pixel.js`, `src/presets.js`, `src/image.js`, `src/main.js`: pixel font and
  stamping, payload formats, image loading and the UI.
- `vendor/jsQR.js`: the only dependency, vendored as-is (Apache 2.0).
- `brand/`: the jor.dev tokens, base styles, Montserrat and Space Mono (SIL Open Font License) and the logo, copied in from [jor.dev](https://jor.dev).

## Run

Serve the folder with any static server, for example:

```bash
python3 -m http.server 5173
```

Hosted on GitHub Pages straight from the `main` branch, root folder, no workflow and no
build step (Settings > Pages > Source: Deploy from a branch, `main`, `/`). `CNAME` holds
`qr.jor.dev` and `.nojekyll` disables Jekyll.
