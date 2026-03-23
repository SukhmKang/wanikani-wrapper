import logging
import os
from datetime import datetime, timezone
from typing import Any

import pykakasi

log = logging.getLogger(__name__)
_kakasi = pykakasi.kakasi()

def _to_hiragana(text: str) -> str:
    """Convert a Japanese string (kanji/katakana/mixed) to hiragana."""
    return "".join(item["hira"] for item in _kakasi.convert(text))

from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Re-apply API_KEY after dotenv loads (wanikani.py reads os.getenv at import time,
# so we patch it here after the env is populated)
import wanikani as wk

wk.API_KEY = os.getenv("WANIKANI_API_KEY", "")

import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from mnemonics import get_kanji_mnemonics

MAX_DAILY_LESSONS = 20

app = FastAPI(title="WaniKani Review App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ReviewBody(BaseModel):
    assignment_id: int
    incorrect_meaning_answers: int = 0
    incorrect_reading_answers: int = 0


class StudyMaterialCreateBody(BaseModel):
    subject_id: int
    meaning_synonyms: list[str] = []
    meaning_note: str = ""
    reading_note: str = ""


class StudyMaterialUpdateBody(BaseModel):
    meaning_synonyms: list[str] | None = None
    meaning_note: str | None = None
    reading_note: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_subject_data(raw_subject: dict) -> dict:
    """Flatten a raw WaniKani subject API response into a simpler dict."""
    sid = raw_subject["id"]
    stype = raw_subject["object"]
    d = raw_subject["data"]

    characters = d.get("characters") or d.get("slug", "")

    meanings = [
        {
            "meaning": m["meaning"],
            "primary": m["primary"],
            "accepted_answer": m["accepted_answer"],
        }
        for m in d.get("meanings", [])
    ]

    auxiliary_meanings = [
        {"meaning": m["meaning"], "type": m["type"]}
        for m in d.get("auxiliary_meanings", [])
    ]

    readings = [
        {
            "reading": r["reading"],
            "primary": r["primary"],
            "accepted_answer": r["accepted_answer"],
            **({"type": r["type"]} if "type" in r else {}),
        }
        for r in d.get("readings", [])
    ]

    pronunciation_audios = [
        {
            "url": a["url"],
            "content_type": a["content_type"],
            "metadata": a.get("metadata", {}),
        }
        for a in d.get("pronunciation_audios", [])
    ]

    return {
        "subject_id": sid,
        "subject_type": stype,
        "characters": characters,
        "level": d.get("level", 0),
        "meanings": meanings,
        "auxiliary_meanings": auxiliary_meanings,
        "meaning_mnemonic": d.get("meaning_mnemonic", "") or "",
        "reading_mnemonic": d.get("reading_mnemonic", "") or "",
        "readings": readings,
        "pronunciation_audios": pronunciation_audios,
        "kanji_mnemonics": get_kanji_mnemonics(characters),
    }


async def _fetch_subjects_by_ids(subject_ids: list[int]) -> dict[int, dict]:
    """Batch-fetch subjects by their IDs (chunked to keep URL length sane)."""
    if not subject_ids:
        return {}

    subjects: dict[int, dict] = {}
    chunk_size = 500

    for i in range(0, len(subject_ids), chunk_size):
        chunk = subject_ids[i : i + chunk_size]
        ids_param = ",".join(str(s) for s in chunk)
        raw_list = await wk.get_all_pages(
            f"{wk.WANIKANI_BASE}/subjects",
            params={"ids": ids_param},
        )
        for raw in raw_list:
            subjects[raw["id"]] = _extract_subject_data(raw)

    return subjects


async def _count_lessons_started_today() -> int:
    """Count assignments that were started today (UTC), to respect the daily lesson cap."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    assignments = await wk.get_all_pages(
        f"{wk.WANIKANI_BASE}/assignments",
        params={"updated_after": today_start.isoformat()},
    )
    count = 0
    for a in assignments:
        started_at = a["data"].get("started_at")
        if started_at:
            started_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            if started_dt >= today_start:
                count += 1
    return count


async def _fetch_study_materials_map() -> dict[int, dict]:
    """Fetch all study materials and return a dict keyed by subject_id."""
    raw_list = await wk.get_all_pages(f"{wk.WANIKANI_BASE}/study_materials")
    return _parse_study_materials(raw_list)


async def _fetch_study_materials_for_ids(subject_ids: list[int]) -> dict[int, dict]:
    """Fetch study materials only for specific subject IDs."""
    ids_param = ",".join(str(i) for i in subject_ids)
    raw_list = await wk.get_all_pages(
        f"{wk.WANIKANI_BASE}/study_materials",
        params={"subject_ids": ids_param},
    )
    return _parse_study_materials(raw_list)


def _parse_study_materials(raw_list: list[dict]) -> dict[int, dict]:
    result: dict[int, dict] = {}
    for raw in raw_list:
        d = raw["data"]
        result[d["subject_id"]] = {
            "id": raw["id"],
            "subject_id": d["subject_id"],
            "meaning_note": d.get("meaning_note", "") or "",
            "reading_note": d.get("reading_note", "") or "",
            "meaning_synonyms": d.get("meaning_synonyms", []) or [],
        }
    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/summary")
async def get_summary() -> dict:
    try:
        resp = await wk.get_one("/summary")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    data = resp.get("data", {})
    now = datetime.now(timezone.utc)

    def parse_dt(s: str | None):
        if not s:
            return None
        return datetime.fromisoformat(s.replace("Z", "+00:00"))

    # Only include buckets that are already available (available_at <= now)
    lesson_subject_ids: list[int] = []
    for bucket in data.get("lessons", []):
        available_at = parse_dt(bucket.get("available_at"))
        if available_at and available_at <= now:
            lesson_subject_ids.extend(bucket.get("subject_ids", []))

    review_subject_ids: list[int] = []
    for bucket in data.get("reviews", []):
        available_at = parse_dt(bucket.get("available_at"))
        if available_at and available_at <= now:
            review_subject_ids.extend(bucket.get("subject_ids", []))

    lessons_done_today = await _count_lessons_started_today()
    remaining_lessons = max(0, MAX_DAILY_LESSONS - lessons_done_today)

    return {
        "lessons": lesson_subject_ids[:remaining_lessons],
        "reviews": review_subject_ids,
        "next_reviews_at": data.get("next_reviews_at"),
    }


@app.get("/api/assignments")
async def get_assignments(mode: str = "reviews") -> list[dict]:
    """Lightweight endpoint — returns assignment IDs only, no subject hydration."""
    if mode not in ("reviews", "lessons"):
        raise HTTPException(status_code=400, detail="mode must be 'reviews' or 'lessons'")
    try:
        if mode == "reviews":
            raw = await wk.get_one(
                "/assignments",
                params={"immediately_available_for_review": "true", "per_page": REVIEW_BATCH_SIZE},
            )
            assignments = raw.get("data", [])
        else:
            all_assignments = await wk.get_all_pages(
                f"{wk.WANIKANI_BASE}/assignments",
                params={"immediately_available_for_lessons": "true"},
            )
            lessons_done_today = await _count_lessons_started_today()
            remaining = max(0, MAX_DAILY_LESSONS - lessons_done_today)
            assignments = all_assignments[:remaining]
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    return [
        {"assignment_id": a["id"], "subject_id": a["data"]["subject_id"], "srs_stage": a["data"]["srs_stage"]}
        for a in assignments
    ]


@app.get("/api/subjects/batch")
async def get_subjects_batch(ids: str) -> list[dict]:
    """Fetch enriched subject data for a comma-separated list of subject IDs."""
    try:
        subject_ids = [int(i.strip()) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="ids must be comma-separated integers")
    if not subject_ids:
        return []
    try:
        subjects_map = await _fetch_subjects_by_ids(subject_ids)
        study_materials_map = await _fetch_study_materials_for_ids(subject_ids)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    return [
        {**subjects_map[sid], "study_material": study_materials_map.get(sid)}
        for sid in subject_ids
        if sid in subjects_map
    ]


@app.get("/api/level")
async def get_level() -> dict:
    try:
        progressions = await wk.get_all_pages(f"{wk.WANIKANI_BASE}/level_progressions")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    if not progressions:
        return {"level": 1, "started_at": None, "passed_at": None}

    current = progressions[-1]["data"]
    return {
        "level": current["level"],
        "started_at": current.get("started_at"),
        "passed_at": current.get("passed_at"),
    }


REVIEW_BATCH_SIZE = 50


@app.get("/api/queue")
async def get_queue(mode: str = "reviews") -> list[dict]:
    if mode not in ("reviews", "lessons"):
        raise HTTPException(status_code=400, detail="mode must be 'reviews' or 'lessons'")

    try:
        if mode == "reviews":
            # Only fetch one page capped at REVIEW_BATCH_SIZE — no need to load all 400+
            raw = await wk.get_one(
                "/assignments",
                params={"immediately_available_for_review": "true", "per_page": REVIEW_BATCH_SIZE},
            )
            assignments = raw.get("data", [])
        else:
            all_lesson_assignments = await wk.get_all_pages(
                f"{wk.WANIKANI_BASE}/assignments",
                params={"immediately_available_for_lessons": "true"},
            )
            lessons_done_today = await _count_lessons_started_today()
            remaining_lessons = max(0, MAX_DAILY_LESSONS - lessons_done_today)
            assignments = all_lesson_assignments[:remaining_lessons]
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    if not assignments:
        return []

    subject_ids = [a["data"]["subject_id"] for a in assignments]

    try:
        subjects_map = await _fetch_subjects_by_ids(subject_ids)
        study_materials_map = await _fetch_study_materials_map()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    enriched: list[dict] = []
    for assignment in assignments:
        ad = assignment["data"]
        sid = ad["subject_id"]
        subject = subjects_map.get(sid)
        if subject is None:
            continue

        item = {
            "assignment_id": assignment["id"],
            "subject_id": sid,
            "subject_type": subject["subject_type"],
            "characters": subject["characters"],
            "level": subject["level"],
            "srs_stage": ad.get("srs_stage", 0),
            "meanings": subject["meanings"],
            "auxiliary_meanings": subject["auxiliary_meanings"],
            "meaning_mnemonic": subject["meaning_mnemonic"],
            "readings": subject["readings"],
            "pronunciation_audios": subject["pronunciation_audios"],
            "custom_mnemonic": subject["custom_mnemonic"],
            "study_material": study_materials_map.get(sid),
        }
        enriched.append(item)

    return enriched


@app.get("/api/subjects/{subject_id}")
async def get_subject(subject_id: int) -> dict:
    try:
        raw = await wk.get_one(f"/subjects/{subject_id}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    subject = _extract_subject_data(raw)

    # Fetch study material for this subject if it exists
    try:
        raw_sm_list = await wk.get_all_pages(
            f"{wk.WANIKANI_BASE}/study_materials",
            params={"subject_ids": str(subject_id)},
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    study_material = None
    if raw_sm_list:
        sm = raw_sm_list[0]
        sd = sm["data"]
        study_material = {
            "id": sm["id"],
            "subject_id": sd["subject_id"],
            "meaning_note": sd.get("meaning_note", "") or "",
            "reading_note": sd.get("reading_note", "") or "",
            "meaning_synonyms": sd.get("meaning_synonyms", []) or [],
        }

    subject["study_material"] = study_material
    return subject


@app.post("/api/reviews")
async def create_review(body: ReviewBody) -> dict:
    payload = {
        "review": {
            "assignment_id": body.assignment_id,
            "incorrect_meaning_answers": body.incorrect_meaning_answers,
            "incorrect_reading_answers": body.incorrect_reading_answers,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    }
    try:
        return await wk.post("/reviews", payload)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@app.put("/api/assignments/{assignment_id}/start")
async def start_assignment(assignment_id: int) -> dict:
    try:
        return await wk.put(f"/assignments/{assignment_id}/start", {})
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@app.post("/api/study_materials")
async def create_study_material(body: StudyMaterialCreateBody) -> dict:
    payload = {
        "study_material": {
            "subject_id": body.subject_id,
            "meaning_synonyms": body.meaning_synonyms,
            "meaning_note": body.meaning_note,
            "reading_note": body.reading_note,
        }
    }
    try:
        return await wk.post("/study_materials", payload)
    except httpx.HTTPStatusError as e:
        if e.response.status_code != 422:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        # Already exists — fetch it and PUT instead
        existing = await wk.get_all_pages(
            f"{wk.WANIKANI_BASE}/study_materials",
            params={"subject_ids": str(body.subject_id)},
        )
        if not existing:
            raise HTTPException(status_code=422, detail=e.response.text)
        sm_id = existing[0]["id"]
        update: dict = {}
        if body.meaning_synonyms is not None:
            update["meaning_synonyms"] = body.meaning_synonyms
        if body.meaning_note is not None:
            update["meaning_note"] = body.meaning_note
        if body.reading_note is not None:
            update["reading_note"] = body.reading_note
        result = await wk.put(f"/study_materials/{sm_id}", {"study_material": update})
        result["data"] = {**result.get("data", {}), "id": sm_id}
        return result


@app.put("/api/study_materials/{study_material_id}")
async def update_study_material(study_material_id: int, body: StudyMaterialUpdateBody) -> dict:
    update: dict[str, Any] = {}
    if body.meaning_synonyms is not None:
        update["meaning_synonyms"] = body.meaning_synonyms
    if body.meaning_note is not None:
        update["meaning_note"] = body.meaning_note
    if body.reading_note is not None:
        update["reading_note"] = body.reading_note

    payload = {"study_material": update}
    try:
        return await wk.put(f"/study_materials/{study_material_id}", payload)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@app.get("/api/study_materials")
async def get_study_materials() -> dict[str, dict]:
    try:
        raw_list = await wk.get_all_pages(f"{wk.WANIKANI_BASE}/study_materials")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))

    result: dict[str, dict] = {}
    for raw in raw_list:
        d = raw["data"]
        sid = d["subject_id"]
        result[str(sid)] = {
            "id": raw["id"],
            "subject_id": sid,
            "meaning_note": d.get("meaning_note", "") or "",
            "reading_note": d.get("reading_note", "") or "",
            "meaning_synonyms": d.get("meaning_synonyms", []) or [],
        }
    return result


class CheckMeaningBody(BaseModel):
    user_answer: str
    accepted_meanings: list[str]
    characters: str
    subject_type: str


@app.post("/api/check_meaning")
async def check_meaning(body: CheckMeaningBody) -> dict:
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        return {"accepted": False}

    meanings_str = ", ".join(f'"{m}"' for m in body.accepted_meanings)
    prompt = (
        f'A student is answering a Japanese {body.subject_type} meaning question for "{body.characters}".\n'
        f"Accepted meanings: {meanings_str}\n"
        f'Student answered: "{body.user_answer}"\n\n'
        "Should this answer be accepted? Say YES if it matches or is very close to an accepted meaning (typos, misspellings, close synonyms). "
        "In addition to the list, you may also use your knowledge of Japanese to accept answers that are clearly correct translations. "
        "Say NO if the answer is wrong or a stretch. "
        "Reply with exactly one word: yes or no."
    )

    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=anthropic_key)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=5,
            messages=[{"role": "user", "content": prompt}],
        )
        reply = message.content[0].text.strip().lower()
        return {"accepted": reply.startswith("yes")}
    except Exception as e:
        log.warning("check_meaning failed: %s", e)
        return {"accepted": False}


@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(...),
) -> dict:
    openai_api_key = os.getenv("OPENAI_API_KEY", "")
    if not openai_api_key or openai_api_key == "your_openai_key_here":
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    if language not in ("ja", "en"):
        raise HTTPException(status_code=400, detail="language must be 'ja' or 'en'")

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=openai_api_key)
        audio_bytes = await file.read()

        transcription = await client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=(file.filename or "audio.webm", audio_bytes, file.content_type or "audio/webm"),
            language=language,
        )
        text = transcription.text
        if language == "ja":
            text = _to_hiragana(text)
        return {"transcript": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ---------------------------------------------------------------------------
# Bunpro API
# ---------------------------------------------------------------------------

BUNPRO_API_BASE = "https://api.bunpro.jp/api/frontend"


def _bunpro_headers() -> dict:
    token = os.getenv("BUNPRO_API_TOKEN", "")
    return {
        "Authorization": f"Token token={token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _parse_bunpro_item(attempt: dict) -> dict | None:
    data = attempt.get("data", {})
    attrs = data.get("attributes", {})
    included = attempt.get("included", [])
    sq = next((i for i in included if i.get("type") == "study_question"), None)
    if not sq:
        return None
    sq_attrs = sq.get("attributes", {})
    return {
        "review_id": int(data["id"]),
        "reviewable_type": attrs.get("reviewable_type", ""),
        "streak": attrs.get("streak", 0),
        "accuracy": attrs.get("accuracy", 0),
        "study_question": {
            "id": int(sq["id"]),
            "content": sq_attrs.get("content", ""),
            "answer": sq_attrs.get("answer", ""),
            "alternate_grammar": sq_attrs.get("alternate_grammar") or [],
            "kanji_answer": sq_attrs.get("kanji_answer", ""),
            "kanji_alt_grammar": sq_attrs.get("kanji_alt_grammar") or [],
            "translation": sq_attrs.get("translation", ""),
            "nuance": sq_attrs.get("nuance", ""),
            "nuance_translation": sq_attrs.get("nuance_translation", ""),
            "male_audio_url": sq_attrs.get("male_audio_url", ""),
            "female_audio_url": sq_attrs.get("female_audio_url", ""),
            "level": sq_attrs.get("level", ""),
        },
    }


@app.get("/api/bunpro/due")
async def bunpro_due() -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BUNPRO_API_BASE}/user/due", headers=_bunpro_headers())
        if not r.is_success:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()


@app.get("/api/bunpro/queue")
async def bunpro_queue() -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BUNPRO_API_BASE}/reviews/quiz_index", headers=_bunpro_headers())
        if not r.is_success:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        data = r.json()
        session_id = data.get("review_session_id")
        attempts = data.get("pending_attempt", [])
        items = [_parse_bunpro_item(a) for a in attempts]
        items = [i for i in items if i is not None]
        return {"review_session_id": session_id, "items": items}


class BunproUpdateBody(BaseModel):
    review_session_id: int
    correct: bool


class BunproAnalyzeBody(BaseModel):
    user_answer: str
    correct_answer: str
    sentence: str
    translation: str
    reviewable_type: str = ""  # "GrammarPoint" | "Vocabulary" | ""
    nuance_translation: str = ""


def _strip_html(text: str) -> str:
    import re
    return re.sub(r'<[^>]+>', '', text or '')


@app.post("/api/bunpro/analyze")
async def bunpro_analyze(body: BunproAnalyzeBody) -> dict:
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        raise HTTPException(status_code=503, detail="AI not configured")

    import re
    clean_sentence = re.sub(r"<span[^>]*study-area-input[^>]*>.*?</span>", f"[{body.correct_answer}]", body.sentence, flags=re.IGNORECASE)
    clean_sentence = _strip_html(clean_sentence)
    clean_translation = _strip_html(body.translation)

    is_vocab = "vocab" in body.reviewable_type.lower()
    item_kind = "vocabulary word" if is_vocab else "grammar pattern"
    confusion_label = "similar-sounding words or kanji" if is_vocab else "similar grammar patterns"

    prompt = (
        f"A Japanese learner is reviewing {item_kind}s on Bunpro (SRS flashcard app).\n\n"
        f"Sentence (correct answer filled in): {clean_sentence}\n"
        f"English translation: {clean_translation}\n"
        f"Correct answer: {body.correct_answer}\n"
        f"Learner's answer: {body.user_answer}\n"
    )
    if body.nuance_translation:
        prompt += f"Explanation: {_strip_html(body.nuance_translation)}\n"

    prompt += (
        f"\nPlease address these 3 things concisely (keep total response under 150 words):\n"
        f"1. Is the learner's answer actually valid/natural in this context? (yes/no and brief reason)\n"
        f"2. What is the key nuance or usage difference between their answer and the correct one?\n"
        f"3. Are they likely confusing this with {confusion_label}? If so, give a quick tip to tell them apart.\n"
        "\nWrite in plain English. Be direct, specific, and practical."
    )

    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=anthropic_key)
        message = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"feedback": message.content[0].text.strip()}
    except Exception as e:
        log.warning("bunpro_analyze failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/bunpro/reviews/{review_id}/update")
async def bunpro_update_review(review_id: int, body: BunproUpdateBody) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{BUNPRO_API_BASE}/reviews/{review_id}/update",
            headers=_bunpro_headers(),
            json={
                "review_session_id": body.review_session_id,
                "correct": body.correct,
                "fsrs_input": None,
                "loaded_review_ids": None,
                "loaded_ghost_review_ids": None,
                "loaded_self_study_review_ids": None,
                "deck_id": None,
                "only_review": None,
            },
        )
        if not r.is_success:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json() or {} if r.content else {}


if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    uvicorn.run('main:app', host='0.0.0.0', port=port)
