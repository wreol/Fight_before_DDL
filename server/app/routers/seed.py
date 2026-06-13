import secrets
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DailySeed

router = APIRouter()


@router.get("/seed/today")
def get_today_seed(db: Session = Depends(get_db)):
    today = date.today().isoformat()
    existing = db.query(DailySeed).filter(DailySeed.date == today).first()
    if existing:
        return {"date": today, "seed": existing.seed}

    # Generate a new random seed for today
    new_seed = secrets.token_hex(6)
    seed_entry = DailySeed(date=today, seed=new_seed)
    db.add(seed_entry)
    db.commit()
    return {"date": today, "seed": new_seed}
