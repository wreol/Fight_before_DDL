from sqlalchemy import Column, Integer, String, Text, JSON
from app.database import Base


class DailySeed(Base):
    __tablename__ = "daily_seed"

    date = Column(String, primary_key=True)  # '2026-06-13'
    seed = Column(String, nullable=False)
    created_at = Column(String, default="")  # datetime('now') in SQLite


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_name = Column(String, nullable=False)
    seed = Column(String, nullable=False)
    date = Column(String, nullable=False)
    floor_reached = Column(Integer, nullable=False, default=0)
    enemies_killed = Column(Integer, default=0)
    score = Column(Integer, default=0)
    augments_collected = Column(Integer, default=0)
    run_duration_seconds = Column(Integer, default=0)
    died_to = Column(String, default="")
    created_at = Column(String, default="")


class ShareCard(Base):
    __tablename__ = "share_card"

    id = Column(String, primary_key=True)  # UUID
    run_data = Column(JSON, nullable=False)
    created_at = Column(String, default="")
