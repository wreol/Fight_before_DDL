from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import DailySeed

TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _ensure_seed(date_str: str, seed_str: str):
    """Helper to insert or update a DailySeed directly in test DB."""
    db = TestingSessionLocal()
    existing = db.query(DailySeed).filter(DailySeed.date == date_str).first()
    if existing:
        if existing.seed != seed_str:
            db.delete(existing)
            db.commit()
            db.add(DailySeed(date=date_str, seed=seed_str))
            db.commit()
    else:
        db.add(DailySeed(date=date_str, seed=seed_str))
        db.commit()
    db.close()


def test_get_empty_leaderboard(client):
    response = client.get("/api/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert data["entries"] == []


def test_submit_entry(client):
    _ensure_seed("2026-06-13", "testseed123")

    entry = {
        "player_name": "卷王之王",
        "seed": "testseed123",
        "date": "2026-06-13",
        "floor_reached": 8,
        "enemies_killed": 42,
        "score": 9850,
        "died_to": "期末周",
    }
    response = client.post("/api/leaderboard", json=entry)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "id" in data
    assert "rank" in data


def test_get_leaderboard_with_date(client):
    response = client.get("/api/leaderboard?date_filter=2026-06-13")
    assert response.status_code == 200
    data = response.json()
    assert "entries" in data
    assert data["date"] == "2026-06-13"


def test_duplicate_submit_better_score(client):
    _ensure_seed("2026-06-14", "dupseed")

    entry1 = {
        "player_name": "卷王之王",
        "seed": "dupseed",
        "date": "2026-06-14",
        "floor_reached": 3,
        "score": 1000,
    }
    r1 = client.post("/api/leaderboard", json=entry1)
    assert r1.status_code == 201

    # Submit again with higher score
    entry2 = {
        "player_name": "卷王之王",
        "seed": "dupseed",
        "date": "2026-06-14",
        "floor_reached": 10,
        "score": 9999,
    }
    r2 = client.post("/api/leaderboard", json=entry2)
    assert r2.status_code == 201
    # Should have same id (update, not insert)
    assert r2.json()["id"] == r1.json()["id"]


def test_seed_mismatch_rejected(client):
    _ensure_seed("2026-06-15", "correct_seed")

    entry = {
        "player_name": "黑客",
        "seed": "wrong_seed",
        "date": "2026-06-15",
        "floor_reached": 99,
        "score": 99999,
    }
    response = client.post("/api/leaderboard", json=entry)
    assert response.status_code == 400
