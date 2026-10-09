import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_index_page():
    """Make sure the root route serves the main HTML page."""
    response = client.get("/")
    assert response.status_code == 200
    assert "SOVEREIGN" in response.text


def test_get_tracks_endpoint():
    """Check that /tracks returns a valid list."""
    response = client.get("/tracks")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_stream_not_found():
    """Return 404 when asking for a track that doesn't exist."""
    response = client.get("/stream/inexistente123")
    assert response.status_code == 404


def test_range_request_flow():
    """Test partial content streaming using the Range header."""
    tracks_res = client.get("/tracks")
    tracks = tracks_res.json()

    if len(tracks) > 0:
        track_id = tracks[0]["id"]
        # Ask for the first 1KB
        headers = {"Range": "bytes=0-1023"}
        res = client.get(f"/stream/{track_id}", headers=headers)

        assert res.status_code == 206
        assert "Content-Range" in res.headers
        assert res.headers["Content-Range"].startswith("bytes 0-1023/")
        assert len(res.content) == 1024