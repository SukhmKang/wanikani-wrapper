# WaniKani Review App — Project Spec

## What we're building
A personal WaniKani review/lesson client with better UX than the default site. React + Vite PWA frontend, FastAPI backend. Personal tool — single user, no auth layer.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, PWA (manifest + service worker) |
| Backend | FastAPI (Python) |
| STT | OpenAI Whisper API |
| Styling | Tailwind CSS |
| Data | No local cache — fetch fresh from WaniKani API on load |

---

## Environment Variables

Backend `.env`:
```
WANIKANI_API_KEY=...
OPENAI_API_KEY=...
```

Frontend `.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```

---

## Project Structure

```
/
├── frontend/          # React + Vite PWA
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   └── vite.config.js
├── backend/           # FastAPI
│   ├── main.py
│   ├── wanikani.py    # WaniKani API client
│   ├── mnemonics.py   # kanji_mnemonics.json loader
│   └── .env
├── kanji_mnemonics.json
└── CLAUDE.md
```

---

## Backend API (FastAPI)

All WaniKani calls are proxied through the backend so the API key never touches the frontend.

### Endpoints

#### `GET /api/summary`
Returns current lessons and upcoming reviews.
- Proxies WaniKani `GET /summary`
- Response: `{ lessons: [...subject_ids], reviews: [...subject_ids], next_reviews_at }`

#### `GET /api/queue`
Returns the full review/lesson queue with subject data hydrated.
- Query param: `mode=reviews|lessons`
- Fetches assignments (`immediately_available_for_review` or `immediately_available_for_lessons`)
- For each assignment, fetches the subject data
- For each subject, looks up mnemonic from `kanji_mnemonics.json` by `data.characters`
- Returns enriched items (see Item shape below)

#### `GET /api/subjects/{subject_id}`
Returns subject data + mnemonic for a single subject.

#### `POST /api/reviews`
Submits a completed review to WaniKani.
- Body: `{ assignment_id, incorrect_meaning_answers, incorrect_reading_answers }`
- Proxies to WaniKani `POST /reviews`

#### `PUT /api/assignments/{assignment_id}/start`
Starts a lesson (moves assignment from stage 0 → 1).
- Proxies to WaniKani `PUT /assignments/{id}/start`

#### `POST /api/study_materials`
Creates a study material (user synonyms/notes).
- Body: `{ subject_id, meaning_synonyms, meaning_note, reading_note }`

#### `PUT /api/study_materials/{id}`
Updates a study material.
- Body: `{ meaning_synonyms?, meaning_note?, reading_note? }`

#### `GET /api/study_materials`
Returns all user study materials, keyed by subject_id for easy lookup.

#### `POST /api/transcribe`
Transcribes audio using OpenAI Whisper.
- Accepts multipart form: `file` (audio blob), `language` (`ja` or `en`)
- Returns `{ transcript: "..." }`

---

## Enriched Item Shape

This is the core data object the frontend works with:

```typescript
{
  assignment_id: number,
  subject_id: number,
  subject_type: "radical" | "kanji" | "vocabulary" | "kana_vocabulary",
  characters: string,           // the kanji/kana/radical
  level: number,
  srs_stage: number,

  // Meanings
  meanings: Array<{ meaning: string, primary: boolean, accepted_answer: boolean }>,
  auxiliary_meanings: Array<{ meaning: string, type: "whitelist" | "blacklist" }>,
  meaning_mnemonic: string,

  // Readings (empty array for radicals)
  readings: Array<{ reading: string, primary: boolean, accepted_answer: boolean, type?: string }>,

  // Audio (vocabulary only)
  pronunciation_audios: Array<{ url: string, content_type: string, metadata: object }>,

  // Mnemonic from kanji_mnemonics.json (null if not found)
  custom_mnemonic: string | null,

  // User study material (null if none exists yet)
  study_material: {
    id: number,
    meaning_note: string,
    reading_note: string,
    meaning_synonyms: string[]
  } | null
}
```

---

## WaniKani API Client Notes

See `WANIKANI_API.md` for full reference. Key things:

- Every request needs: `Authorization: Bearer {WANIKANI_API_KEY}` and `Wanikani-Revision: 20170710`
- ⚠️ `GET /reviews` and `GET /reviews/{id}` are **deprecated and broken** — always returns empty/404. Only `POST /reviews` works.
- Radicals only have meanings (no readings). `subject_type === "radical"` → skip reading quiz.
- `kana_vocabulary` only has meanings (no readings quiz needed either).
Your frontend just needs to track how many times the user got each part wrong during the session, then send those counts when the item is fully complete. The undo button complicates this slightly — if they undo, you'd want to reset the incorrect count for that part back to what it was before they answered.

---

## Frontend

### Pages / Views

**`/`** — Dashboard
- Shows count of available reviews and lessons
- Two big buttons: "Start Reviews", "Start Lessons"
- Shows `next_reviews_at` if no reviews available

**`/reviews`** and **`/lessons`** — Quiz view (same component, different mode)

### Quiz Flow

WaniKani uses a **rotation system**: meaning and reading are quizzed separately in random order. An item is only "done" once both meaning and reading have been answered correctly (radicals and kana_vocabulary only need meaning).

**State per queue item:**
```
{
  item: EnrichedItem,
  meaning_done: boolean,
  meaning_incorrect_count: number,
  reading_done: boolean,         // always true for radicals/kana_vocab
  reading_incorrect_count: number,
}
```

**Quiz question types:**
- **Meaning**: prompt in English — user types/speaks the English meaning
- **Reading**: prompt in Japanese characters — user types/speaks the hiragana/katakana reading

**Answer evaluation:**
- Meaning correct if input matches any `accepted_answer: true` meaning, OR any meaning in `study_material.meaning_synonyms`, case-insensitive, trimmed
- Meaning incorrect if input matches any `auxiliary_meanings` with `type: "blacklist"` — show specific "that meaning is blacklisted" message
- Reading: compare input kana against `accepted_answer: true` readings. Accept both hiragana and katakana (normalize before comparing).

### Quiz UI Components

**`QuizCard`** — the main card showing:
- Subject characters (large, centered)
- Current question type badge: "Meaning" or "Reading"
- SRS stage indicator
- Answer input (text field)
- Submit button
- Mic button (hold to record, release to transcribe)

**After answer submitted:**
- ✅ Correct: green flash, show mnemonic panel (see below)
- ❌ Wrong: red shake, show mnemonic panel, show correct answer
- "Undo" button appears after any answer — cancels the last answer, re-queues the question, does NOT submit to WaniKani

**Mnemonic panel** (shown after every answer):
- WaniKani `meaning_mnemonic` (strip `<radical>`, `<kanji>`, `<vocabulary>`, `<meaning>`, `<reading>` tags — render the inner text, optionally styled)
- Custom mnemonic from `kanji_mnemonics.json` if available
- User's `meaning_note` / `reading_note` from study materials if set
- "Add synonym" button → inline input to add to `meaning_synonyms`
- Audio play button (vocabulary only) — plays `pronunciation_audios[0]`

**`UndoButton`**
- Visible after answering
- Clicking it: removes the just-submitted answer from local state, re-inserts the question at current position in queue
- Does NOT call `POST /reviews` for that item until both meaning + reading are confirmed (no undo after full item completion)

**Submitting to WaniKani:**
Only call `POST /api/reviews` when BOTH meaning and reading are done for an item (or just meaning for radical/kana_vocab). Pass the accumulated incorrect counts.

For lessons: call `PUT /api/assignments/{id}/start` when the user "learns" the item (before quizzing).

### Dictation

- Hold mic button → start recording via `MediaRecorder` API → release → send blob to `POST /api/transcribe` with appropriate language
- `language=ja` for reading questions, `language=en` for meaning questions
- Transcribed text is inserted into the answer input — user can edit before submitting
- Show a loading spinner on the mic button while transcribing

### Synonyms

- "Add synonym" input appears in the mnemonic panel after answering
- On submit: if `study_material` exists → `PUT /api/study_materials/{id}` with updated `meaning_synonyms` array; if not → `POST /api/study_materials`
- Update local state immediately (optimistic)

---

## Markup Rendering

WaniKani mnemonics contain tags like `<radical>ground</radical>`, `<kanji>One</kanji>`, `<reading>itchy</reading>`. Strip or style these:

```
<radical>x</radical>   → render x with pink/salmon background pill
<kanji>x</kanji>       → render x with pink background pill  
<vocabulary>x</vocabulary> → render x with purple background pill
<meaning>x</meaning>   → render x bold
<reading>x</reading>   → render x bold italic
```

---

## Key UX Details

- Input field should **auto-focus** after each answer is confirmed and the next question loads
- For reading questions, typing in romaji should be converted to hiragana via an IME-style library (e.g. `wanakana`) — this matches WaniKani's own behavior
- The queue should be **shuffled** at the start of each session
- Show progress: "X / Y remaining" in the header
- Lessons mode: show the item info (mnemonic, readings, meanings) BEFORE quizzing, with a "Got it" button to proceed to the quiz portion

---

## Not in scope (v1)

- Local caching / offline support
- Multi-user / auth
- Statistics dashboard
- Extra study mode
- Level progression view