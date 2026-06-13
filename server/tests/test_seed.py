def test_get_today_seed(client):
    response = client.get("/api/seed/today")
    assert response.status_code == 200
    data = response.json()
    assert "date" in data
    assert "seed" in data
    assert len(data["seed"]) > 0


def test_seed_consistent(client):
    """Same request returns same seed (idempotent within session)"""
    r1 = client.get("/api/seed/today")
    r2 = client.get("/api/seed/today")
    assert r1.json()["seed"] == r2.json()["seed"]
