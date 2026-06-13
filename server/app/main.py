from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import seed, leaderboard, share


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="College Dungeon API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(seed.router, prefix="/api", tags=["seed"])
app.include_router(leaderboard.router, prefix="/api", tags=["leaderboard"])
app.include_router(share.router, prefix="/api", tags=["share"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
