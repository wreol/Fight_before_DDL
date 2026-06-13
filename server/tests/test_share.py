def test_create_share(client):
    response = client.post("/api/share", json={
        "run_data": {
            "player_name": "测试玩家",
            "floor_reached": 5,
            "enemies_killed": 20,
            "died_to": "早八点名",
            "score": 3200,
            "seed": "abc123",
        }
    })
    assert response.status_code == 201
    data = response.json()
    assert "card_id" in data
    assert "url" in data


def test_get_share_404(client):
    response = client.get("/api/share/nonexistent")
    assert response.status_code == 404


def test_create_and_retrieve_share(client):
    """Create a share and retrieve it"""
    run_data = {
        "player_name": "测试玩家",
        "floor_reached": 5,
        "enemies_killed": 20,
        "died_to": "早八点名",
        "score": 3200,
        "seed": "abc123",
    }
    create_resp = client.post("/api/share", json={"run_data": run_data})
    assert create_resp.status_code == 201
    card_id = create_resp.json()["card_id"]

    get_resp = client.get(f"/api/share/{card_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["run_data"] == run_data
