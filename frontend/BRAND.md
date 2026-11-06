# VEYRA logo and favicon

The mark is a faceted V. One arm is Electric Indigo (#5146D8), the other Midnight Indigo (#171A45), and a Golden Yellow dot (#FFC83D) sits in the notch. The dot stands for the evidence point every AI assessment links back to.

- `assets/brand/veyra-mark.svg` is the V on its own.
- `assets/brand/veyra-logo.svg` is the mark plus the VEYRA wordmark (Bricolage Grotesque).
- `assets/brand/favicon.svg` is the mark on an indigo tile, drawn bolder so it stays readable at 16px.

In the app the mark is drawn by `js/brand.js` from the `--mark-a`, `--mark-b` and `--mark-dot` tokens, so it recolors in dark mode. `brand.js` also injects the favicon, so no extra link tag is needed. To use the file instead, add `<link rel="icon" type="image/svg+xml" href="assets/brand/favicon.svg">`.
