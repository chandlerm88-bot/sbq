# Scholars Bowl Quest — GitHub Pages + Supabase starter

This is a **working integration starter**, not a production-certified child account system. It includes:

- `index.html`: existing student game, Creature World, bundled tournament questions, account gate, cloud saves, and live published question packs.
- `admin.html`: separate admin portal for uploading JSON packs, validating, drafting, publishing, and unpublishing questions.
- `config.js`: your public Supabase project URL and **publishable/anon** key.
- `cloud.js`: Supabase client and cloud data operations.
- `supabase/schema.sql`: database tables and row-level security policies.

## Deploy

1. Create a Supabase project. Open SQL Editor and run `supabase/schema.sql`.
2. Open **Project Settings → API** and copy your Project URL and publishable key into `config.js`. **Never use the service_role key in GitHub or browser files.**
3. In **Authentication → Providers → Email**, enable Email signups. For **private testing only**, disable email confirmation. The username-to-placeholder-email approach here does **not** provide email recovery or verified identities; it is **not recommended for a public children's launch**.
4. Push `index.html`, `admin.html`, `config.js`, and `cloud.js` to a GitHub repository. In Settings → Pages, deploy from the main branch root (or GitHub Actions). Use `https://YOURNAME.github.io/REPO/` for students and `https://YOURNAME.github.io/REPO/admin.html` for admin.
5. In Supabase Authentication URL Configuration, add your GitHub Pages URL as an allowed redirect URL if you later use email-based login.
6. Open the student page and create your **own** account with a username and 8–12 digit PIN. In Supabase SQL Editor, promote **only your account**:

```sql
insert into public.admins(user_id)
select id from auth.users
where email = 'YOUR_ADMIN_USERNAME@players.scholarsbowl.invalid'
on conflict do nothing;
```

7. Open `admin.html`, sign in, upload a JSON question pack, validate it, then publish. Student accounts load published packs at login. Existing questions remain bundled.

## JSON example

```json
[
  {"question":"Which planet is known as the Red Planet?", "answer":"Mars", "category":"Science", "difficulty":"Beginner", "type":"Tossup", "explanation":"Its iron-rich surface appears reddish."}
]
```

## Security and family privacy — important before inviting other children

- A numeric PIN is weaker than a password. This prototype requires **8–12 digits**, but does not include custom per-account lockout, parental consent, verified email recovery, or a privacy policy. Enable Supabase Auth rate limits, bot protection/CAPTCHA where supported, and consider stronger credentials before opening registration to others.
- This prototype uses a synthetic, non-deliverable email identifier derived from the username. It is convenient for local tests but **not appropriate as a final public account design**. Replace with a parent-managed verified email account flow (or secure server-side username+PIN authentication with strict rate limiting and recovery) before inviting other families.
- Use nicknames only; don't collect children's real names, birthdates, addresses, or school information.
- GitHub Pages is public. The **admin page URL is not a security boundary**; Supabase RLS prevents non-admin writes, and admin access must be granted manually in SQL.
- The current bundled tournament questions and content should be reviewed for accuracy and reuse rights before public distribution.
- The game loads `supabase-js` from a CDN, so the **initial page load needs connectivity**. Cloud saves and new question packs need internet. Existing in-game content may continue working offline after it loads, but this is not a fully offline installable PWA.
- Progress sync is **last write wins** and is intended for one active device per account at a time. Avoid simultaneous play on two devices. An interrupted connection may delay a cloud save.
- For testing migration from an older HTML version, make a backup first. This version loads progress from the account on sign-in and doesn't automatically migrate previous browser saves.
- `question_packs` RLS exposes published packs to signed-in players; unpublished drafts are admin-only. The built-in tournament library is still embedded in the student HTML.

## Next recommended production steps

1. Parent-managed accounts with verified email recovery, secure child PIN unlock, rate limits, and consent/retention policy.
2. Admin PDF/ZIP conversion pipeline, preview, subject validation, duplicate review, and copyright/permission tracking.
3. Transactional progress events or server-side version checks to prevent two-device overwrites and currency cheating.
4. Remove bundled tournament data from student HTML and load versioned question sets from Supabase, with paging/caching.
5. Test on actual Fire tablet and desktop browsers before public release.

## Private Noah + parent edition

This package is restricted to two accounts by *workflow*: student self-registration is hidden in the student interface. **To enforce only two accounts, disable new user signups in Supabase Auth after both accounts exist.** Admin access remains protected by RLS and manual role assignment.

1. Run `supabase/schema.sql`, then `supabase/private_dashboard.sql` in the Supabase SQL editor.
2. Set up `config.js` with your project's URL and public publishable key. Never publish the service-role key.
3. For initial setup only, create the two accounts using Supabase Auth or temporarily the original starter's registration flow. Use distinct usernames and 8–12 digit PINs (this prototype uses numeric passwords). The student page in this edition **does not show account creation**. Set `username` in each account's user metadata if creating directly in the dashboard; the sign-in username must map to `username@players.scholarsbowl.invalid` as described in `cloud.js`.
4. Promote the parent account using the SQL statement above, replacing the username. Disable public signups after both accounts exist.
5. Open `admin.html` and select Noah from the dashboard dropdown. It shows answer history, accuracy by category, active-day trends, coins, XP, creature name and approximate total game time.
6. Publish to GitHub Pages. The public `admin.html` URL is fine: the database refuses reads and writes without an authenticated administrator role. Keep the project URL and anon/publishable key public, but never the service-role key.

**Limitations:** Existing game progress is saved in snapshots; question-answer history starts only after this version is deployed. Tournament answers are self-graded. Playtime is estimated in 30-second intervals and may miss some intervals during lost connectivity or sudden closing. `answer_events` retries failed inserts from a local queue; playtime inserts currently do not retry. Dashboard reports total active game time, not verified study-only time. This is a private family prototype, not a security-audited public child account system.

## Arcade reward rules (October 2026)

- 10 correct study answers award one Play Ticket; wrong answers do not deduct anything.
- Neon Snake, Asteroid Dodge, and Gem Catch each require one ticket per session, even if an arcade item was purchased in an earlier edition.
- A session includes 3 lives, 10 increasingly difficult levels, and a 20-minute cap. The Restart button only works within an active session and consumes the next life after a collision. Leaving the arcade ends the session.
- Level progress (highest level per game) is stored in the student's save state. Every new session begins at level 1; previous best is displayed on the arcade card.
- Star Catch and Bubble Pop also each require a ticket per play; ordinary creature care and garden activities are free.
- Arcade games do not award Play Tickets. Only correct study answers do.

## October 2026 fix pass (Claude audit)

**Verified question inventory (exact, from current `index.html`):** 2,586 embedded tournament questions (2022 SANDS: 941, SCOP MS 9: 838, SCOP MS 11: 807) + 132 original multiple-choice questions = **2,718 total**. (An earlier audit note claiming ~800 questions were missing was a counting error — the full set is present.)

**Changes in this pass (static code changes — not yet browser-tested):**
1. **Removed misleading "unlimited arcade unlock" purchases.** The Creature Cove shop no longer advertises ticket-free arcade play; arcade games always cost 1 Play Ticket (rule: purchases never bypass tickets). A one-time migration refunds coins (snake 250 / dodge 300 / catch 300) to any legacy save that owned these retired items.
2. **Telemetry mode fidelity.** Tournament answer events now record mode as "Tournament Tossup" / "Tournament Bonus" instead of just "Tournament". All study grading flows through `answer()` (Quest MCQs) and `gradeTraining()` (all tournament clue/buzzer/bonus play), so every graded answer is logged.
3. **Arcade session resume.** The active session (game, lives, level, points, start time) is persisted on launch, life loss, and level-up. If the page is refreshed or closed mid-session, the Arcade screen shows a "Resume session (free)" card while lives and the 20-minute window remain — the already-spent ticket is honored instead of lost. Ending a session (win, out of lives, timeout) clears it.
4. **Two-device overwrite guard.** `saveProgress()` now checks the cloud save's `updated_at` first; if another device saved after this session last synced, the save is refused with a clear message instead of silently clobbering newer progress. Still single-active-device by design — this guard just prevents silent data loss.
5. **Account setup mode.** The student page hides "Create account" normally. To create the two accounts during initial setup, open `index.html?setup=1`, which reveals a "Create account (setup mode)" button. After both accounts exist, **still disable signups in Supabase Auth settings** — the URL flag is a convenience, not a security control.

**Unchanged caveats:** end-to-end login, RLS, gameplay, analytics, and Fire-tablet behavior have NOT been verified in a live browser; test against the checklist in the handoff doc before trusting any of it.

### Server-authoritative tickets (added after the October 2026 fix pass)

Play Tickets are no longer tracked by the browser. Run `supabase/ticket_ledger.sql`
(after `schema.sql` and `private_dashboard.sql`). It adds:

- `quest_ticket_balance()` — tickets earned = 1 per 10 correct `answer_events`
  (correct answers less than 4 seconds apart don't count, to block console spam),
  minus spends, plus any manual `ticket_adjustments`.
- `quest_spend_ticket(game)` — the only way a ticket can be spent. The game calls
  this when launching any arcade or pet game; no tickets, no game. Direct inserts
  into `ticket_spends` are denied by RLS.
- `ticket_adjustments` — admin-only table for manual grants (example in the SQL
  comments), e.g. to carry over tickets earned before the ledger existed.

Editing `state.tickets` in the console now only changes the number on screen;
the server decides at spend time. Coins and creature care remain client-side —
they're cosmetic and gate nothing. When Supabase isn't configured (local file
testing), the game falls back to the old local counter so it still runs.

### Question packs extracted (`packs/` folder)

All 2,586 tournament questions now also live outside the game file, one JSON file
per tournament set, in the exact format the Pack Editor in `admin.html` accepts.
This is the edit path for all future content:

1. Sign in to `admin.html` as the parent account, open the Pack Editor.
2. Paste the contents of a pack file into the questions box, title it to match
   (e.g. "2022 SANDS"), save, and mark it **published**.
3. The game merges published packs at login and skips duplicates automatically,
   so publishing these alongside the embedded copies is safe — nothing doubles up.

The embedded copy inside `index.html` is deliberately still there for launch: it
means the game works even if pack loading has a bug or the tablet is offline, and
the first shakedown doesn't bet everything on an untested code path. Once a live
session confirms the console shows "Quest cloud questions added" with packs
published, the embedded `TOURNAMENT_DATA` array can be stripped from `index.html`
(shrinking it ~1 MB) and questions become cloud-only. From that point, adding or
fixing questions never touches `index.html` again.
