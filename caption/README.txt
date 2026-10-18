Kalam · Caption studio — complete package
=========================================
Files
  index.html            the whole app (single page, no build step)
  manifest.webmanifest  PWA manifest
  sw.js                 service worker (offline cache)
  icon-192.png, icon-512.png

Run locally (service workers need http://localhost or https)
  python3 -m http.server 8080      then open http://localhost:8080

Host it
  Upload all files together to any HTTPS static host (Netlify, Vercel,
  GitHub Pages, Cloudflare Pages, your own server). The page finds
  manifest.webmanifest and registers sw.js by itself; use "Install app"
  in the header, or your browser's install / Add to Home Screen option.

Notes
  - Libraries and fonts come from cdnjs and Google Fonts. The first online
    visit caches them, so later visits work offline.
  - Inputs: JSON (segments, captions, word timings), SRT/VTT, or plain text,
    plus an optional mp3.
  - Exports: PNG frame, WebM video (with mp3), SRT text, timed JSON.
