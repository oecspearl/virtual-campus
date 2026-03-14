# Layout 03 — Card-Based Catalogue

**Primary platform:** D2L Brightspace, Docebo, Absorb LMS, LinkedIn Learning  
**Also seen in:** TalentLMS, LearnDash, Skilljar, CYPHER Learning  
**Learner autonomy:** High (self-directed discovery and selection)  
**Authoring effort:** Low–Moderate  
**Mobile suitability:** High  

---

## Wireframe — Catalogue homepage

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]  Learning   [Search courses and learning paths…]            │
│          Filters: [Data & Analytics ×]  [Leadership]  [Compliance]  │  ← Tag filters
│                                                       24 results    │
├─────────────────────────────────────────────────────────────────────┤
│  Good afternoon, Royston                                            │
│  You have 2 courses in progress · 1 due this week                  │
├─────────────────────────────────────────────────────────────────────┤
│  [My learning]  [All courses]  [Learning paths]  [Completed]        │  ← Tabs
├─────────────────────────────────────────────────────────────────────┤
│  Recommended for you                                Sort: Relevance  │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  ┌──────────┐   │  │  ┌──────────┐   │  │  ┌──────────┐   │    │
│  │  │ [thumb]  │   │  │  │ [thumb]  │   │  │  │ [thumb]  │   │    │  ← Thumbnail
│  │  │          │   │  │  │          │   │  │  │          │   │    │
│  │  └──────────┘   │  │  └──────────┘   │  │  └──────────┘   │    │
│  │  ████████░░ 60% │  │  ██░░░░░░░░ 20% │  │                 │    │  ← Progress bar
│  │  Data & Analytics│  │  Data & Analytics│  │  Data & Analytics│   │  ← Category
│  │  Foundations of │  │  Applied stats  │  │  SQL for analysts│   │  ← Title
│  │  data literacy  │  │  for decisions  │  │  beginner–inter. │   │
│  │  60% · 4.5 hrs  │  │  20% · 6 hrs   │  │  Not started    │    │
│  │  [In progress]  │  │  [In progress]  │  │  3 hrs          │    │  ← Badge
│  │  Due Mar 20 ⚠   │  │                 │  │  [Recommended]  │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  [thumb]        │  │  [thumb]        │  │                 │    │
│  │  Data & Analytics│  │  Data & Analytics│  │   [+]          │    │
│  │  Building dash- │  │  Introduction to│  │  Browse all     │    │
│  │  boards Power BI│  │  ML concepts    │  │  courses        │    │
│  │  Not started    │  │  Not started    │  │                 │    │
│  │  5.5 hrs        │  │  8 hrs          │  │                 │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe — Course detail page (pre-entry)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Learning  /  Data & Analytics  /  Foundations of data literacy     │
├────────────────────────────────────┬────────────────────────────────┤
│                                    │  ┌──────────────────────────┐  │
│  Foundations of data literacy      │  │   [Course thumbnail]     │  │
│  ─────────────────────────────     │  │                          │  │
│  Data & Analytics  ·  Intermediate │  │  ████████░░  60% done    │  │
│                                    │  │                          │  │
│  This course develops the core     │  │  [Continue learning →]   │  │
│  skills required to collect,       │  │                          │  │
│  interpret, and present data…      │  │  4.5 hours total         │  │
│                                    │  │  Due: March 20           │  │
│  What you will learn               │  │  Certificate on complete │  │
│  • Identify data types             │  └──────────────────────────┘  │
│  • Read and build basic charts     │                                 │
│  • Apply descriptive statistics    │  Skills you will gain           │
│  • Communicate data findings       │  [Data literacy] [Statistics]   │
│                                    │  [Visualisation] [Excel]        │
│  Course contents  (9 lessons)      │                                 │
│  ────────────────────────────      │  Audience                       │
│  Module 1 · Foundations (3)   ▸   │  Analysts, project managers,    │
│  Module 2 · Visualisation (3) ▸   │  non-technical staff            │
│  Module 3 · Statistics (3)    ▸   │                                 │
└────────────────────────────────────┴────────────────────────────────┘
```

---

## Structure breakdown

| Zone | Description |
|---|---|
| Global header | Logo, primary search, user avatar, notifications |
| Filter strip | Tag-based filters (category, level, duration, price); active filters shown as removable chips |
| Hero banner | Personalised greeting + in-progress summary |
| Tab bar | My learning / All courses / Learning paths / Completed |
| Card grid | 3-column responsive grid (collapses to 2 then 1 on smaller screens) |
| Course detail page | Left: description, learning outcomes, curriculum accordion · Right: sticky enrol/continue panel |

---

## Card anatomy

```
┌──────────────────────────┐
│   [Thumbnail image]      │  ← 16:9 image; category colour fallback if no image
│   [Optional: status tag] │  ← "Due Mar 20" / "New" / "Required"
├──────────────────────────┤
│ ████████░░               │  ← Progress bar (hidden if not enrolled)
├──────────────────────────┤
│ CATEGORY LABEL           │  ← 10px uppercase, muted
│ Course title             │  ← 12–14px, 500 weight, 2-line max
│ Status · Duration        │  ← Metadata row
│ [Status badge]           │  ← In progress / Recommended / Required / Done
└──────────────────────────┘
```

---

## Badge / status states

| Badge | Meaning |
|---|---|
| `In progress` | Enrolled; partially complete |
| `Not started` | Enrolled; 0% complete |
| `Recommended` | AI or admin surfaced; not yet enrolled |
| `Required` | Mandatory assignment from manager/admin |
| `Done` | 100% complete; certificate available |
| `Due [date]` | Deadline approaching; shown in amber/red |

---

## Catalogue taxonomy (required before launch)

The card catalogue's utility is entirely dependent on metadata quality. Every course must carry:

| Field | Purpose |
|---|---|
| Category / topic | Primary filter dimension |
| Skill tags | Secondary filter; powers AI recommendation |
| Difficulty level | Beginner / Intermediate / Advanced |
| Duration | Estimated hours / minutes |
| Audience | Role or department target |
| Thumbnail image | Visual identity in the grid |

Without consistent tagging, search returns poor results and the recommendation engine cannot function.

---

## Pedagogical model

- Assumes self-directed learner with existing learning goals
- Platform role shifts from prescribing sequence to enabling discovery
- Recommendation engine (AI-driven in Docebo, Brightspace) personalises surfacing
- Completion and skill data feeds back to learner profile and manager dashboards

---

## Key design constraints

- Grid should be 3 columns at ≥ 900px, 2 columns at ≥ 560px, 1 column below
- Thumbnail aspect ratio must be consistent across all cards (16:9 recommended)
- Course titles must be ≤ 60 characters to avoid truncation in the card
- Progress bars must be hidden on cards for courses not yet enrolled
- "Required" and "Due date" badges must be visually distinct — use amber/red accent
- Avoid more than 5 active filter chips simultaneously — filter strip becomes unreadable
