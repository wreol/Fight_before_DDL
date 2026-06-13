from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from app.database import get_db
from app.models import LeaderboardEntry, DailySeed

router = APIRouter()


class SubmitEntry(BaseModel):
    player_name: str
    seed: str
    date: str
    floor_reached: int
    enemies_killed: int = 0
    score: int = 0
    augments_collected: int = 0
    run_duration_seconds: int = 0
    died_to: str = ""


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db), date_filter: str = None, limit: int = 50):
    query = db.query(LeaderboardEntry)
    if date_filter:
        query = query.filter(LeaderboardEntry.date == date_filter)
    else:
        today = date.today().isoformat()
        query = query.filter(LeaderboardEntry.date == today)

    entries = query.order_by(desc(LeaderboardEntry.floor_reached), desc(LeaderboardEntry.score)).limit(limit).all()

    result = []
    for i, entry in enumerate(entries, 1):
        result.append({
            "rank": i,
            "player_name": entry.player_name,
            "floor_reached": entry.floor_reached,
            "enemies_killed": entry.enemies_killed,
            "score": entry.score,
            "died_to": entry.died_to,
        })

    return {"date": date_filter or date.today().isoformat(), "entries": result}


@router.post("/leaderboard", status_code=201)
def submit_entry(data: SubmitEntry, db: Session = Depends(get_db)):
    # Validate seed matches date
    seed_entry = db.query(DailySeed).filter(DailySeed.date == data.date).first()
    if not seed_entry:
        # If no seed for this date yet, create one
        seed_entry = DailySeed(date=data.date, seed=data.seed)
        db.add(seed_entry)
    elif seed_entry.seed != data.seed:
        raise HTTPException(status_code=400, detail="Seed does not match the daily seed for this date")

    # Check for duplicate (same player + same seed)
    existing = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.player_name == data.player_name,
        LeaderboardEntry.seed == data.seed
    ).first()
    if existing:
        # Update if new score is better
        if data.score > existing.score:
            existing.floor_reached = data.floor_reached
            existing.enemies_killed = data.enemies_killed
            existing.score = data.score
            existing.augments_collected = data.augments_collected
            existing.run_duration_seconds = data.run_duration_seconds
            existing.died_to = data.died_to
            db.commit()
        # Calculate rank
        rank = db.query(LeaderboardEntry).filter(
            LeaderboardEntry.date == data.date,
            LeaderboardEntry.score > existing.score
        ).count() + 1
        return {"id": existing.id, "rank": rank}

    entry = LeaderboardEntry(
        player_name=data.player_name,
        seed=data.seed,
        date=data.date,
        floor_reached=data.floor_reached,
        enemies_killed=data.enemies_killed,
        score=data.score,
        augments_collected=data.augments_collected,
        run_duration_seconds=data.run_duration_seconds,
        died_to=data.died_to,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Calculate rank
    rank = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.date == data.date,
        LeaderboardEntry.score > entry.score
    ).count() + 1

    return {"id": entry.id, "rank": rank}
