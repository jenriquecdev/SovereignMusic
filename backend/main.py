import os
import json
import base64
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from mutagen import File as MutagenFile

# pull in local env vars if there's a .env lying around
load_dotenv()

app = FastAPI(title="Sovereign Music API")

# let's keep CORS locked down unless explicitly set to wildcard
cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
if cors_origins_raw.strip() == "*":
    origins = ["*"]
    allow_creds = False
else:
    origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
    allow_creds = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

# stop iOS Safari from aggressively caching our static stuff
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.endswith((".html", ".js", ".css")) or path == "/" or path.startswith("/static"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# grab music folder from env or just default to local ./music
MUSIC_DIR = Path(os.getenv("MUSIC_DIR", "music")).resolve()
MUSIC_DIR.mkdir(parents=True, exist_ok=True)

PLAYLISTS_FILE = Path("playlists.json")
LIKED_FILE = Path("liked.json")
HISTORY_FILE = Path("history.json")

# make sure our data dumps exist so we don't blow up on first read
for file, default in [(PLAYLISTS_FILE, []), (LIKED_FILE, []), (HISTORY_FILE, [])]:
    if not file.exists():
        with open(file, "w", encoding="utf-8") as f:
            json.dump(default, f)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

SUPPORTED_EXT = {".mp3", ".mp4", ".m4a", ".flac", ".wav", ".aac", ".ogg"}
MAX_JSON_BODY_SIZE = 1024 * 1024  # cap payloads at 1MB to avoid memory hogging

def encode_track_id(rel_path: str) -> str:
    return base64.urlsafe_b64encode(rel_path.encode("utf-8")).decode("utf-8").rstrip("=")

def decode_track_id(track_id: str) -> str:
    padding = "=" * ((4 - len(track_id) % 4) % 4)
    return base64.urlsafe_b64decode((track_id + padding).encode("utf-8")).decode("utf-8")

def resolve_safe_track_path(track_id: str) -> Path:
    # block path traversal like ../../etc/passwd straight up
    try:
        rel_path = decode_track_id(track_id)
        resolved_path = (MUSIC_DIR / rel_path).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid track ID format")

    if not resolved_path.is_relative_to(MUSIC_DIR):
        raise HTTPException(status_code=403, detail="Access denied: invalid path")
        
    return resolved_path

async def read_limited_json(request: Request):
    # bail early if someone tries sending a massive payload
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_JSON_BODY_SIZE:
        raise HTTPException(status_code=413, detail="Payload too large")

    body = await request.body()
    if len(body) > MAX_JSON_BODY_SIZE:
        raise HTTPException(status_code=413, detail="Payload too large")

    try:
        return json.loads(body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON data")

def parse_track(file_path: Path, base_dir: Path):
    rel_path = file_path.relative_to(base_dir).as_posix()
    track_id = encode_track_id(rel_path)
    
    audio = MutagenFile(file_path)
    title = file_path.stem
    artist = "Desconocido"
    album = "Desconocido"
    duration = 0
    has_cover = False

    if audio is not None:
        if hasattr(audio, 'info') and hasattr(audio.info, 'length'):
            duration = audio.info.length
        
        # dig through weird tag formats across mp3, m4a, etc.
        if audio.tags:
            if 'TIT2' in audio.tags: title = str(audio.tags['TIT2'])
            elif '©nam' in audio.tags: title = str(audio.tags['©nam'][0])
            elif 'title' in audio.tags: title = str(audio.tags['title'][0])
            
            if 'TPE1' in audio.tags: artist = str(audio.tags['TPE1'])
            elif '©ART' in audio.tags: artist = str(audio.tags['©ART'][0])
            elif 'artist' in audio.tags: artist = str(audio.tags['artist'][0])
            
            if 'TALB' in audio.tags: album = str(audio.tags['TALB'])
            elif '©alb' in audio.tags: album = str(audio.tags['©alb'][0])
            elif 'album' in audio.tags: album = str(audio.tags['album'][0])

            if any(k.startswith('APIC') for k in audio.tags.keys()) or 'covr' in audio.tags or 'pictures' in getattr(audio, '__dict__', {}):
                has_cover = True

    return {
        "id": track_id,
        "filename": file_path.name,
        "title": title,
        "artist": artist,
        "album": album,
        "duration_seconds": round(duration, 2),
        "has_cover": has_cover,
        "cover_url": f"/cover/{track_id}" if has_cover else None,
        "stream_url": f"/stream/{track_id}"
    }

@app.get("/")
def read_root():
    return FileResponse(
        "frontend/index.html",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )

@app.get("/tracks")
def get_tracks():
    # crawl the whole music folder recursively
    tracks = []
    for file_path in sorted(MUSIC_DIR.rglob("*")):
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXT:
            tracks.append(parse_track(file_path, MUSIC_DIR))
    return tracks

@app.get("/folder-playlists")
def get_folder_playlists():
    # auto-group by top-level directories as albums/playlists
    folder_playlists = []
    if not MUSIC_DIR.exists():
        return folder_playlists

    for entry in sorted(MUSIC_DIR.iterdir()):
        if entry.is_dir():
            tracks_in_folder = []
            for file_path in sorted(entry.rglob("*")):
                if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXT:
                    tracks_in_folder.append(parse_track(file_path, MUSIC_DIR))
            
            if tracks_in_folder:
                folder_playlists.append({
                    "id": f"folder_{encode_track_id(entry.name)}",
                    "name": entry.name,
                    "is_folder": True,
                    "tracks": tracks_in_folder
                })
    return folder_playlists

@app.get("/cover/{track_id}")
def get_cover(track_id: str):
    file_path = resolve_safe_track_path(track_id)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Track not found")
    
    # extract embedded cover art directly from tags
    audio = MutagenFile(file_path)
    if audio and audio.tags:
        for key in audio.tags.keys():
            if key.startswith('APIC'):
                apic = audio.tags[key]
                return Response(content=apic.data, media_type=apic.mime)
        if 'covr' in audio.tags:
            return Response(content=bytes(audio.tags['covr'][0]), media_type="image/jpeg")
        if hasattr(audio, 'pictures') and audio.pictures:
            return Response(content=audio.pictures[0].data, media_type=audio.pictures[0].mime)
            
    raise HTTPException(status_code=404, detail="Cover not found")

@app.get("/stream/{track_id}")
def stream_track(track_id: str, request: Request):
    file_path = resolve_safe_track_path(track_id)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Track not found")
        
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")
    
    ext_map = {
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".mp4": "audio/mp4",
        ".flac": "audio/flac",
        ".wav": "audio/wav",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg"
    }
    media_type = ext_map.get(file_path.suffix.lower(), "audio/mpeg")

    # handle partial byte requests so seeking works smoothly in browsers
    if range_header:
        parts = range_header.replace("bytes=", "").split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        length = end - start + 1

        def iterfile():
            with open(file_path, "rb") as f:
                f.seek(start)
                bytes_left = length
                chunk_size = 1024 * 128
                while bytes_left > 0:
                    read_len = min(chunk_size, bytes_left)
                    data = f.read(read_len)
                    if not data: break
                    bytes_left -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
        }
        return StreamingResponse(iterfile(), status_code=206, headers=headers, media_type=media_type)

    return FileResponse(file_path, media_type=media_type)

@app.get("/playlists")
def get_playlists():
    with open(PLAYLISTS_FILE, "r", encoding="utf-8") as f: 
        return json.load(f)

@app.post("/playlists")
async def save_playlists(request: Request):
    data = await read_limited_json(request)
    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Data must be a list of playlists")
    # leave out folder-based playlists, only persist user-created ones
    manual_playlists = [p for p in data if isinstance(p, dict) and not p.get("is_folder", False)]
    with open(PLAYLISTS_FILE, "w", encoding="utf-8") as f: 
        json.dump(manual_playlists, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@app.get("/liked")
def get_liked():
    with open(LIKED_FILE, "r", encoding="utf-8") as f: 
        return json.load(f)

@app.post("/liked")
async def save_liked(request: Request):
    data = await read_limited_json(request)
    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Data must be a list of tracks")
    with open(LIKED_FILE, "w", encoding="utf-8") as f: 
        json.dump(data, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@app.get("/history")
def get_history():
    with open(HISTORY_FILE, "r", encoding="utf-8") as f: 
        return json.load(f)

@app.post("/history")
async def add_history(request: Request):
    track = await read_limited_json(request)
    if not isinstance(track, dict) or "id" not in track:
        raise HTTPException(status_code=400, detail="Invalid track payload")
    with open(HISTORY_FILE, "r+", encoding="utf-8") as f:
        hist = json.load(f)
        # push current track to top and cap history at 50 entries
        hist = [t for t in hist if t.get("id") != track["id"]]
        hist.insert(0, track)
        hist = hist[:50]
        f.seek(0)
        f.truncate()
        json.dump(hist, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}