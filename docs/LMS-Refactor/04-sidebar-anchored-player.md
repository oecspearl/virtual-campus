# Layout 04 — Sidebar-Anchored Lesson Player

**Primary platform:** Blackboard Ultra (Anthology), Absorb LMS  
**Also seen in:** Adobe Learning Manager (Captivate Prime), Docebo, LearnUpon, SCORM-packaged content (Articulate Storyline, iSpring)  
**Learner autonomy:** Moderate (guided; non-linear jump available via sidebar)  
**Authoring effort:** High  
**Mobile suitability:** Moderate (sidebar collapses to hamburger on small screens)  

---

## Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  [▣]  EDTC 201 / Digital Learning Environments      Grades   Help   │  ← Dark top bar
├──────────────────────┬──────────────────────────────────────────────┤
│                      │                                              │
│  COURSE CONTENT      │  Blackboard Ultra deep dive                  │  ← Lesson title
│  ────────────────────│  Unit 2, Lesson 3 · Page · Est. 20 min · 0 pts│
│                      ├──────────────────────────────────────────────┤
│  ▾ Unit 1 — Foundations        │                                    │
│    [✓] Course introduction     │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│    [✓] What is an LMS?         │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  ← Content area
│    [✓] Quiz: foundations check │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │    (placeholder
│                                │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░     │     text blocks)
│  ▾ Unit 2 — Platforms          │                                    │
│    [✓] Canvas architecture     │  ┌──────────────────────────────┐ │
│    [✓] Moodle and open source  │  │                              │ │
│  ► [●] Blackboard Ultra        │  │   ▶  Video lecture — 18 min  │ │  ← Media embed
│    [ ] D2L Brightspace         │  │                              │ │
│    [ ] Assignment: compare     │  └──────────────────────────────┘ │
│                                │                                    │
│  ▸ Unit 3 — Assessment         │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ▸ Unit 4 — Analytics          │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                │                                    │
│                                │  ┌──────────────────────────────┐ │
│  ────────────────────          │  │  Embedded activity           │ │  ← Inline activity
│  Overall progress              │  │  What are the key differences│ │
│  ███████░░░░░░ 50%             │  │  between BB Original & Ultra?│ │
│  7 of 14 lessons               │  └──────────────────────────────┘ │
│                                │                                    │
├────────────────────────────────┴──────────────────────────────────  │
│  [← Moodle and open source]     Lesson 6 of 14   [D2L Brightspace →]│  ← Footer nav
└─────────────────────────────────────────────────────────────────────┘
```

---

## Sidebar detail

```
COURSE CONTENT
──────────────────────────────────
▾ Unit 1 — Foundations
  [✓] Course introduction          ← Done: green dot
  [✓] What is an LMS?              ← Done: green dot
  [✓] Quiz: foundations check      ← Done: green dot

▾ Unit 2 — Platforms
  [✓] Canvas architecture          ← Done
  [✓] Moodle and open source       ← Done
► [●] Blackboard Ultra deep dive   ← ACTIVE: blue highlight + arrow
  [ ] D2L Brightspace overview     ← Available: grey dot
  [ ] Assignment: platform compare ← Available: grey dot

▸ Unit 3 — Assessment              ← Collapsed (click to expand)
▸ Unit 4 — Analytics               ← Collapsed

──────────────────────────────────
Overall progress
████████░░░░░░  50%
7 of 14 lessons
```

---

## Structure breakdown

| Zone | Description |
|---|---|
| Top bar | Platform logo, course identifier, utility links (Grades, Help) |
| Sidebar (left or right) | Persistent course map; collapsible unit folders; active lesson highlighted |
| Content top bar | Lesson title, breadcrumb, type, duration, point value |
| Main content pane | Renders lesson content — text, media, interactive elements, embedded activities |
| Footer nav | Prev / Next buttons with lesson names; positional counter |

---

## Sidebar states

| Indicator | Meaning |
|---|---|
| `[✓]` green dot | Lesson completed |
| `[●]` blue dot + `►` | Current active lesson |
| `[ ]` grey dot | Available; not yet visited |
| `[🔒]` | Locked (if gating enabled) |
| `▾` folder open | Unit expanded; children visible |
| `▸` folder closed | Unit collapsed; click to reveal |

---

## Content pane element types

| Element | Rendered as |
|---|---|
| Text content | Scrollable rich text (headings, paragraphs, lists, tables) |
| Media embed | Inline video/audio player with progress tracking |
| Image with caption | Inline image block |
| Embedded activity | Bordered call-out box — reflection prompt, poll, H5P widget |
| SCORM object | Full-width iframe with internal SCORM navigation |
| Assignment link | CTA block — "Submit your work" button linking to submission page |
| Discussion prompt | Inline forum thread preview + reply input |

---

## Absorb LMS course player modes

Absorb LMS offers four named player layout variants within this paradigm:

| Mode | Description |
|---|---|
| Combined | Details pane + sidebar + content pane all visible simultaneously |
| Sidebar | Only sidebar + content pane; details hidden |
| Details | Only details pane below content; no sidebar |
| Compact | Content pane almost full-width; sidebar hidden until triggered |

---

## Mobile behaviour

On screens below ~768px the sidebar collapses entirely. Learner accesses course map via a hamburger icon (☰) that opens an overlay drawer. Footer Prev/Next navigation remains the primary way to advance. This means mobile learners experience a de facto Sequential Module Stream (Layout 01) — the persistent map is lost.

Design recommendation: if mobile is a primary access mode, consider Layout 01 or Layout 03 instead, or ensure the sidebar overlay is accessible and well-labelled.

---

## SCORM interaction

When a SCORM package is loaded inside the sidebar player:

```
Outer LMS sidebar          Inner SCORM table of contents
──────────────────         ──────────────────────────────
▾ Module 3 — SCORM         Lesson 1: Introduction       [✓]
  [●] SCORM object  →      Lesson 2: Core concepts      [●]
  [ ] Quiz          │      Lesson 3: Case study         [ ]
                    │      Lesson 4: Assessment         [ ]
                    │
                    └──── Rendered in SCORM iframe (right pane)
```

This creates a nested two-level navigation: the LMS sidebar governs units; the SCORM TOC governs lessons within the SCORM object. Ensure both are visible simultaneously where screen width allows.

---

## Pedagogical model

- Cognitive load management: persistent course map reduces disorientation in complex hierarchies
- Supports non-linear review — learner can jump to any completed lesson via sidebar without losing current position
- Separation of navigation (sidebar) and content (main pane) reduces dual-task interference
- Strong fit with Mayer's signalling principle: spatial structure conveys course architecture

---

## Key design constraints

- Sidebar width: 200–240px optimal; below 180px text truncates; above 260px content pane is too narrow
- Sidebar must carry meaningful lesson titles — generic labels ("Lesson 1", "Lesson 2") negate its navigational value
- Content pane minimum width: 480px; below this, wide media (video, tables) breaks layout
- Avoid more than 3 levels of nesting in the sidebar (Unit > Lesson > Sub-lesson is maximum)
- Sidebar collapse on mobile is unavoidable — test the hamburger drawer on actual devices
- Progress bar at sidebar footer must reflect granular completion, not just unit count
