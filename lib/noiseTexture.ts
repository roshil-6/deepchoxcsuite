/** Seamless fractal noise as a data URL — avoids a separate `/noise.png` asset and 404s in dev. */
export const NOISE_DATA_URL =
    'data:image/svg+xml,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" result="t"/><feColorMatrix type="saturate" values="0" in="t"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="1"/></svg>`,
    );
