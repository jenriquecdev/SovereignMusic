# Architecture

This document is the technical reference for the self-hosted personal music streaming application. It describes the internal design, data flows, and implementation details for backend and frontend developers auditing or extending the system.

---

## HTTP Streaming Mechanism

The streaming server implements [HTTP Range Requests (RFC 7233)](https://www.rfc-editor.org/rfc/rfc7233) to deliver audio content efficiently. This allows clients — including the HTML5 `<audio>` element — to request specific byte ranges of a file, enabling seeking, resumption after interruption, and memory-efficient delivery without loading the entire file into memory.

Both **MP3** and **MP4** audio container formats are supported by the `/stream/{id}` endpoint.

### Range Header Lifecycle

**1. Client sends a Range request**

When the browser's `<audio>` element begins playback or seeks to a position, it issues an HTTP GET request with a `Range` header specifying the desired byte offset:

```
GET /stream/3f2a1b4c HTTP/1.1
Range: bytes=0-1048575
```

The format is `bytes=<start>-<end>`, where both values are zero-indexed byte offsets (inclusive). The client may omit the end value (`bytes=0-`) to request from a given offset to the end of the file.

**2. Server parses the Range header**

The FastAPI route handler reads the `Range` header from the incoming request. It extracts the `start` and `end` byte offsets and resolves any open-ended range against the actual file size. If no `Range` header is present, the server falls back to a full-file response (see below).

**3. Server constructs the HTTP 206 Partial Content response**

For a valid, in-bounds range request, the server opens the audio file, seeks to `start`, reads exactly `end - start + 1` bytes, and returns them as a streaming response with the following headers:

```
HTTP/1.1 206 Partial Content
Content-Type: audio/mpeg
Content-Range: bytes 0-1048575/8388608
Content-Length: 1048576
Accept-Ranges: bytes
```

The `Content-Range` header follows the format `bytes <start>-<end>/<total>`, where `total` is the full file size in bytes.

### Full-File Response (No Range Header — HTTP 200)

When a client sends a request to `/stream/{id}` without a `Range` header, the server returns the complete file body with an HTTP 200 OK response:

```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 8388608
Accept-Ranges: bytes
```

The `Accept-Ranges: bytes` header is included in all responses to signal to the client that the server supports range requests, allowing the `<audio>` element to issue subsequent range requests for seeking.

### Out-of-Bounds Range — HTTP 416 Range Not Satisfiable

When a client requests a byte range where `start` or `end` exceeds the file size minus one (i.e., the range is outside the available content), the server returns HTTP 416 with a `Content-Range` header indicating the actual file size:

```
HTTP/1.1 416 Range Not Satisfiable
Content-Range: bytes */8388608
```

The `*` in `bytes */<total>` indicates that no valid range was served. The client can use the `total` value to recalibrate its requests.

### FastAPI Route Handler

The following Python code demonstrates the core implementation of the streaming endpoint, including byte-range parsing and `StreamingResponse` construction:

```python
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, Response

app = FastAPI()

MUSIC_DIR = os.environ.get("MUSIC_DIR", "music")
CHUNK_SIZE = 1024 * 1024  # 1 MiB per chunk

# In-memory index: populated at startup (see Metadata Index section)
track_index: dict[str, str] = {}  # id -> absolute file path


def get_content_type(file_path: str) -> str:
    """Return the MIME type based on the audio file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    return "audio/mp4" if ext == ".mp4" else "audio/mpeg"


def iter_file_range(file_path: str, start: int, end: int):
    """Generator that yields bytes from file_path in the range [start, end]."""
    with open(file_path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = f.read(min(CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


@app.get("/stream/{track_id}")
async def stream_audio(track_id: str, request: Request) -> Response:
    """
    Serve audio content for the given track_id.

    Returns HTTP 206 Partial Content for Range requests,
    HTTP 200 OK for full-file requests, and
    HTTP 416 Range Not Satisfiable for out-of-bounds ranges.
    """
    file_path = track_index.get(track_id)
    if file_path is None or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Track not found")

    file_size = os.path.getsize(file_path)
    content_type = get_content_type(file_path)
    range_header = request.headers.get("Range")

    # No Range header — return the full file with HTTP 200
    if range_header is None:
        headers = {
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
        }
        return StreamingResponse(
            iter_file_range(file_path, 0, file_size - 1),
            status_code=200,
            media_type=content_type,
            headers=headers,
        )

    # Parse the Range header: "bytes=<start>-<end>"
    try:
        unit, range_spec = range_header.split("=", 1)
        if unit.strip() != "bytes":
            raise ValueError("Unsupported range unit")
        start_str, end_str = range_spec.split("-", 1)
        start = int(start_str)
        end = int(end_str) if end_str.strip() else file_size - 1
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Malformed Range header")

    # Validate range bounds — return HTTP 416 if out of range
    if start >= file_size or end >= file_size or start > end:
        headers = {"Content-Range": f"bytes */{file_size}"}
        raise HTTPException(
            status_code=416,
            detail="Range Not Satisfiable",
            headers=headers,
        )

    # Construct HTTP 206 Partial Content response
    content_length = end - start + 1
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(content_length),
        "Accept-Ranges": "bytes",
    }
    return StreamingResponse(
        iter_file_range(file_path, start, end),
        status_code=206,
        media_type=content_type,
        headers=headers,
    )
```

**Key implementation notes:**

- `iter_file_range` is a generator function. `StreamingResponse` consumes it lazily, so only the requested bytes are read from disk — the full file is never loaded into memory.
- The `end` offset defaults to `file_size - 1` when the client sends an open-ended range such as `bytes=0-`, which is the standard behaviour for initial playback requests.
- The `Accept-Ranges: bytes` header is included in every response (200 and 206) so that clients know range requests are supported even before issuing one.
- Both `.mp3` files (`audio/mpeg`) and `.mp4` files (`audio/mp4`) are handled through the `get_content_type` helper.

---

## Frontend PWA & MediaSession

The frontend is a Progressive Web App (PWA) built with Vanilla JavaScript, HTML5, and Tailwind CSS. It integrates the browser's native `<audio>` element with the [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) to expose playback controls on OS lock screens and notification trays, and it ships a `manifest.json` to make the app installable on supported devices.

### HTML5 Audio Element Lifecycle

The HTML5 `<audio>` element manages the full playback lifecycle. The JavaScript controller attaches event listeners to drive UI state:

- **`loadstart`** — fired when the browser begins requesting the audio resource; used to show a loading indicator.
- **`canplay`** — fired when enough data has buffered for playback to begin; used to enable the play button and update MediaSession metadata.
- **`play` / `pause`** — fired when playback starts or pauses; used to toggle the play/pause button icon and update `navigator.mediaSession.playbackState`.
- **`timeupdate`** — fired periodically during playback (approximately every 250 ms); used to advance the seek bar and elapsed-time display.
- **`ended`** — fired when the track finishes; used to advance to the next track automatically.

The `<audio>` element's `src` is set to the `/stream/{id}` endpoint URL. Because the streaming server supports `Range` requests, the browser issues byte-range requests during seeking and initial buffering — the element handles this transparently.

### MediaSession API — Metadata Registration

When a track begins playing, the controller registers rich metadata with the OS via `navigator.mediaSession.metadata`. This surfaces the track title, artist, album, and artwork in the device's lock screen widget, notification tray, and media overlay.

### MediaSession API — Action Handler Registration

The controller registers four action handlers that map OS-level transport controls (hardware media keys, lock-screen buttons, Bluetooth remote controls) back to JavaScript callbacks: `play`, `pause`, `previoustrack`, and `nexttrack`.

The following JavaScript code block demonstrates metadata registration and action handler setup:

```javascript
/**
 * Registers MediaSession metadata and action handlers for the current track.
 *
 * @param {Object} track - Track object from the /tracks API response.
 * @param {string} track.title - Track title.
 * @param {string} track.artist - Artist name.
 * @param {string} track.album - Album name.
 * @param {HTMLAudioElement} audioEl - The <audio> element driving playback.
 * @param {Function} onPrevious - Callback to load the previous track.
 * @param {Function} onNext - Callback to load the next track.
 */
function registerMediaSession(track, audioEl, onPrevious, onNext) {
  if (!('mediaSession' in navigator)) {
    return; // MediaSession API not supported in this browser
  }

  // Register track metadata — surfaces on OS lock screen and notification tray
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: [
      { src: '/static/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/static/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  });

  // Register transport action handlers
  navigator.mediaSession.setActionHandler('play', () => {
    audioEl.play();
    navigator.mediaSession.playbackState = 'playing';
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    audioEl.pause();
    navigator.mediaSession.playbackState = 'paused';
  });

  navigator.mediaSession.setActionHandler('previoustrack', () => {
    onPrevious();
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    onNext();
  });
}
```

**Key implementation notes:**

- `navigator.mediaSession` availability is checked before every call — the API is not present in all browsers, so the application degrades gracefully to standard `<audio>` controls.
- `navigator.mediaSession.playbackState` is kept in sync with the `<audio>` element state so the OS widget accurately reflects whether audio is playing or paused.
- `MediaMetadata.artwork` accepts an array of image sources; the browser selects the most appropriate size for the current display context.
- `setActionHandler` overwrites any previously registered handler for the same action, so re-calling `registerMediaSession` on each track change is safe and intentional.

### Background Audio Retention Strategy

The HTML5 `<audio>` element continues playback independent of page visibility. When the user switches to another tab, locks the device screen, or minimises the browser, the browser's media pipeline keeps the audio session alive as long as at least one of the following conditions holds:

1. **Active media session** — the page has registered `navigator.mediaSession` metadata and at least one action handler. Browsers use this signal to classify the tab as an active media producer and will not suspend or throttle it.
2. **Uninterrupted `<audio>` element** — the element's `paused` property is `false` at the moment the tab is backgrounded. Browsers do not pause a playing audio element on visibility change; this is distinct from video elements, which some browsers may pause or mute.
3. **No `autoplay` policy conflict** — playback must have been initiated by a user gesture (click, tap, or keyboard event) at least once. A user-initiated play call satisfies the browser's autoplay policy for the lifetime of the page, including when the tab is backgrounded.

On mobile, the Media Session API integration is essential: without registered handlers and updated `playbackState`, some mobile browsers (notably on iOS and Android) will terminate the audio session after a short idle period on the lock screen. Calling `navigator.mediaSession.setActionHandler` and keeping `playbackState` current signals to the OS that the session is actively managed and should be preserved.

There is no Web Worker or Service Worker required for basic background audio retention — the `<audio>` element and MediaSession API together are sufficient.

### PWA Installability — `manifest.json`

The application is linked to a Web App Manifest that enables browsers to offer an "Add to Home Screen" / "Install App" prompt. The manifest is referenced in the HTML `<head>`:

```html
<link rel="manifest" href="/manifest.json">
```

The `manifest.json` file is served as a static asset and contains the following required fields:

```json
{
  "name": "Personal Music Stream",
  "short_name": "MusicStream",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a1a2e",
  "background_color": "#0f0f1a",
  "icons": [
    { "src": "/static/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/static/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Field descriptions:**

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | `"Personal Music Stream"` | Full application name, displayed during installation and in app switchers |
| `short_name` | `"MusicStream"` | Truncated name used on home screen icons where space is limited (≤ 12 characters recommended) |
| `start_url` | `"/"` | The URL opened when the installed PWA is launched — loads the root of the streaming interface |
| `display` | `"standalone"` | Hides the browser navigation bar and status bar chrome, making the app appear and behave like a native application |
| `icons` | 192 × 192 and 512 × 512 PNG | Required icon sizes: 192 × 192 is the minimum for Android home screen installation; 512 × 512 is used for splash screens and high-density displays |
| `theme_color` | `"#1a1a2e"` | Colours the browser toolbar and the task-switcher title bar on Android to match the application's dark theme |

The `background_color` field (dark navy `#0f0f1a`) fills the splash screen displayed while the PWA is loading, preventing a white flash before the UI renders.

For browsers to trigger the native install prompt automatically, three conditions must be met: the page is served over HTTPS (satisfied by Cloudflare Tunnel), a valid manifest with the required fields above is linked, and a Service Worker is registered. A minimal Service Worker that caches the shell assets and passes audio range requests through to the network is sufficient to satisfy this third requirement.


---

## Directory Structure

The following tree shows the top-level layout of the repository:

```
music-streaming/
├── backend/          # FastAPI streaming server, metadata extraction, route handlers
├── frontend/         # Vanilla JS controller, HTML entry point, Tailwind CSS source
├── static/           # Compiled Tailwind CSS, PWA icons, manifest.json
├── music/            # Local audio library (MP3/MP4 files — not committed to VCS)
├── .env.example      # Template listing all required environment variables with comments
├── requirements.txt  # Python dependency manifest (FastAPI, uvicorn, mutagen, etc.)
└── README.md         # Repository entry point — introduction, installation, quickstart
```

`backend/` and `frontend/` each contain their own sub-directories for routes, tests, and static assets respectively. The `music/` directory is excluded from version control via `.gitignore` and is populated by the operator on the target host.

---

## Metadata Index

### Startup Scan

On server startup, the Streaming_Server scans the directory specified by the `MUSIC_DIR` environment variable. For every file with a `.mp3` or `.mp4` extension it finds, the server uses [mutagen](https://mutagen.readthedocs.io/) to extract the following metadata fields:

| Field | Mutagen tag (MP3) | Mutagen tag (MP4) | Fallback |
|-------|-------------------|-------------------|---------|
| `title` | `TIT2` | `©nam` | Filename stem (without extension) |
| `artist` | `TPE1` | `©ART` | `"Unknown"` |
| `album` | `TALB` | `©alb` | `"Unknown"` |
| `duration_seconds` | `info.length` (rounded) | `info.length` (rounded) | `0` |

The `id` for each track is derived by computing the SHA-1 hash of the file's path relative to `MUSIC_DIR` and taking the first 8 hexadecimal characters. This provides a stable, short identifier that changes only if the file is moved or renamed.

The completed index is held in memory as a Python dict (`id → file_path`) for the lifetime of the server process. No per-request disk scanning occurs. If a file has unreadable or corrupt tags, it is skipped and a warning is logged to stderr; this does not interrupt the scan or crash the server.

### API Endpoint

The index is exposed via a single read-only endpoint:

```
GET /tracks
```

The response is a JSON array containing one object per indexed track. An empty music directory returns an empty array (`[]`) with HTTP 200.

### Response Schema

```json
[
  {
    "id": "3f2a1b4c",
    "title": "Blue in Green",
    "artist": "Miles Davis",
    "album": "Kind of Blue",
    "duration_seconds": 337,
    "stream_url": "/stream/3f2a1b4c"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | First 8 hex characters of the SHA-1 hash of the file's relative path |
| `title` | `string` | Track title from audio tags, or filename stem if the tag is absent |
| `artist` | `string` | Artist name from audio tags, or `"Unknown"` if absent |
| `album` | `string` | Album name from audio tags, or `"Unknown"` if absent |
| `duration_seconds` | `integer` | Track duration in whole seconds, derived from `mutagen`'s `info.length` |
| `stream_url` | `string` | Relative URL to the streaming endpoint — pass this directly to the `<audio>` element's `src` attribute |
