Architecture

This document is the technical reference for the self-hosted personal music streaming application. It describes the internal design, data flows, and implementation details for backend and frontend developers auditing or extending the system. **HTTP** Streaming Mechanism

The streaming server implements **HTTP** Range Requests (**RFC** **7233**) to deliver audio content efficiently. This allows clients — including the **HTML5** audio element — to request specific byte ranges of a file, enabling seeking, resumption after interruption, and memory-efficient delivery without loading the entire file into memory.

Supported audio formats: **MP3** (.mp3), **MPEG**-4 Audio (.m4a), and **MP4** (.mp4). ### Range Header Lifecycle

    Client sends a Range request

When the browser audio element begins playback or seeks, it issues an **HTTP** **GET** request with a Range header:

**GET** /stream/3f2a1b4c **HTTP**/1.1 Range: bytes=0-**1048575**

The format is bytes=start-end, where both values are zero-indexed byte offsets (inclusive). The client may omit the end value (bytes=0-) to request from an offset to the end of the file.

    Server validates security and boundaries

The FastAPI route handler resolves the requested track_id against the verified in-memory index. It confirms the target path exists and strictly resides inside MUSIC_DIR via is_relative_to to prevent path traversal attacks.

    Server constructs the **HTTP** **206** Partial Content response

For a valid range request, the server seeks to start, reads end - start + 1 bytes via a lazy generator (CHUNK_SIZE = 1 MiB), and streams the response:

**HTTP**/1.1 **206** Partial Content Content-Type: audio/mpeg Content-Range: bytes 0-**1048575**/**8388608** Content-Length: **1048576** Accept-Ranges: bytes Full-File Response (No Range Header — **HTTP** **200**)

When no Range header is provided, the server streams the complete file body:

**HTTP**/1.1 **200** OK Content-Type: audio/mpeg Content-Length: **8388608** Accept-Ranges: bytes Out-of-Bounds Range — **HTTP** **416** Range Not Satisfiable

When a client requests a byte offset exceeding the file size, the server responds with **HTTP** **416**:

**HTTP**/1.1 **416** Range Not Satisfiable Content-Range: bytes */**8388608** Metadata and Cover Art Extraction Startup Scan and Track Index

On server startup, backend/metadata.py recursively scans the directory specified by MUSIC_DIR. Supported files (.mp3, .m4a, .mp4) are indexed using mutagen:

| Field            | Tag (MP3 ID3) | Tag (MP4 / M4A) | Fallback      |
|------------------|---------------|-----------------|---------------|
| title            | TIT2          | ©nam            | Filename stem |
| artist           | TPE1          | ©ART            | Unknown       |
| album            | TALB          | ©alb            | Unknown       |
| duration_seconds | info.length   | info.length     | 0             |
| has_cover        | APIC frame    | covr atom       | False         |

The id for each track is derived from the first 8 hex characters of the **SHA**-1 hash of its relative path. Core **API** and Persistence Layer

    **GET** /tracks: Returns a **JSON** list of all indexed songs with metadata, duration, cover art flags, and stream URLs.

    **GET** /cover/{track_id}: Extracts and streams the raw embedded binary cover art (image/jpeg or image/png) without saving duplicate image files to disk.

    **GET** /stream/{track_id}: **RFC** **7233** byte-range audio streaming endpoint.

    **GET** / **POST** /playlists: Reads and persists custom user playlists to playlists.json.

    **GET** /folder-playlists: Generates automatic virtual albums grouped by directory hierarchy.

    **GET** / **POST** /liked: Stores and retrieves favorited track IDs to liked.json.

    **GET** / **POST** /history: Logs playback history to history.json (capped at 50 entries).

Note on Persistence: User preferences and playlists are stored as atomic **JSON** files on the local file system. This removes external database overhead (e.g., PostgreSQL or SQLite) while guaranteeing easy backup and local data sovereignty. Frontend Architecture, **PWA**, and MediaSession

The client is a zero-dependency Single Page Application (**PWA**) built with Vanilla JavaScript, **HTML5**, and Tailwind **CSS** (Monochrome Stealth Dark Theme). Playback Engine and Smart Shuffle

    Audio Controller: Drives the native **HTML5** audio element with events (timeupdate, ended, error) to maintain seek bar synchronization and auto-progression.

    Smart Shuffle: Uses an in-memory permutation cycle (Fisher-Yates variant) to prevent track repetition until all songs in the current playlist context have been played.

Service Worker Strategy (static/sw.js)

The application includes an offline-capable Service Worker:

    Static Assets (**HTML**, **CSS**, JS, icons): Cached using a Stale-While-Revalidate strategy for instant load times and offline shell availability.

    Audio Streams (/stream/*): Explicitly bypassed by the Service Worker or passed through using Network-Only to prevent caching issues with partial **HTTP** **206** byte-range responses.

MediaSession **API** and iOS Background Audio

The player integrates with navigator.mediaSession to provide system-level playback controls on lock screens, notification trays, and hardware media keys:

    Action Handlers: play, pause, previoustrack, nexttrack, and seekto.

    Artwork Resolution: Dynamically maps to track.cover_url (origin-relative) or /static/logotipo.jpg as fallback.

    Audio Session Persistence: Complies with iOS Safari WebKit background audio lifecycle policies by maintaining active media session action hooks and deferred user-gesture play promises.

**PWA** Manifest (/static/manifest.json)

The application is installable as a standalone **PWA**:
{
    *name*: *Sovereign Music*,
    *short_name*: *Sovereign*,
    *start_url*: */*,
    *display*: *standalone*,
    *background_color*: *#0a0a0a*,
    *theme_color*: *#0a0a0a*,
    *icons*: [
    {
    *src*: */static/logotipo.jpg*,
    *sizes*: *192x192*,
    *type*: *image/jpeg*,
    *purpose*: *any maskable*
    },
    {
    *src*: */static/logotipo.jpg*,
    *sizes*: *512x512*,
    *type*: *image/jpeg*,
    *purpose*: *any maskable*
    }
    ]
    }

## Repository Structure

***SovereignMusic/***

    backend/

        main.py — FastAPI server, security guards, streaming and **REST** routes

        metadata.py — Mutagen scanning, **SHA**-1 IDs, binary cover extraction

    frontend/

        index.html — 3-panel responsive layout, **PWA** entry point

    static/

        app.js — Smart shuffle engine, audio controller, UI renderer

        sw.js — **PWA** Service Worker (asset caching and stream bypass)

        manifest.json — Web App Manifest

        logotipo.jpg — App icon and default fallback artwork

    music/ — Audio files storage (local only, ignored in Git)

        .gitkeep

    tests/

        test_server.py — Pytest suite (**HTTP** **200**, **206** range requests, 404s)

    .env.example — Environment template (MUSIC_DIR, **HOST**, **PORT**, **CORS**)

    .gitignore — Ignores .env, audio files, databases, .venv, caches

    requirements.txt — Python dependencies (fastapi, uvicorn, mutagen, python-dotenv)

    **README**.md — Project overview and setup instructions