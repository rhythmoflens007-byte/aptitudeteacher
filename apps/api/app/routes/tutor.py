from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import ai
from app.auth import current_user
from app.db.models import Question, TutorMessage, TutorSession, User
from app.db.session import get_db
from app.schemas import TutorMessageIn, TutorMessageOut, TutorSessionIn

router = APIRouter(prefix="/tutor", tags=["tutor"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/heic"}
HISTORY_TURNS = 20


def _load(db: Session, session_id: str, user: User) -> TutorSession:
    session = db.get(TutorSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    return session


def _context(db: Session, session: TutorSession) -> str | None:
    if session.question_id:
        q = db.get(Question, session.question_id)
        if q:
            options = "; ".join(q.options)
            return f"{q.body}\nOptions: {options}\nCorrect answer: {q.correct_option}\nReference solution: {q.explanation}"
    return session.question_text


def _message_out(m: TutorMessage) -> TutorMessageOut:
    return TutorMessageOut(id=m.id, role=m.role, content=m.content, created_at=m.created_at)


def _session_out(db: Session, session: TutorSession) -> dict:
    messages = db.scalars(
        select(TutorMessage).where(TutorMessage.session_id == session.id).order_by(TutorMessage.created_at)
    ).all()
    title = session.question_text
    if session.question_id and (q := db.get(Question, session.question_id)):
        title = q.body
    if not title:
        title = next((m.content for m in messages if m.role == "student"), "New conversation")
    return {
        "id": session.id,
        "title": title[:120],
        "question_id": session.question_id,
        "question_text": session.question_text,
        "started_at": session.started_at,
        "messages": [_message_out(m) for m in messages],
    }


@router.get("/status")
def tutor_status(_: User = Depends(current_user)):
    return {"ai_enabled": ai.enabled()}


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(body: TutorSessionIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if body.question_id and db.get(Question, body.question_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found.")
    session = TutorSession(user_id=user.id, question_id=body.question_id, question_text=body.question_text)
    db.add(session)
    db.commit()
    return _session_out(db, session)


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), user: User = Depends(current_user)):
    sessions = db.scalars(
        select(TutorSession).where(TutorSession.user_id == user.id).order_by(TutorSession.started_at.desc()).limit(30)
    ).all()
    return [{k: v for k, v in _session_out(db, s).items() if k != "messages"} for s in sessions]


@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return _session_out(db, _load(db, session_id, user))


@router.post("/sessions/{session_id}/messages", response_model=TutorMessageOut)
def send_message(
    session_id: str, body: TutorMessageIn, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    session = _load(db, session_id, user)
    db.add(TutorMessage(session_id=session.id, role="student", content=body.content.strip()))
    db.flush()

    history = db.scalars(
        select(TutorMessage)
        .where(TutorMessage.session_id == session.id)
        .order_by(TutorMessage.created_at.desc())
        .limit(HISTORY_TURNS)
    ).all()
    turns = [(m.role, m.content) for m in reversed(history)]
    question = db.get(Question, session.question_id) if session.question_id else None
    content = ai.tutor_reply(turns, _context(db, session), user, question.explanation if question else None)
    reply = TutorMessage(session_id=session.id, role="tutor", content=content)
    db.add(reply)
    db.commit()
    return _message_out(reply)


@router.post("/ocr", status_code=status.HTTP_201_CREATED)
async def ocr(image: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    if image.content_type not in IMAGE_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a PNG, JPEG, WEBP or HEIC photo.")
    data = await image.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Photo is larger than 5 MB. Crop it or take a smaller one.")
    try:
        text = ai.ocr_question(data, image.content_type)
    except ai.AIUnavailable:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Reading photos needs the AI. Add GEMINI_API_KEY to apps/api/.env, or type the question instead.",
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    session = TutorSession(user_id=user.id, question_text=text)
    db.add(session)
    db.commit()
    return _session_out(db, session)
