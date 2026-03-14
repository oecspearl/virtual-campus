# Layout 01 — Sequential Module Stream

**Primary platform:** Canvas by Instructure  
**Also seen in:** TalentLMS, Google Classroom, Blackboard Original (Learning Modules)  
**Learner autonomy:** Low (gated progression)  
**Authoring effort:** Moderate  
**Mobile suitability:** High  

---

## Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Canvas]  Introduction to Data Systems  /  Modules       3 / 9 ▓░  │  ← Top bar
├───────────────────┬─────────────────────────────────────────────────┤
│                   │                                                  │
│  COURSE NAVIGATION│  MODULE 1 — Foundations          [3/3 complete] │
│  ─────────────────│  ─────────────────────────────────────────────  │
│  ○  Home          │  [✓] [Page  ] Course overview and objectives     │
│  ●  Modules       │          Page · 5 min                  [Done]   │
│  ○  Assignments   │                                                  │
│  ○  Grades        │  [✓] [Page  ] What is data? Types and structures │
│  ○  Discussions   │          Page · 12 min                 [Done]   │
│  ○  Files         │                                                  │
│                   │  [✓] [Quiz  ] Check your understanding — Quiz 1  │
│  Course progress  │          Quiz · 10 pts                 [Done]   │
│  ████░░░░░ 33%    │                                                  │
│                   │  MODULE 2 — Relational databases   [0/3 · open]  │
│                   │  ─────────────────────────────────────────────  │
│                   │  [►] [Page  ] Tables, rows, and columns          │  ← Current item
│                   │          Page · 15 min · current   [In progress] │
│                   │                                                  │
│                   │  [🔒][Page  ] SQL fundamentals — SELECT and WHERE │  ← Locked
│                   │          Page · 20 min               [Locked]   │
│                   │                                                  │
│                   │  [🔒][Assign] Assignment — design a schema        │
│                   │          50 pts · due Mar 20         [Locked]   │
│                   │                                                  │
│                   │  MODULE 3 — NoSQL and document stores  [locked]  │
│                   │  ─────────────────────────────────────────────  │
│                   │  [🔒][Page  ] When not to use relational DBs      │
│                   │          Page · 18 min               [Locked]   │
│                   │                                                  │
├───────────────────┴─────────────────────────────────────────────────┤
│  [← Previous: Quiz 1]          Item 4 of 9        [Next: SQL fund →]│  ← Footer nav
└─────────────────────────────────────────────────────────────────────┘
```

---

## Structure breakdown

| Zone | Description |
|---|---|
| Top bar | Course title, breadcrumb, item count / progress indicator |
| Left rail | Static course navigation links; progress bar |
| Main area | Modules stacked vertically; each module is a collapsible section |
| Module header | Module title + completion status badge |
| Item row | Type icon · Title · Metadata (duration, pts, due date) · Status badge |
| Lock icon | Item is gated — prerequisite not yet met |
| Footer | Prev / Next navigation buttons + positional indicator (Item N of N) |

---

## Item type icons

| Icon | Type |
|---|---|
| `[Page  ]` | Content page (text, media, embedded H5P) |
| `[Quiz  ]` | Graded or ungraded quiz |
| `[Assign]` | Submission assignment |
| `[Disc  ]` | Discussion forum |
| `[File  ]` | Downloadable resource |
| `[Ext   ]` | External tool (LTI) |

---

## Status states

| State | Indicator | Behaviour |
|---|---|---|
| Done | `[✓]` green dot + Done badge | Item completed; advances module counter |
| In progress | `[►]` blue dot + In progress badge | Current item; footer nav points here |
| Available | `[ ]` grey dot | Accessible but not yet attempted |
| Locked | `[🔒]` + Locked badge | Hidden or greyed; prerequisite rule active |

---

## Gating logic

```
Module 1 complete?
  └─ YES → Module 2 unlocks
       └─ Item 2.1 complete?
            └─ YES → Item 2.2 unlocks
                  └─ Item 2.2 complete?
                       └─ YES → Item 2.3 unlocks
                             └─ Module 2 complete → Module 3 unlocks
```

Instructors configure gating at two levels:
- **Item level** — require view / require score ≥ N% to unlock next item
- **Module level** — require all items complete to unlock next module

---

## Pedagogical model

- Constructivist scaffolding: each item builds on the previous
- Reduces navigation decisions for learner; promotes forward momentum
- Mastery Paths extension (Canvas-specific): branch to different item sequences based on quiz score

---

## Key design constraints

- Single-column vertical scroll for item list — performs well on mobile
- Module list should not exceed 8–10 modules without summary navigation
- Item titles should begin with an action verb: *Read*, *Watch*, *Submit*, *Complete*
- Avoid more than 6–8 items per module; split large topic clusters into sub-modules
- Due dates display inline on assignment rows — critical for learner time management
