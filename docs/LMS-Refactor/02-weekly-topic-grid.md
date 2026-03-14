# Layout 02 — Weekly / Topic Grid

**Primary platform:** Moodle  
**Also seen in:** Blackboard Original (Content Areas), OECS Learning Hub, Canvas (week-structured modules)  
**Learner autonomy:** Moderate (open sections; all items accessible within a section)  
**Authoring effort:** Moderate  
**Mobile suitability:** Moderate  

---

## Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Moodle]  EDTC 201: Digital Learning Environments   Semester 1 · Week 7 of 14 │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                   │
│  NAVIGATION      │  ┌──────────────────────────────────────────┐    │
│  ────────────────│  │ General / Course information   Always visible│   │
│  ● Course home   │  ├──────────────────────────────────────────┤    │
│  ○ Participants  │  │  [✓] Course syllabus and assessment guide │    │
│  ○ Grades        │  │  [✓] Introduce yourself — discussion      │    │
│  ○ Forums        │  └──────────────────────────────────────────┘    │
│  ○ Assignments   │                                                   │
│                  │  ┌──────────────────────────────────────────┐    │
│  ACTIVITIES      │  │ Week 5 — Instructional design models     │    │
│  ────────────────│  │                              Feb 17–21   │    │
│  ○ All resources │  ├──────────────────────────────────────────┤    │
│  ○ All quizzes   │  │  [✓] ADDIE and SAM: reading              │    │
│  ○ All forums    │  │  [✓] Video: Bloom's taxonomy revisited   │    │
│                  │  │  [✓] Quiz: Week 5 check-in (10 pts)      │    │
│                  │  └──────────────────────────────────────────┘    │
│                  │                                                   │
│                  │  ╔══════════════════════════════════════════╗    │
│                  │  ║ Week 7 — LMS architecture and platforms  ║    │  ← Current week
│                  │  ║                    Mar 3–7 · Current week║    │
│                  │  ╠══════════════════════════════════════════╣    │
│                  │  ║  [📄] Platform comparison: Canvas,       ║    │
│                  │  ║       Moodle, Brightspace          [New] ║    │
│                  │  ║  [▶] Video lecture: choosing an LMS      ║    │
│                  │  ║       28 min                             ║    │
│                  │  ║  [💬] Discussion: which LMS would you    ║    │
│                  │  ║       choose and why?                    ║    │
│                  │  ║  [📝] Assignment 2: LMS evaluation report║    │
│                  │  ║       due Mar 14                         ║    │
│                  │  ╚══════════════════════════════════════════╝    │
│                  │                                                   │
│                  │  ┌──────────────────────────────────────────┐    │
│                  │  │ Week 8 — Assessment and analytics        │    │
│                  │  │                              Mar 10–14   │    │
│                  │  ├──────────────────────────────────────────┤    │
│                  │  │  [ ] Formative vs summative assessment   │    │
│                  │  │  [ ] Video: learning analytics dashboards│    │
│                  │  └──────────────────────────────────────────┘    │
│                  │                                                   │
│                  │  ┌──────────────────────────────────────────┐    │
│                  │  │ Week 9 — Accessibility and UDL  Mar 17–21│    │
│                  │  │  [ ] Reading · [ ] Activity · [ ] Quiz   │    │
│                  │  └──────────────────────────────────────────┘    │
│                  │                                                   │
└──────────────────┴──────────────────────────────────────────────────┘
```

---

## Structure breakdown

| Zone | Description |
|---|---|
| Top bar | Course title + semester/week indicator |
| Left rail | Standard Moodle course nav + activity type quick links |
| Main area | Vertically scrolling stack of section blocks |
| General section | Always-visible block for perennial resources (syllabus, intro forum) |
| Week/Topic block | Bordered container per section; label = week range or topic title |
| Current week | Visually highlighted (colour, double border, or Moodle highlight flag) |
| Item row | Type icon + title + metadata; no enforced sequence within section |

---

## Section formats (Moodle built-in)

| Format | Section label | Behaviour |
|---|---|---|
| Weekly | Week N · date range | Auto-advances current week highlight |
| Topics | Custom topic title | Instructor-defined; no calendar tie |
| Single activity | One activity per section | Minimal; used for SCORM or H5P wrappers |
| Social | Forum-centred | Entire course built around a single discussion |

### Third-party format plugins

| Plugin | Visual style | Notes |
|---|---|---|
| Grid format | Thumbnail grid of sections | Hybridises Layout 02 with Layout 03 |
| Tiles format | Card tiles with icons | Adds visual richness without changing structure |
| Collapsed topics | Accordion per section | Reduces visual density on long courses |

---

## Item type icons

| Icon | Type |
|---|---|
| `[📄]` | Resource (page, file, URL, book) |
| `[▶]` | Video or media resource |
| `[💬]` | Forum / discussion |
| `[📝]` | Assignment |
| `[❓]` | Quiz |
| `[🔗]` | External tool (LTI) |
| `[✓]` | Completed (activity completion enabled) |

---

## Key differences from Layout 01

| Feature | Layout 01 (Sequential) | Layout 02 (Weekly/Topic Grid) |
|---|---|---|
| All sections visible | No — modules expand one at a time | Yes — entire course visible on page |
| Item sequencing | Enforced (gating rules) | Open (learner chooses order within section) |
| Current position highlight | Item-level (blue border) | Section-level (highlighted week block) |
| Calendar integration | Due dates on items | Section labels carry date range |
| Footer navigation | Prev / Next between items | None by default; learner navigates via section list |

---

## Pedagogical model

- Episodic learning rhythm aligned to the academic calendar
- Transparency: learners can see the full course scope from day one
- Self-regulation is expected; no gating prevents non-linear access
- Best paired with explicit weekly learning objectives at section header

---

## Key design constraints

- Section names should be concise and descriptive — avoid generic labels like "Week 1"
- Add a short introductory text block at the top of each section to contextualise items
- Keep item counts per section to 4–8; beyond that, use a nested Page resource or Book
- Ensure the General section is not overloaded — move reference materials to a dedicated Resource section
- Enable activity completion tracking to give learners visible progress indicators even without gating
- Test rendering with Collapsed Topics plugin if course exceeds 10 sections — reduces scroll fatigue
