-- ============================================================================
-- Part 45: Personalised Course Builder — schema + seeded concept taxonomy
-- ============================================================================
-- Depends on: 001 (tenants, users, current_tenant_id, update_updated_at_column),
--             002 (lessons, courses),
--             044 (feature flags)
-- ============================================================================
-- Schema that backs the Personalised Course Builder. Five tables:
--
--   * concepts                       — global controlled vocabulary used to
--                                      tag lessons by topic and prerequisite
--   * lesson_concepts                — tenant-scoped junction: which concepts
--                                      a lesson teaches or assumes
--   * personalised_courses           — a learner's assembled path (draft or
--                                      active), with LLM-produced syllabus,
--                                      objectives, gaps and conflicts
--   * personalised_course_lessons    — ordered sequence of items within a
--                                      personalised course; an item is either
--                                      a learner-selected lesson or an
--                                      LLM-recommended addition
--   * personalised_course_requests   — audit + cost log for every LLM call,
--                                      and the data source the rate-limiter
--                                      reads to enforce 10 requests/hour/learner
--
-- Design notes:
--
-- 1. `concepts` is intentionally GLOBAL (no tenant_id). The controlled
--    vocabulary needs to be consistent across tenants for predictable LLM
--    behaviour. Tenant-private concept extensions are a future iteration.
--
-- 2. `personalised_course_lessons.lesson_id` is nullable with ON DELETE SET
--    NULL, paired with `lesson_title_snapshot` captured at insert. If a
--    lesson is later deleted, the personalised course retains a label and
--    can be flagged for learner review — the path is not silently corrupted
--    (which a cascade would do) and lesson deletion is not blocked globally
--    (which restrict would do). This pairs with the cascade behaviour added
--    in migration 042.
--
-- 3. `personalised_course_requests` doubles as the audit log AND the
--    rate-limit data source. A learner is allowed at most 10 successful or
--    attempted-but-failed requests per rolling hour; counts come from
--    `SELECT count(*) WHERE learner_id = X AND created_at > now() - '1 hour'`.
--    Storing the call log in postgres avoids a separate Redis dependency.
--
-- 4. Status is `draft | active | archived`. The spec's `approved` and
--    `active` states are collapsed: approval IS activation. `approved_at`
--    captures the timestamp; `status` captures the lifecycle.
--
-- All tenant-scoped tables follow the standard pattern: tenant_id NOT NULL
-- defaulting to the seed tenant, with RLS policies restricting reads to
-- (tenant_id = current_tenant_id() AND learner_id = auth.uid()) for learner-
-- owned rows. The API layer uses TenantFilteredQuery which bypasses RLS via
-- the service role; these policies protect direct-client access (realtime
-- subscriptions, anon reads).
--
-- This migration is idempotent: re-running it is a no-op.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

-- 1.1 Controlled concept vocabulary (global).
CREATE TABLE IF NOT EXISTS public.concepts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.concepts IS
  'Global controlled vocabulary for tagging lessons. Used by the LLM to reason about prerequisites, sequencing, and gaps. Slug is the stable key; label is the display name.';
COMMENT ON COLUMN public.concepts.slug IS
  'Stable kebab-case identifier (e.g. "machine-learning-fundamentals"). The LLM is told to use these slugs verbatim when referring to concepts.';
COMMENT ON COLUMN public.concepts.category IS
  'Optional grouping for the (future) taxonomy admin UI: e.g. "bloom", "foundational", "computing", "data-science".';

-- 1.2 Lesson <-> concept junction (tenant-scoped because lessons are).
CREATE TABLE IF NOT EXISTS public.lesson_concepts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
             DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE RESTRICT,
  relation   TEXT NOT NULL DEFAULT 'topic'
             CHECK (relation IN ('topic', 'prerequisite')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_concepts_unique UNIQUE (lesson_id, concept_id, relation)
);

COMMENT ON TABLE public.lesson_concepts IS
  'Which concepts a lesson teaches (relation=topic) or assumes the learner already knows (relation=prerequisite). Used by the Personalised Course Builder to validate sequencing and recommend gap-filling lessons.';
COMMENT ON COLUMN public.lesson_concepts.relation IS
  '"topic" = the lesson teaches this concept. "prerequisite" = the lesson assumes the learner already understands this concept.';

-- 1.3 Personalised courses (a learner's assembled path).
CREATE TABLE IF NOT EXISTS public.personalised_courses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
                      DEFAULT '00000000-0000-0000-0000-000000000001',
  learner_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  learner_goal        TEXT NOT NULL
                      CHECK (length(trim(learner_goal)) BETWEEN 10 AND 500),
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'active', 'archived')),
  generated_syllabus  TEXT,
  inferred_objectives TEXT[] NOT NULL DEFAULT '{}',
  flagged_gaps        TEXT[] NOT NULL DEFAULT '{}',
  flagged_conflicts   TEXT[] NOT NULL DEFAULT '{}',
  llm_provider        TEXT,
  llm_model           TEXT,
  prompt_version      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at         TIMESTAMPTZ
);

COMMENT ON TABLE public.personalised_courses IS
  'A learner-assembled course. Created in status=draft when the LLM responds; transitions to status=active when the learner approves. Approval IS activation — the spec''s separate "approved" status is collapsed into approved_at + status=active.';
COMMENT ON COLUMN public.personalised_courses.learner_goal IS
  'Free-text goal the learner stated. 10–500 chars after trim. Fed verbatim into the LLM prompt.';
COMMENT ON COLUMN public.personalised_courses.flagged_gaps IS
  'Concepts the LLM identified as missing from the assembled path. Surfaced in the preview UI; learner can accept recommended additions to close them.';
COMMENT ON COLUMN public.personalised_courses.flagged_conflicts IS
  'Sequencing conflicts the LLM flagged (unmet prerequisites, lessons that contradict the goal, etc.). An empty array with empty generated_sequence means the LLM refused to assemble; the conflicts explain why.';
COMMENT ON COLUMN public.personalised_courses.prompt_version IS
  'Version of the prompt template that produced this course. Bumped when the prompt changes; logged here so behaviour shifts are traceable.';

-- 1.4 Items inside a personalised course (selected + recommended).
CREATE TABLE IF NOT EXISTS public.personalised_course_lessons (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
                         DEFAULT '00000000-0000-0000-0000-000000000001',
  personalised_course_id UUID NOT NULL REFERENCES public.personalised_courses(id) ON DELETE CASCADE,
  lesson_id              UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  lesson_title_snapshot  TEXT NOT NULL,
  position               INTEGER NOT NULL,
  item_type              TEXT NOT NULL DEFAULT 'selected'
                         CHECK (item_type IN ('selected', 'recommended')),
  rationale              TEXT,
  insert_after_position  INTEGER,
  accepted               BOOLEAN,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.personalised_course_lessons IS
  'Items in a personalised course''s sequence. item_type=selected are the learner''s original picks (always accepted, always part of the active path). item_type=recommended are LLM suggestions; accepted=NULL means pending learner review, true means the learner accepted, false means rejected.';
COMMENT ON COLUMN public.personalised_course_lessons.lesson_title_snapshot IS
  'Captured at insert. If the underlying lesson is later deleted (lesson_id set to NULL by FK), the snapshot still gives the UI a label and signals the path needs review.';
COMMENT ON COLUMN public.personalised_course_lessons.insert_after_position IS
  'Only meaningful for item_type=recommended: the position-after-which the LLM proposes inserting this item. NULL for item_type=selected.';

-- 1.5 Audit + rate-limit log.
CREATE TABLE IF NOT EXISTS public.personalised_course_requests (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
                         DEFAULT '00000000-0000-0000-0000-000000000001',
  learner_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  personalised_course_id UUID REFERENCES public.personalised_courses(id) ON DELETE SET NULL,
  selected_lesson_count  INTEGER NOT NULL,
  available_lesson_count INTEGER,
  llm_provider           TEXT,
  llm_model              TEXT,
  prompt_version         TEXT,
  latency_ms             INTEGER,
  prompt_tokens          INTEGER,
  completion_tokens      INTEGER,
  outcome                TEXT NOT NULL
                         CHECK (outcome IN (
                           'success',
                           'fallback_success',
                           'failed_validation',
                           'failed_unavailable',
                           'rate_limited'
                         )),
  error_message          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.personalised_course_requests IS
  'Audit + cost log for every personalisation request attempt. Doubles as the rate-limit data source (count rows where learner_id=X AND created_at > now() - interval ''1 hour''). outcome=rate_limited rows are inserted by the rate-limit guard itself for visibility.';

-- ----------------------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_concepts_category ON public.concepts(category) WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_concepts_tenant     ON public.lesson_concepts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lesson_concepts_lesson     ON public.lesson_concepts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_concepts_concept    ON public.lesson_concepts(concept_id);
CREATE INDEX IF NOT EXISTS idx_lesson_concepts_relation   ON public.lesson_concepts(lesson_id, relation);

CREATE INDEX IF NOT EXISTS idx_personalised_courses_tenant         ON public.personalised_courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_personalised_courses_learner_status ON public.personalised_courses(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_personalised_courses_status         ON public.personalised_courses(status);

CREATE INDEX IF NOT EXISTS idx_personalised_course_lessons_course ON public.personalised_course_lessons(personalised_course_id, position);
CREATE INDEX IF NOT EXISTS idx_personalised_course_lessons_lesson ON public.personalised_course_lessons(lesson_id) WHERE lesson_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_personalised_course_requests_tenant       ON public.personalised_course_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_personalised_course_requests_learner_time ON public.personalised_course_requests(learner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personalised_course_requests_outcome      ON public.personalised_course_requests(outcome, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Triggers
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_personalised_courses_updated_at ON public.personalised_courses;
CREATE TRIGGER update_personalised_courses_updated_at BEFORE UPDATE ON public.personalised_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------------------
-- The API layer uses TenantFilteredQuery (service role, bypasses RLS). These
-- policies protect against direct-client access — realtime subscriptions, anon
-- reads, anything that talks to PostgREST without going through the API.
-- ----------------------------------------------------------------------------

-- concepts: world-readable to authenticated users (it's a global vocabulary).
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read concepts" ON public.concepts;
CREATE POLICY "Authenticated users read concepts" ON public.concepts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- lesson_concepts: scoped to the tenant.
ALTER TABLE public.lesson_concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members read lesson concepts" ON public.lesson_concepts;
CREATE POLICY "Tenant members read lesson concepts" ON public.lesson_concepts
  FOR SELECT USING (tenant_id = current_tenant_id());

-- personalised_courses: a learner reads only their own rows in their tenant.
ALTER TABLE public.personalised_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners read own personalised courses" ON public.personalised_courses;
CREATE POLICY "Learners read own personalised courses" ON public.personalised_courses
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND learner_id = auth.uid()
  );

-- personalised_course_lessons: read access derived from the parent course.
ALTER TABLE public.personalised_course_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners read own personalised course lessons" ON public.personalised_course_lessons;
CREATE POLICY "Learners read own personalised course lessons" ON public.personalised_course_lessons
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.personalised_courses pc
       WHERE pc.id = personalised_course_lessons.personalised_course_id
         AND pc.learner_id = auth.uid()
    )
  );

-- personalised_course_requests: a learner reads only their own audit rows.
ALTER TABLE public.personalised_course_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners read own personalisation requests" ON public.personalised_course_requests;
CREATE POLICY "Learners read own personalisation requests" ON public.personalised_course_requests
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND learner_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- 5. Seed concept taxonomy (~50 generic concepts)
-- ----------------------------------------------------------------------------
-- Idempotent via ON CONFLICT (slug). Curated as a starter vocabulary that
-- generalises across subject areas: cognitive verbs, foundational learning
-- concepts, common subject foundations, and computing/data concepts (since
-- those are common across the existing course catalogue). Tenant admins
-- will be able to extend this in a future iteration.
-- ----------------------------------------------------------------------------

INSERT INTO public.concepts (slug, label, description, category) VALUES
  -- Bloom's cognitive levels (used as pedagogical-role concepts)
  ('bloom-recall',          'Recall',                       'Remember facts, terms, basic concepts.',                              'bloom'),
  ('bloom-understand',      'Understand',                   'Explain ideas or concepts in your own words.',                        'bloom'),
  ('bloom-apply',           'Apply',                        'Use knowledge in new situations.',                                    'bloom'),
  ('bloom-analyze',         'Analyze',                      'Break information into parts and explore relationships.',             'bloom'),
  ('bloom-evaluate',        'Evaluate',                     'Justify a stand or decision using evidence and criteria.',            'bloom'),
  ('bloom-create',          'Create',                       'Produce new or original work by combining elements.',                 'bloom'),

  -- Foundational learning skills
  ('critical-thinking',     'Critical Thinking',            'Reasoning carefully about claims, evidence and conclusions.',         'foundational'),
  ('problem-solving',       'Problem Solving',              'Decomposing a problem and constructing a path to a solution.',        'foundational'),
  ('systems-thinking',      'Systems Thinking',             'Reasoning about components, interactions, and emergent behaviour.',   'foundational'),
  ('research-methods',      'Research Methods',             'Forming questions, gathering and evaluating evidence.',               'foundational'),
  ('scientific-method',     'Scientific Method',            'Hypothesis, experiment, observation, revision.',                      'foundational'),
  ('writing-fundamentals',  'Writing Fundamentals',         'Clear, structured written communication.',                            'foundational'),
  ('communication-skills',  'Communication Skills',         'Structuring and delivering ideas to an audience.',                    'foundational'),
  ('collaboration',         'Collaboration',                'Working effectively in a group toward a shared goal.',                'foundational'),
  ('time-management',       'Time Management',              'Planning and prioritising work against deadlines.',                   'foundational'),
  ('reading-comprehension', 'Reading Comprehension',        'Extracting and integrating meaning from text.',                       'foundational'),
  ('ethical-reasoning',     'Ethical Reasoning',            'Identifying and weighing ethical considerations in decisions.',       'foundational'),
  ('accessibility-awareness','Accessibility Awareness',     'Designing and reasoning with accessibility constraints in mind.',     'foundational'),

  -- Mathematics & data foundations
  ('mathematics-basics',    'Mathematics Basics',           'Arithmetic, algebra, and basic functions.',                           'mathematics'),
  ('mathematical-reasoning','Mathematical Reasoning',       'Constructing and evaluating mathematical arguments.',                 'mathematics'),
  ('statistics-basics',     'Statistics Basics',            'Descriptive statistics, distributions, and basic inference.',         'mathematics'),
  ('probability-basics',    'Probability Basics',           'Random variables, expectation, and basic probability rules.',         'mathematics'),
  ('linear-algebra-basics', 'Linear Algebra Basics',        'Vectors, matrices, and linear transformations.',                      'mathematics'),
  ('calculus-basics',       'Calculus Basics',              'Limits, derivatives, and integrals at an introductory level.',        'mathematics'),
  ('data-literacy',         'Data Literacy',                'Reading, interpreting, and reasoning about data.',                    'data'),
  ('data-visualisation',    'Data Visualisation',           'Communicating data using charts and graphics.',                       'data'),

  -- Computing fundamentals
  ('computational-thinking','Computational Thinking',       'Decomposing problems into computable steps.',                         'computing'),
  ('programming-fundamentals','Programming Fundamentals',   'Variables, control flow, functions in any language.',                 'computing'),
  ('algorithms-basics',     'Algorithms Basics',            'Search, sort, and simple algorithm analysis.',                        'computing'),
  ('data-structures-basics','Data Structures Basics',       'Arrays, lists, trees, hash tables.',                                  'computing'),
  ('debugging',             'Debugging',                    'Locating and fixing defects in software.',                            'computing'),
  ('version-control',       'Version Control',              'Tracking and collaborating on code with tools like Git.',             'computing'),
  ('web-fundamentals',      'Web Fundamentals',             'How browsers, HTTP, and the web platform work.',                      'computing'),
  ('databases-basics',      'Databases Basics',             'Tables, queries, and basic relational concepts.',                     'computing'),
  ('networking-basics',     'Networking Basics',            'Hosts, addressing, and how data moves between systems.',              'computing'),
  ('cybersecurity-basics',  'Cybersecurity Basics',         'Common threats and defensive principles at an introductory level.',   'computing'),

  -- Data science & ML
  ('machine-learning-fundamentals','Machine Learning Fundamentals', 'What ML is and the basic problem framings.',                  'ml'),
  ('supervised-learning',   'Supervised Learning',          'Learning from labelled examples; regression and classification.',     'ml'),
  ('unsupervised-learning', 'Unsupervised Learning',        'Finding structure in unlabelled data; clustering, dimensionality.',   'ml'),
  ('neural-networks',       'Neural Networks',              'Layered models, activations, and basic training dynamics.',           'ml'),
  ('model-evaluation',      'Model Evaluation',             'Train/test splits, metrics, and avoiding leakage.',                   'ml'),
  ('feature-engineering',   'Feature Engineering',          'Designing inputs that help a model learn.',                           'ml'),
  ('data-preprocessing',    'Data Preprocessing',           'Cleaning, normalising, and shaping data for analysis.',               'ml'),
  ('recommendation-systems','Recommendation Systems',       'Approaches to suggesting items to users at scale.',                   'ml'),

  -- Design / business literacy
  ('design-thinking',       'Design Thinking',              'Empathy-led iterative approach to problem framing and prototyping.',  'design'),
  ('user-research',         'User Research',                'Methods for understanding users'' needs and behaviours.',             'design'),
  ('project-management',    'Project Management',           'Scoping, planning, and tracking work.',                               'business'),
  ('business-analysis',     'Business Analysis',            'Translating business needs into structured requirements.',            'business'),
  ('presentation-skills',   'Presentation Skills',          'Structuring and delivering presentations to an audience.',            'communication')
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Refresh PostgREST schema cache so the new tables become visible
-- ----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
