# CLAUDE.md

<!-- Shared block, keep identical across projects. Source: conventions/CLAUDE.template.md -->

## Shared rules

- Focus on writing readable, maintainable and simple code. Prefer the boring solution.
- All variables should have self explanatory names. Don't use abbreviations unless a name would become way too long.
- Don't add comments unless absolutely needed to explain unexpected behaviour or code.
- Always handle every error case.
- Use conventional commits, lowercase `type: imperative summary`. Each commit adds exactly one feature or fixes exactly one bug.
- The information in README.md must always be up to date and follow the shared README structure: title, why, features, project specific sections, how to get or run it, then "Any issues?" and "Buy me a coffee".
- Write all text casually in first person, as me sharing something I made or found. Not a manual, not marketing copy. Be honest about what is untested or unknown.
- Never use em dashes. Rewrite the sentence, or use a comma, colon or parentheses instead.
- Titles and headings are sentence case: one capital at the start, never all caps, never title case. No `text-transform: uppercase` anywhere.
- Any images should be cleaned of their metadata before committing.
- Formatting follows `.editorconfig`: 2 spaces, LF, final newline. JavaScript uses double quotes and semicolons, like Prettier's defaults.
- Everything is Unlicense. Vendored libraries and fonts keep their own license file next to them.

## Static site rules

- Frameworkless and buildless: plain HTML, CSS and JavaScript ES modules. No bundler, transpiler, preprocessor, framework or TypeScript. The repository is what GitHub Pages serves, from `main`, root folder.
- Dev scripts with devDependencies are fine for generating data or assets. Commit their output. The site must work without running them.
- Runtime libraries are vendored in `vendor/` with their license. No npm runtime dependencies, no CDN script tags. Fonts are self hosted in `fonts/`.
- Relative `./` paths everywhere except canonical, Open Graph and sitemap URLs.
- Styling comes from the jor.dev brand: `tokens.css`, `base.css`, Montserrat for text, Space Mono for code and the logo, light and dark mode following the system. Content specific colors may stay.
- Every site starts with the shared header from the brand: the wordmark and the color scheme picker, with `brand/theme.js` loaded in the head. The resume is the exception.
- Good a11y: semantic HTML, labeled form controls, aria attributes where needed (live regions, labelled sections), visible focus states, keyboard access, WCAG AA contrast in light and dark mode, and never rely on color alone to convey meaning.
- Good SEO tags: title, meta description, canonical URL, Open Graph and Twitter cards, and JSON-LD structured data where it fits. Keep them in sync with the page content when it changes.

<!-- End of shared block -->

## This project

- Client side QR code generator, live at https://qr.jor.dev/. No backend, nothing leaves the browser.
- `vendor/jsQR.js` is the only runtime dependency, vendored as-is with its license. Every render is decoded again with jsQR and the page shows whether it scans.
- `src/codec.js` tracks which module carries which codeword bit. Pixel art mode depends on that, keep it intact when touching the encoder.
- `brand/` holds the jor.dev tokens, base styles, fonts and logo. Do not edit it, it is copied in from the brand.
