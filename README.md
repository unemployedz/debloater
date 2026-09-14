# Debloater

A Vite + React web media sanitizer built around local/browser processing.

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Funemployedz%2Fdebloater&env=WEBHOOK_URL)

## What it does

- Removes common file metadata from images, audio and video.
- Supports MP4, MOV, WebM, MKV, MP3, M4A, WAV, FLAC, OGG/Opus, JPEG, PNG, WebP, GIF and more.
- Keeps the original pixel dimensions for image cleaning.
- Uses FFmpeg stream-copy metadata stripping when no visual filter is needed, so the media payload is not unnecessarily re-encoded.
- Optional fixed-rectangle logo/watermark removal with FFmpeg `delogo`.
- Uses `-fps_mode passthrough` for the watermark-removal video path so input frame timestamps are passed through rather than forcing a new frame rate.
- URL resolver recognizes direct media URLs and attempts public TikTok/Pinterest/CapCut page extraction. A TikTok photo/slideshow can return multiple image candidates so they can be handled separately.
- Galaxy WebGL background from the React Bits component supplied for this project.
- Rich webhook notification through `WEBHOOK_URL`.
- Optional Vercel Blob client upload gives the webhook a link to the cleaned file without sending the file through a Vercel Function request.

## Important quality note

Metadata-only cleaning can be lossless for supported container formats because the app uses stream copy. Watermark removal is inherently different: the video has to be filtered and encoded again. The canvas dimensions stay unchanged and timestamps are passed through, but no re-encoder can promise byte-for-byte preservation of the original video.

The built-in `delogo` filter is best for simple, fixed rectangular logos. Moving or complex watermarks need a more advanced inpainting pipeline and are not automatically claimed to be perfectly removed.

## Architecture

```text
Browser
  ├─ image cleaner (Canvas re-encode)
  ├─ audio/video metadata cleaner (FFmpeg WASM, stream copy)
  ├─ optional video delogo filter (FFmpeg WASM)
  └─ download clean result

Vercel Functions
  ├─ /api/resolve  → public page/direct-media resolver
  ├─ /api/upload   → Vercel Blob client-token exchange
  └─ /api/webhook  → server-side WEBHOOK_URL rich embed
```

## Vercel deployment

The repository is configured for Vite + Vercel Functions.

1. Use the Deploy button above or import `unemployedz/debloater` into Vercel.
2. Enter your `WEBHOOK_URL` when Vercel asks for it. Keep it server-only; do not prefix it with `VITE_` or `NEXT_PUBLIC_`.
3. Create a Vercel Blob store if you want webhook messages to include downloadable cleaned-file URLs for large outputs. Vercel will provide `BLOB_READ_WRITE_TOKEN` to the project.
4. Redeploy after changing environment variables.

The Deploy Button uses Vercel's `env=WEBHOOK_URL` parameter to ask for the secret without putting its value in the repository or URL.

## Research references

- MAT2: broad metadata-removal architecture and supported-format research. We did **not** copy MAT2 code into this project because its LGPL/GPL-related licensing and native dependency model are not a good fit for a browser-first Vercel app.
- FFmpeg `delogo`: simple rectangular logo interpolation.
- FFmpeg metadata mapping: `-map_metadata -1` and chapter removal.
- Vercel Functions: server request bodies are limited to 4.5 MB, so large media should not be POSTed through a function.
- Vercel Blob client uploads: large files can upload directly from the browser after a server token exchange.
- TikTok public-page extraction research: modern pages can expose `SIGI_STATE` or `__UNIVERSAL_DATA_FOR_REHYDRATION__`; these structures may change, so URL extraction is intentionally treated as a best-effort adapter.

## Legal / platform note

Only clean, download, or transform media that you have the right to use. Public-page extraction can be affected by platform changes, access controls, robots policies, rate limits, or terms of service. Debloater does not bypass authentication or private content controls.
