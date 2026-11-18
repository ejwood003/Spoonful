# AI handoff: Spoonful user-testing → main build

**Audience:** AI agent working in the **main Spoonful product/prototype repo** (not this testing folder).  
**Human:** William (team Pantry). He will brainstorm with you about **what to implement at each step**—do not assume you should implement everything.  
**Your job:** Read this, inspect the main codebase, propose concrete implementation options per priority item, then implement only what William confirms.

---

## How to work with William

1. Explore the main repo structure first (routes, Plan Ahead, Cook mode, recipe model, shopping list).
2. For each step below, propose **2–3 implementation options** (scope: small / medium / large) with tradeoffs.
3. Ask William which option to take before coding that step.
4. Prefer changes that are demonstrable in a mid-to-high fidelity prototype for a class final presentation.
5. Preserve what testing already proved works (cook mode tracking; finding saved recipes).
6. When done with a change, note which teammate analysis it satisfies (needed for assignment write-up).

### Assignment constraint (prototype revisions)

Each teammate must contribute changes demanded by **their own analysis**:

| Teammate | Analysis takeaway | Change should reinforce |
|---|---|---|
| William Gifford | IntentionToUse ↑ when people believe Spoonful keeps their version and can see it; import friction kills adoption | My-version visibility + easier recipe intake |
| Caleb Caten | Spoonful beats usual method at finding a kept recipe (~+0.8 pts, p≈.039) | Keep/strengthen find-saved-recipe UX |
| Ethan Wood | RecommendNPS ↑ when purpose is clear | Home/IA/purpose clarity |
| George Summerill | Cook mode beats usual method at tracking steps/ingredients (~+1.4 pts, p<.001) | Improve cook mode **without** removing step-focus |

Shared critical bug from recordings: Plan Ahead **Add Recipe** auto-inserts default “Baked cookies” / first alphabetical recipe.

---

## Product context (one paragraph)

Spoonful is a recipe site focused on **keeping your personal recipe versions**, **cook mode** for tracking steps/ingredients while cooking, and **plan ahead** (calendar + aggregated shopping list). User tests (~30 participants) showed cook mode and finding saved recipes work relatively well vs people’s usual methods, but adoption is blocked by typing-all-recipes switching cost, unclear “my version,” Plan Ahead UX bugs, shopping-list trust/editability, and desktop-vs-kitchen/phone friction.

---

## Evidence sources (if you need quotes)

Originated from IS 551 Survey Analytics Part 2 team submission + combined survey CSV. Key quotes:

- Import blocker: *“if it's easy then I'll use spoonful. if i have to type all my recipes into the app, then I won't use it.”* (R17)
- Recordings: photo → auto-fill recipes strongly desired; Add Recipe → cookies frustration
- Cook mode tunnel vision: users want next/previous or full recipe with current step highlighted
- Shopping list: hard to find; can’t check off pantry items; weird fractions (e.g. 1 3/8 tbsp) break trust

---

## Protect these (do not regress)

1. Cook mode’s clear “what step am I on?” experience  
2. Ability to find a saved/personal recipe quickly  
3. Sense that Spoonful stores **my** changed recipe, not only the original blog text  

---

## Implementation backlog

Use this as the brainstorm agenda. After mapping to real files in the main repo, walk William through steps in order unless he reorders.

### Step 1 — Plan Ahead Add Recipe bug (P0)

**Problem:** Add Recipe with empty/incomplete selection inserts default cookies or first alphabetical recipe. Confusing naming.

**Likely work:**
- Disable submit until a recipe is selected
- Rename button (e.g. “Add to plan” / “Schedule recipe”)
- Show recipe name on calendar day cells
- Optional: confirm dialog if somehow empty

**Brainstorm with William:** minimal guard vs full plan-picker redesign?

**Satisfies:** recordings / shared team issue (Ethan noted)

---

### Step 2 — “My version” visibility (P0) — William

**Problem:** Users who notice/believe their personal version is kept intend to use Spoonful more. Prototype doesn’t always make that obvious.

**Likely work:**
- “My version” badge on recipe view
- Surface personal notes/changes on recipe + in cook mode
- Copy that distinguishes personal version vs original source

**Brainstorm with William:** badge-only vs notes panel vs version history?

**Satisfies:** William

---

### Step 3 — Cook mode context (P1) — George

**Problem:** One-step-at-a-time helps tracking, but many want to peek ahead/back or see full list with highlight.

**Likely work (pick one primary):**
- Show current + next step
- Back / skip controls
- Toggle: focused steps ↔ full recipe with current step emphasized
- Optional: fade/check off used ingredients

**Brainstorm with William:** which pattern keeps George’s win and addresses tunnel vision?

**Satisfies:** George

---

### Step 4 — Shopping list trust + editability (P1)

**Problem:** List hard to find; can’t remove/check pantry items; duplicate lines; no source recipe; bad scaled amounts.

**Likely work:**
- Discoverable entry from Plan Ahead
- Checkboxes / remove / edit quantities
- Consolidate duplicate ingredients
- Show which recipe each line came from
- Fix or soften ugly fraction scaling; allow manual override

**Brainstorm with William:** UX polish only vs real aggregation logic?

**Satisfies:** open-ended themes; supports IntentionToUse

---

### Step 5 — Quick recipe import (P0) — William

**Problem:** Manual typing is the #1 adoption killer. Users want photo of cookbook / paste URL / screenshot import.

**Likely work (prototype-friendly options):**
- A. Staged UI: Import flow that accepts URL or image and fills fields with mock/parsed data
- B. Real URL scrape / LLM parse if main repo already has API hooks
- C. “Paste recipe text” → split ingredients/steps

**Brainstorm with William:** fidelity needed for final presentation vs engineering time?

**Satisfies:** William + recordings

---

### Step 6 — Purpose / home / IA clarity (P0) — Ethan

**Problem:** Purpose clarity predicts recommend. Primary actions (search, cook, plan) can feel small or oddly named; Make It / cook mode hard to discover; cook vs plan roles unclear.

**Likely work:**
- Hero/home: one clear purpose line + large Search / Plan / Cook entry points
- Rename confusing controls for consistency with on-screen labels
- Optional short “How to use Spoonful” / first-run tips

**Brainstorm with William:** copy-only pass vs home redesign?

**Satisfies:** Ethan

---

### Step 7 — Find saved recipes path (P1) — Caleb

**Problem:** Spoonful already wins on finding kept recipes; strengthen that advantage for the revision write-up.

**Likely work:**
- Clearer “My recipes” / saved library
- Better search empty states and filters
- Faster path from home → find personal recipe

**Brainstorm with William:** what’s weakest in current find flow after repo inspection?

**Satisfies:** Caleb

---

### Step 8 — Mobile / kitchen readiness (P0/P1)

**Problem:** Users cook with phone/tablet; laptop not in kitchen; screen sleep during cook mode.

**Likely work:**
- Responsive cook + plan layouts
- Cook mode keep-awake (Wake Lock API or prominent tip)
- Touch-friendly step controls

**Brainstorm with William:** full responsive pass vs cook-mode-only?

---

### Step 9 — Plan Ahead layout polish (P1)

**Problem:** Dinner listed above Breakfast; date/servings controls buried; hard to change meals.

**Likely work:**
- Meal order Breakfast → Lunch → Dinner
- Move date/servings to top
- Clearer edit/replace meal on a day

---

### Step 10 — Later / nice-to-have (P2) — only if William asks

- Voice read-aloud for steps  
- Multiple recipes open at once  
- Nutrition fields / recipe images  
- Household sharing / calendar export  
- Pinterest/Instagram bulk import  
- Store cart integrations  

---

## Suggested brainstorm session format

For each step William wants to tackle:

```
1) Repo map: which files/components own this?
2) Options: S / M / L
3) Demo value for final presentation
4) Risk of regressing validated wins
5) William picks option
6) Implement + short “what changed / which analysis” note for assignment
```

---

## Definition of done for a revision pass

- [ ] Add Recipe no longer inserts cookies/default blindly  
- [ ] My-version is visibly communicated in recipe and/or cook mode  
- [ ] Cook mode improved for context **or** shopping list made editable/trustworthy  
- [ ] At least one purpose/home clarity improvement  
- [ ] At least one find-saved-recipe improvement  
- [ ] Import path exists at least as a credible prototype flow  
- [ ] William can list changes mapped to William / Caleb / Ethan / George for the submission  

---

## What this handoff is not

- Not a mandate to implement all steps  
- Not a spec for production backend scale  
- Not a replacement for reading the main repo’s existing patterns—match local architecture and UI language  

When William opens this in the main repo chat, start with: **“I’ve read the handoff. Here’s how the main repo maps to Steps 1–3. Which step do you want to brainstorm first?”**
