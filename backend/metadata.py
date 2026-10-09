import hashlib
import os
from typing import Any, Dict, List, Optional, Tuple
from mutagen import File
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4


def derive_track_id(relative_path: str) -> str:
    """Genera un identificador SHA-1 de 8 caracteres a partir de la ruta relativa."""
    return hashlib.sha1(relative_path.encode("utf-8")).hexdigest()[:8]


def extract_track_metadata(file_path: str, base_dir: str) -> Dict[str, Any]:
    """Extrae metadatos y detecta si tiene carátula incrustada."""
    relative_path = os.path.relpath(file_path, base_dir)
    track_id = derive_track_id(relative_path)
    filename_stem = os.path.splitext(os.path.basename(file_path))[0]

    title = filename_stem
    artist = "Unknown"
    album = "Unknown"
    duration_seconds = 0
    has_cover = False

    try:
        audio = File(file_path)
        if audio is not None:
            if audio.info and hasattr(audio.info, "length"):
                duration_seconds = round(audio.info.length)

            tags = audio.tags
            if tags:
                # Lectura de tags para MP3
                if hasattr(tags, "get"):
                    if "TIT2" in tags:
                        title = str(tags["TIT2"])
                    if "TPE1" in tags:
                        artist = str(tags["TPE1"])
                    if "TALB" in tags:
                        album = str(tags["TALB"])
                    # Verificar si existe portada APIC
                    for key in tags.keys():
                        if key.startswith("APIC"):
                            has_cover = True
                            break

                # Lectura de tags para MP4 / M4A
                if isinstance(tags, dict):
                    if "©nam" in tags and tags["©nam"]:
                        title = str(tags["©nam"][0])
                    if "©ART" in tags and tags["©ART"]:
                        artist = str(tags["©ART"][0])
                    if "©alb" in tags and tags["©alb"]:
                        album = str(tags["©alb"][0])
                    if "covr" in tags and tags["covr"]:
                        has_cover = True

    except Exception as err:
        print(f"[WARN] Error leyendo metadatos de {file_path}: {err}")

    return {
        "id": track_id,
        "title": title,
        "artist": artist,
        "album": album,
        "duration_seconds": duration_seconds,
        "has_cover": has_cover,
        "cover_url": f"/cover/{track_id}" if has_cover else "/static/default-cover.png",
        "stream_url": f"/stream/{track_id}",
    }


def extract_cover_bytes(file_path: str) -> Optional[Tuple[bytes, str]]:
    """Extrae los bytes binarios y el MIME type de la carátula incrustada."""
    try:
        audio = File(file_path)
        if audio is None or not audio.tags:
            return None

        # MP3 ID3 APIC
        if hasattr(audio.tags, "keys"):
            for key in audio.tags.keys():
                if key.startswith("APIC"):
                    apic = audio.tags[key]
                    mime = getattr(apic, "mime", "image/jpeg")
                    return apic.data, mime

        # MP4 / M4A covr
        if isinstance(audio.tags, dict) and "covr" in audio.tags:
            covr = audio.tags["covr"]
            if covr:
                data = bytes(covr[0])
                # Mutagen MP4Cover formats: 13=JPEG, 14=PNG
                imageformat = getattr(covr[0], "imageformat", None)
                mime = "image/png" if imageformat == 14 else "image/jpeg"
                return data, mime

    except Exception as err:
        print(f"[WARN] Error extrayendo portada de {file_path}: {err}")

    return None


def scan_music_directory(
    music_dir: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """Recorre recursivamente el directorio de música e indexa las canciones."""
    tracks: List[Dict[str, Any]] = []
    track_index: Dict[str, str] = {}

    if not os.path.isdir(music_dir):
        print(f"[WARN] El directorio '{music_dir}' no existe.")
        return tracks, track_index

    valid_extensions = {".mp3", ".mp4", ".m4a"}

    for root, _, files in os.walk(music_dir):
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in valid_extensions:
                abs_path = os.path.abspath(os.path.join(root, filename))
                meta = extract_track_metadata(abs_path, music_dir)
                tracks.append(meta)
                track_index[meta["id"]] = abs_path

    return tracks, track_index
