import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_index_page():
    """Verifica que la raíz sirva la página principal HTML con código 200."""
    response = client.get("/")
    assert response.status_code == 200
    assert "SOVEREIGN" in response.text


def test_get_tracks_endpoint():
    """Verifica que /tracks retorne una lista JSON válida."""
    response = client.get("/tracks")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_stream_not_found():
    """Verifica que solicitar una canción inexistente devuelva 404."""
    response = client.get("/stream/inexistente123")
    assert response.status_code == 404


def test_range_request_flow():
    """Verifica el flujo de streaming con cabecera Range (HTTP 206)."""
    tracks_res = client.get("/tracks")
    tracks = tracks_res.json()

    if len(tracks) > 0:
        track_id = tracks[0]["id"]
        # Solicitar los primeros 1024 bytes
        headers = {"Range": "bytes=0-1023"}
        res = client.get(f"/stream/{track_id}", headers=headers)

        assert res.status_code == 206
        assert "Content-Range" in res.headers
        assert res.headers["Content-Range"].startswith("bytes 0-1023/")
        assert len(res.content) == 1024
