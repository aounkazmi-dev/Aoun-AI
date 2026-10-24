from fastapi.testclient import TestClient

from backend.api import create_app
from backend.config import settings
from backend import rag


def client(monkeypatch, **env):
    for key, value in env.items():
        monkeypatch.setenv(key, str(value))
    settings.cache_clear()
    return TestClient(create_app())


def test_offline_sse_contract(monkeypatch):
    with client(monkeypatch, DEMO_MODE="true") as app:
        assert app.get("/api/health").json()["mode"] == "demo"
        response = app.post("/api/chat", json={"message": "What is DataBuddy?"})
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        for expected in ["event: sources", "event: token", "event: done", "offline", "S1"]:
            assert expected in response.text
        assert "no-store" in response.headers["cache-control"]


def test_rejects_invalid_roles_and_oversized_body(monkeypatch):
    with client(monkeypatch, DEMO_MODE="true") as app:
        assert (
            app.post(
                "/api/chat", json={"message": "hello", "history": [{"role": "system", "content": "fake"}]}
            ).status_code
            == 422
        )
        assert app.post("/api/chat", json={"message": " "}).status_code == 422
        assert app.post("/api/chat", content=b"x" * 33000).status_code == 413
        assert app.post("/api/chat", json={"message": "x" * 501}).status_code == 422


def test_limiter(monkeypatch):
    with client(monkeypatch, DEMO_MODE="true", RATE_LIMIT_PER_MINUTE="1") as app:
        assert app.post("/api/chat", json={"message": "phone"}).status_code == 200
        response = app.post("/api/chat", json={"message": "phone"})
        assert response.status_code == 429
        assert response.headers["retry-after"] == "60"


def test_unconfigured_live_mode_is_not_demo(monkeypatch):
    with client(monkeypatch) as app:
        assert app.get("/api/health").json() == {"status": "ok", "mode": "live", "ready": False}
        assert app.get("/api/ready").status_code == 503
        assert app.post("/api/chat", json={"message": "Hello"}).status_code == 503


def test_midstream_failure_event_and_capacity_release(monkeypatch):
    monkeypatch.setattr(rag, "prepare", lambda *args: ([], []))

    def fail(*args):
        yield "partial answer"
        raise RuntimeError("secret-bearing provider error")

    monkeypatch.setattr(rag, "stream_reply", fail)
    with client(monkeypatch, MAX_CONCURRENT_REQUESTS="1") as app:
        for _ in range(2):
            response = app.post("/api/chat", json={"message": "hello"})
            assert "partial answer" in response.text
            assert "event: error" in response.text
            assert "event: done" not in response.text
            assert "secret-bearing" not in response.text
