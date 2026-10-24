# QR maker

Client-side QR code generator: plain HTML, CSS and ES modules, no build step, no
backend. Content presets for plain text or URL, Wi-Fi, email, SMS and vCard. Four modes:

- **Minimal**: lowest QR version that fits at level L. Round dots are an option in
  every mode, the finder patterns become rounded frames.
- **Logo**: a box in the centre (following the logo's aspect ratio) cleared for an
  uploaded logo, the jor.dev wordmark until you pick one. Three sizes, all worked out at once
  so the buttons can show the real percentage: small is the smallest code (version first,
  then error correction level) where a logo 20% wide still scans, large is the biggest
  logo found at the highest level over the next four versions, and medium is the smallest
  code where a logo halfway between the two scans. The percentage is the logo's longer
  side, so a tall logo is sized by its height. Square logos top out around 36%, wide ones
  reach 65% or more, because a wide logo covers less of the code. Every size is checked
  with a real render and a binary search that must decode with the box filled light and filled dark, so a dark logo
  is as safe as a light one, and keep a 2% margin.
- **Pixel art**: spells text like "NOS" in the modules with a 5×7 pixel font. Typing
  picks the smallest version, and in it the lowest level, where every letter module
  comes out right and it still scans. The
  free padding bits are set to the letters, and the remaining mismatches are flipped
  within the Reed-Solomon budget of each block. Bigger versions leave more room.
- **Picture**: dots over an uploaded image (the jor.dev mark until you pick one),
  finder, timing and alignment patterns kept solid. Dot size starts at 30%. Drag the
  preview to move the picture, use the size slider to scale it (100% fills the code,
  the default mark starts at 45% so it sits between the finder patterns) and reset
  both with a button. The code is the smallest version and lowest level where the
  picture still scans (moving or scaling the picture does not search again, the badge
  tells you if it stops scanning).

**Advanced** settings work in every mode: pick the error correction level, the version,
the mask and the padding yourself. Off, every mode picks the smallest version and then the
lowest level where it still works (for minimal that is always level L), the mask with the
lowest penalty and the spec's pad bytes. Pixel art picks the mask that leaves the fewest
letter modules wrong and pads with zeros. A fixed level or version stays fixed and only
the other one is searched. In logo mode a fixed version replaces the logo size choice.

Text is always stored as UTF-8 bytes. The spec says byte mode means Latin-1 unless an ECI
segment says otherwise, so advanced has an option to add the UTF-8 ECI marker (12 extra
bits). It is off by default: most scanners guess UTF-8 just fine, and some older ones choke
on ECI. jsQR reads both, I have not tested phone scanners with ECI.

**Learn** breaks down whatever code you just made. The preview colours every part
(finders, timing, alignment, format and version information, data, error correction,
remainder bits), can number the bits in the order they are read (with every 8-bit
codeword outlined), draw the zigzag placement path, show the code before masking and mark
the bits the mask flipped. Pixel art marks the modules it flipped on purpose to draw your
text, logo mode marks what the logo hides. Hover a module to see what it is. The breakdown
under the code shows your text as bits, the blocks with their error correction codewords, the penalty of
every mask and the format and version bits. Click modules (or whole codewords) to flip
them and watch when error correction gives up. Downloads stay the real code, not the
diagram.

After the message, minimal, logo and picture fill the code with the pad bytes 11101100
and 00010001 taking turns, like the spec says. Pixel art fills with zeros by default: its
letters take most of those bits anyway, and zeros needed a few fewer flips in my tests.
Scanners stop reading at the end marker, so both work.

Every render is decoded again in the browser with jsQR and shows whether it scans.
Download as SVG, PNG or WebP. The quiet zone around the code is two modules, half of
what the spec recommends, which is the smallest border that still reads back in every mode.

## Code

- `src/codec.js`: byte-mode QR encoder for all four error-correction levels. It
  keeps track of which module carries which codeword bit, which pixel art needs.
- `src/qr.js`, `src/render.js`: matrix building, the four renderers and SVG output.
- `src/anatomy.js`, `src/learn.js`: the step by step breakdown of a code and the learn
  view.
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
