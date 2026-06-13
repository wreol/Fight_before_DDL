import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any
from app.database import get_db
from app.models import ShareCard

router = APIRouter()


class ShareRequest(BaseModel):
    run_data: dict[str, Any]


@router.post("/share", status_code=201)
def create_share(data: ShareRequest, db: Session = Depends(get_db)):
    card_id = uuid.uuid4().hex[:12]
    card = ShareCard(id=card_id, run_data=data.run_data)
    db.add(card)
    db.commit()
    return {"card_id": card_id, "url": f"/api/share/{card_id}"}


@router.get("/share/{card_id}")
def get_share(card_id: str, db: Session = Depends(get_db)):
    card = db.query(ShareCard).filter(ShareCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="卡片不存在")
    return {"run_data": card.run_data}
