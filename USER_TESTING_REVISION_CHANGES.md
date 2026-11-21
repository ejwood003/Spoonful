# Spoonful prototype revisions after user testing

**Course:** IS 551  
**Team:** Pantry  
**Product:** Spoonful  
**Purpose of this document:** Explain what we changed in the main prototype after Survey Analytics / user testing, why those changes were made, and how they map to each teammate’s analysis. This write-up is suitable to copy into the Canvas submission and is preserved in the repo for the revision commit.

---

## 1. What testing told us (brief)

Spoonful is meant to be a command center for food prep: keep **your** recipe versions organized, **plan** meals ahead, and **cook** with clear step tracking. Across roughly thirty participants, two areas already beat people’s usual methods in meaningful ways:

- **Cook mode** for tracking steps and ingredients while cooking (George’s analysis).
- **Finding a saved / kept recipe** in the catalogue (Caleb’s analysis).

Adoption and recommend intent were still held back by other themes:

- Users often did not clearly see that Spoonful stores **their personal version** of a recipe, not only the original blog text (William).
- **Purpose / information architecture** was not always obvious enough to raise recommend scores (Ethan).
- **Plan Ahead** was the most complicated surface and produced shared recording pain—especially an **Add Recipe** control that could insert a default / first alphabetical recipe (e.g. cookies) without a real choice.
- Shopping / “what you need” trust and layout issues (hard to scan, odd emphasis) reduced confidence in the plan flow.
- Importing recipes by hand remained a large switching-cost concern for real-world use; for **this** revision deadline we prioritized **demo-ready survey fixes** over a full ingest/OCR overhaul (that work is deferred for later / presentation polish).

We treated cook-mode step focus and findability of kept recipes as **non-regressions**: improve them, do not gut them.

---

## 2. How we decided what to build

After reading the testing handoff and grilling product purpose, we locked a practical bar for this pass:

- **Outcome users care about:** cooking something successfully.
- **Path that makes that possible:** add recipes → plan → cook.
- **“Organized”** for Spoonful means structure (folders/tags/findability), not only free-text notes of blog links.
- **Deadline bar:** demo-ready revisions driven by survey feedback for the assignment turn-in; deeper recipe-intake engineering (real scrape / OCR / step standardization) later.

We then implemented a focused set of prototype changes that hit the handoff definition of done and the Plan Ahead feedback that dominated recordings—without rewriting the entire product.

---

## 3. Changes made (by theme)

### 3.1 Plan Ahead — stop the blind “Add Recipe” bug (shared / recordings)

**Problem.** With an empty or incomplete selection, Plan Ahead could treat the first catalogue hit as chosen and insert it (the infamous cookies / first-alphabetical behavior). That destroyed trust in planning.

**What we changed.**

- Recipe add now requires an **intentional** pick: type a match, arrow/hover a suggestion, or click a row. Empty search no longer submits the first recipe.
- Enter only commits when that selection is valid.
- The redundant **Add to plan** button beside the search box was **removed**; choosing from the suggestion list (or Enter after a valid pick) is the action. The recipe-page **Add to plan** path (choose meal + click a day) remains.
- Calendar day cells continue to show planned titles so users see what actually landed on a day.

**Why.** Directly addresses the shared critical bug from recordings. Planning is only useful if the user believes they chose the meal.

**Primary files:** `src/components/plan-board.tsx`

---

### 3.2 Plan Ahead — dinner-first day editor; lunch / breakfast optional

**Problem.** Expanded days always showed dinner, lunch, and breakfast, with only dessert behind an add control. That made the editor heavier than most planning sessions need and fought the mental model that dinner is the main meal people plan.

**What we changed.**

- **Dinner** is always the primary slot on an expanded day.
- **Lunch**, **breakfast**, and **dessert** open via **Add …** buttons and can be removed again (same pattern dessert already used).
- Existing days that already contain lunch/breakfast items still open those slots automatically so data is not hidden.

**Why.** Reduces Plan Ahead complexity—the surface that drew the most testing criticism—while keeping full meal coverage available when needed.

**Primary files:** `src/lib/plan-store.ts`, `src/components/plan-board.tsx`

---

### 3.3 Plan Ahead — Coming up only for dates on the visual calendar

**Problem.** The Coming up rail could show meals from an old From–To range (for example early November) that were **no longer on the visible this-week / next-week calendar**. Users saw “planned” items they could not find on the grid.

**What we changed.**

- From / To are **clamped** to the visible calendar window as weeks roll forward.
- Coming up and **What you need** only include dates that appear on the calendar grid **and** fall inside the From–To filter.

**Why.** Aligns the sidebar with what users can see and edit. Past / off-grid leftovers no longer pollute the rail.

**Primary files:** `src/components/plan-board.tsx`

---

### 3.4 Plan Ahead — What you need scannability

**Problem.** The ingredient list led with bold quantities and softer ingredient names, which made the list harder to scan as a shopping checklist (name-first is how people usually look for items).

**What we changed.**

- Each line now leads with the **ingredient name** (bold / primary).
- **Quantity** follows in regular weight and muted color.

**Why.** Improves trust and readability of the aggregated needs list that Plan Ahead produces from toggled recipes—without claiming a full grocery-app redesign in this pass.

**Primary files:** `src/components/plan-board.tsx`, `src/design-system/tokens.css`

---

### 3.5 Plan Ahead — recipe suggestion dropdown opacity / stacking

**Problem.** The recipe search dropdown could appear “transparent,” with the next calendar week and “What you need” showing through the list.

**What we changed.**

- Raised stacking for the expanded week and the suggestion panel.
- Forced a solid opaque popover surface for suggestions.

**Why.** A usability defect that made selecting recipes unreliable and visually broken; fixed as part of making Plan Ahead demonstrable.

**Primary files:** `src/design-system/tokens.css`

---

### 3.6 “My version” visibility (William)

**Problem.** Intention to use rose when people believed Spoonful kept **their** version. The prototype already stored notes and ingredient deltas (“Blog called for…”), but that personal ownership was easy to miss—especially while cooking.

**What we changed.**

- Added a clear **My version** badge on the recipe view and in cook mode when the recipe has personal notes, a `whyKept` reason, and/or changed ingredients.
- Surfaced **whyKept** under the title on recipe and cook screens.
- In cook mode, kept ingredient deltas visible and added a **Your notes** block in the ingredients panel so personal guidance travels into the cooking session.

**Why.** Makes the core value proposition visible at the moments that matter (viewing and cooking), which matches William’s analysis linking “my version” recognition to IntentionToUse.

**Primary files:** `src/components/recipe-view.tsx`, `src/components/cook-mode.tsx`

**Note on import.** Testing strongly wanted easier intake (URL / photo / less typing). The prototype already has a staged URL / photo keep flow for demos. A full standardize-and-parse overhaul was explicitly **deferred** for this survey-revision deadline in favor of visible “my version” + Plan Ahead / cook / home fixes. Import remains a priority for later presentation work.

---

### 3.7 Cook mode — next-step peek without losing step focus (George)

**Problem.** One-step-at-a-time was a strength for tracking, but users reported tunnel vision and wanted to see what comes next (or more context) without abandoning the focused experience.

**What we changed.**

- Kept the large **current step** as the primary focus, with existing Back / Next / Done controls and progress.
- Added a compact **Next · step N** peek under the current step so cooks can glance ahead.
- Did **not** replace cook mode with a full recipe dump.

**Why.** Extends George’s validated cook-mode win instead of regressing it. Addresses recording feedback about wanting forward context while cooking.

**Primary files:** `src/components/cook-mode.tsx`

---

### 3.8 Home / purpose clarity (Ethan)

**Problem.** Recommend / NPS-style outcomes improved when purpose was clear. Entry points could feel like a generic app shell rather than a sharp job-to-be-done.

**What we changed.**

- Home (`/`) carries an explicit purpose line: Spoonful keeps your recipe versions organized so you can plan ahead and cook with confidence.
- Kept large entry actions for the loop (My recipes / Add a recipe / Plan ahead), plus resume-cook and next-two-days plan cues from the earlier home/plan overhaul.

**Why.** Clarifies *why Spoonful exists* up front, which aligns with Ethan’s finding that purpose clarity tracks with recommend intent.

**Primary files:** `src/components/home-board.tsx`  
**Related earlier revision (same testing arc):** marketing landing moved to `/landing`; `/` became a useful kitchen home rather than a brochure-only page.

---

### 3.9 Find saved recipes labeling (Caleb)

**Problem.** Spoonful already performed well at finding kept recipes. The revision needed to **strengthen and make explicit** that this catalogue is the user’s personal library—not a generic public recipe browser.

**What we changed.**

- Renamed primary labels from **Recipes** to **My recipes** in the site nav, kitchen hero, home CTA, and “back to…” links on recipe/cook screens.
- Kitchen copy emphasizes a **personal catalogue** you find by folder, tag, favorite, name, or ingredient.

**Why.** Reinforces Caleb’s find-saved-recipe advantage in language users see constantly, without ripping out the search/filter system that already worked in testing.

**Primary files:** `src/components/site-header.tsx`, `src/components/kitchen-board.tsx`, `src/components/home-board.tsx`, `src/components/recipe-screen.tsx`, `src/components/cook-screen.tsx`

---

### 3.10 Broader Plan Ahead / home overhaul already in the prototype (same revision arc)

Before the final survey-revision polish above, the team also shipped a larger Plan Ahead and home restructuring that responded to the same testing themes (complexity, discoverability, planning for real weeks). That work is part of the post-testing prototype story and includes:

- Date-keyed calendar for **this week and next**, with click-to-expand days.
- **Coming up** rail with date range, default people, per-item people, and toggles for what counts toward needs.
- Aggregated **What you need** under the calendar from toggled recipes.
- Recipe search (and custom non-recipe items) instead of freeform note-only planning.
- Profile **default people** synced into planning.
- Helpful home with resume cook and a short upcoming-plan preview.

Those pieces set the stage for the bugfix and IA/copy/cook tweaks listed above.

---

## 4. Mapping changes → teammate analyses (for the assignment)

| Teammate | Analysis takeaway | Revision that responds |
|---|---|---|
| **William Gifford** | IntentionToUse rises when people believe Spoonful keeps *their* version and can see it; import friction kills adoption | **My version** badge + whyKept + notes / ingredient deltas on recipe **and** cook mode. Staged import remains in the keep flow for demos; full ingest overhaul deferred but acknowledged as next real-use priority. |
| **Caleb Caten** | Spoonful already beats usual methods at finding a kept recipe | Strengthened personal-library framing: **My recipes** nav/hero/copy; kept folder/tag/favorite/search find path. |
| **Ethan Wood** | Recommend rises when purpose is clear | Home purpose sentence; clearer cook / plan / my-recipes entry points; Plan Ahead Add bug fixed (trust + clarity of action). |
| **George Summerill** | Cook mode beats usual methods at tracking steps/ingredients | Preserved step-focus; added **next-step peek**, Back/Next retained; personal notes/deltas visible while cooking. |
| **Shared (recordings)** | Plan Ahead Add Recipe inserts default cookies / first recipe | Selection guard; suggestion-driven add; dinner-first optional slots; calendar-aligned Coming up; What you need name-first; dropdown stacking fix. |

---

## 5. What we deliberately did *not* change in this pass

To keep the revision demo-ready for the survey assignment deadline:

- No full **URL scrape / OCR / LLM parse / step-standardization** rebuild (still the biggest real-use gap for intake).
- No complete grocery-app rewrite (checkoffs on `/grocery` already exist; this pass focused on Plan Ahead needs readability and plan trust).
- No cook-mode wake lock / full mobile kitchen pass beyond existing responsive cook layout.
- No Step 10 nice-to-haves (voice read-aloud, household sharing, cart integrations, etc.).

Those remain candidates for the final presentation polish if time allows.

---

## 6. Definition of done (revision checklist)

Relative to the testing handoff checklist:

- [x] Add Recipe no longer inserts a default/first recipe blindly  
- [x] My-version is visibly communicated on recipe and cook  
- [x] Cook mode improved for context (next-step peek) without removing step focus  
- [x] Purpose / home clarity improvement  
- [x] Find-saved-recipe / personal library strengthening (My recipes)  
- [x] Credible import path still present as staged keep flow (not newly rebuilt this pass)  
- [x] Changes can be listed against William / Caleb / Ethan / George / shared for submission  

Additional Plan Ahead fixes from the same feedback wave: dinner-first optional meals, calendar-aligned Coming up, What you need name-first, suggestion dropdown stacking.

---

## 7. Canvas blurb (changelog)

Plan Ahead: stop Add Recipe from inserting the first/default recipe when nothing was chosen — shared recording bug (Ethan noted).

Plan Ahead: remove the unused Add to plan button next to search; pick from the suggestion list instead — shared / Plan Ahead UX.

Plan Ahead: dinner is the main slot; lunch, breakfast, and dessert open with Add buttons — Plan Ahead complexity from testing.

Plan Ahead: Coming up only shows meals on the visible calendar (this week + next); past/off-grid dates drop off — Plan Ahead UX.

Plan Ahead: What you need lists ingredient name first (bold), quantity after (not bold) — shopping-list scanability from testing.

Plan Ahead: fix recipe suggestion dropdown showing calendar through it — Plan Ahead UX bug.

My version badge + whyKept / notes / ingredient deltas on recipe and cook screens — William (IntentionToUse when people see their version is kept).

Cook mode: keep one-step focus; add a next-step peek under the current step — George (cook mode tracking win; tunnel-vision feedback).

Home: one purpose line (keep your versions organized → plan → cook) — Ethan (purpose clarity → recommend).

Rename Recipes → My recipes in nav, kitchen, home, and back links — Caleb (strengthen find-saved / personal catalogue).

---

*Companion handoff: `AI_HANDOFF_user_testing_to_main_build.md`.*
