# Balance Check: Curriculum Progression

## Data Sources Analyzed

- `lib/models/curriculum.dart`
- `lib/engine/exercise_generator.dart`
- `lib/models/player_progress.dart`
- `lib/providers/scaffolding_provider.dart`
- `lib/screens/home_screen.dart`
- `lib/screens/practice_screen.dart`
- `lib/screens/curriculum_screen.dart`
- `production/qa/playtests/playtest-2026-05-27-codex.md`
- ABRSM Music Theory syllabus outline, Grades 1-5 from 2020: https://www.abrsm.org/sites/default/files/2023-09/music-theory-syllabus-outline-grades-1-5-from-2020.pdf
- Trinity College London Theory of Music Syllabus, online edition April 2026: https://www.trinitycollege.com/resource?id=2886
- RCM Theory Syllabus 2016 highlights: https://files.rcmusic.com/sites/default/files/files/RCM-Theory-Syllabus-2016-Highlights.pdf

## Health Summary: Concerns

Harmony Knight has a strong pedagogical premise: scaffolded music literacy, short sessions, multisensory note reading, counterpoint as a game duel, and recovery-oriented retention. The curriculum, however, is currently out of balance in three ways:

1. The level labels imply a complete Grade 0-8+ theory curriculum, but the playable generators only implement thin multiple-choice placeholders for most levels.
2. Several topics appear earlier or in broader bundles than standard graded theory paths support.
3. Progression is not yet tied to mastery evidence, so the app cannot know when a learner is ready to move from scaffolding to fluency.

## External Benchmark Summary

The official references agree on a progressive structure:

- Beginner theory should start with notation, pitch, rhythm, simple keys, intervals, and tonic/dominant/subdominant triads.
- Intermediate work expands keys, ledger lines, compound/irregular rhythms, transposition, clefs, inversions, cadences, and more complete interval/chord work.
- Advanced harmony, counterpoint, history, analysis, fugue, and modernist materials belong after a much stronger foundation.

ABRSM's Grade 1-5 outline places alto clef at Grade 4, tenor clef at Grade 5, cadences and chord choice at Grade 5, and keys up to six sharps/flats by Grade 5. RCM groups Preparatory-Level 4 as elementary, Level 5-8 as intermediate, and Level 9+ as harmony/history/counterpoint. Trinity frames Grades 1-8 as an incremental music-literacy path with higher levels including form, history, harmony, and instrumental knowledge.

## Outliers Detected

| Item/Value | Expected Range | Actual | Issue |
|---|---|---|---|
| Level 4 includes alto clef | Later elementary/intermediate | Included with intervals and triads | Too much conceptual load in one level. |
| Level 5 includes Roman numerals, inversions, figured bass, cadences | Late elementary to intermediate | All grouped together | Good destination, but too dense without sublevels. |
| Level 6 includes secondary dominants and diminished chords | Intermediate/advanced harmony | Bundled with basic voice leading | Too early unless the learner already has cadences/inversions mastered. |
| Level 8 includes Neapolitan, augmented sixths, orchestration, sonata form, odd meters, polyrhythm | Advanced/high intermediate split across theory, analysis, orchestration | One level | Overloaded and not game-testable yet. |
| Level 10 includes fugue, post-tonal set theory, twentieth-century techniques, essay writing | Advanced theory/history/analysis | One level | Appropriate only as advanced branch, not a normal next step. |
| Exercise generation for Levels 5-10 | Should represent each objective with musical material | Mostly text-only multiple choice, many empty `notes` lists | Curriculum promise is not backed by gameplay. |
| Progression gate | Should use mastery, accuracy, fluency, and scaffolding evidence | `gradeLevel` is a stored integer with no visible advancement rules | Players can be stuck or advanced without pedagogical evidence. |

## Degenerate Strategies Found

- **Answer-reading instead of note-reading**: Practice can show the literal note name as a hint before answer selection, so the player can succeed without decoding pitch or staff position.
- **Multiple-choice memorization**: Higher levels often ask text labels without generated musical examples, so players can learn labels without hearing or reading the concept.
- **Curriculum browsing as progress**: The Curriculum Map displays objectives, but does not convert objectives into sequenced, playable tasks.
- **Confidence slider bypass**: Since confidence does not yet gate mastery stars or progression, players can keep full scaffolding forever without a distinct fluency goal.

## Recommended Curriculum Rebalance

### Level Bands

| Band | Current Levels | Recommended Role |
|---|---|---|
| Seed | 0 | Listening, same/different, high/low, loud/soft, steady beat. |
| Figurenotes | 1 | C-D-E, C major pentachord, simple keyboard mapping. |
| Staff Landmarks | 2 | Staff lines/spaces, middle C, treble G, bass F, steps/skips. |
| Rhythm Basics | 3 | Beat, note/rest values, 2/4, 3/4, 4/4, simple patterns. |
| Keys and Scales | 4 | C/G/F major first, A minor, then up to two sharps/flats. |
| Intervals and Triads | 5 | Steps/skips, 2nds/3rds/5ths/octave, major/minor triads. |
| Harmony Basics | 6 | I/IV/V/vi, simple cadences, root-position chord function. |
| Voice Leading and Counterpoint Intro | 7 | Contrary/parallel motion, spacing, first-species counterpoint. |
| Intermediate Expansion | 8 | Inversions, secondary dominants, modulation to close keys, forms. |
| Advanced Branches | 9-10 | Species counterpoint, chromatic harmony, fugue, post-tonal, analysis. |

### Topic Movement

| Topic | Current Location | Recommended Location |
|---|---|---|
| Alto clef | Level 4 | Optional intermediate module after strong treble/bass fluency. |
| Secondary dominants | Level 6 | Level 8 or advanced harmony branch. |
| Neapolitan and augmented sixths | Level 8 | Advanced harmony branch. |
| Sonata form | Level 8 | Analysis branch after binary/ternary/rondo. |
| Odd meters and polyrhythms | Level 8 | Rhythm branch, introduced gradually after simple/compound time. |
| Fugue and post-tonal set theory | Level 10 | Optional advanced capstone branch. |

## Playable Exercise Coverage Gaps

| Level | Current Generator | Needed Coverage |
|---|---|---|
| 0 | Pitch/timbre/dynamics placeholders | Actual audio/tap tasks or visual surrogate until audio is ready. |
| 1 | Note identification | Hide literal answer before input; add C-D-E/pentachord progression. |
| 2 | Rhythm label selection | Add tap-back, beat matching, rest recognition. |
| 3 | Key-signature text prompt | Add staff/key visual, scale construction, circle-of-fifths tasks. |
| 4 | Interval/triad labels | Add interval direction, harmonic vs melodic, triad building. |
| 5 | Cadence labels, no notes | Add chord progression examples and cadence function drills. |
| 6 | Voice-leading error labels, no score | Add actual two/four-voice snippets and ghost correction explanations. |
| 7 | Modulation labels only | Add close-key/pivot visual tasks after prerequisites. |
| 8 | Chromatic harmony labels only | Defer until chord/inversion/cadence systems are real. |
| 9 | Redirect to duel | Good, but unlock only after counterpoint foundations. |
| 10 | Text-only analysis tasks | Defer as capstone; not ready for current app slice. |

## Progression Model Recommendation

Each topic should track three mastery dimensions:

| Dimension | Meaning | Example Gate |
|---|---|---|
| Accuracy | Can answer correctly with current scaffolding | 80% over last 10 attempts. |
| Fluency | Can answer within target time or rhythm window | Median response under threshold. |
| Independence | Can answer with reduced scaffolding | Success at confidence >= 0.6. |

Suggested star model:

- 1 star: accurate with full scaffolding.
- 2 stars: accurate with partial scaffolding.
- 3 stars: accurate and fluent with low scaffolding.

Do not advance `gradeLevel` from total correct notes alone. Advance by topic mastery, then unlock the next recommended quest.

## Recommendations

| Priority | Issue | Suggested Fix | Impact |
|---|---|---|---|
| P0 | Practice answer reveal breaks the core loop | Hide literal target name until feedback or full-help mode | Restores trust in the learning loop. |
| P0 | Curriculum copy outruns playable content | Split curriculum into topic modules and map each objective to exercises | Makes the app pedagogically honest. |
| P1 | No mastery model | Add `SkillMastery` with accuracy, fluency, scaffolding independence | Enables next-best lesson and sticky progression. |
| P1 | Daily quest loop lacks data model | Add daily/recommended quest models tied to mastery gaps | Improves retention without busywork. |
| P1 | Advanced levels overloaded | Move advanced concepts into optional branches | Prevents learners from hitting impossible cliffs. |
| P2 | Higher exercises text-only | Add generated musical examples before expanding UI | Makes theory musical, not trivia. |

## Values That Need Attention

Initial tuning targets:

- Daily quest count: 1 task for first session; 3 tasks after first successful session.
- Quest duration: 60-180 seconds.
- Harmony reward: 10 points for warmup, 20 for recommended quest, 30 for hard/low-scaffold quest.
- Mastery accuracy threshold: 80% over last 10 attempts.
- Fluency threshold: start generous per topic; tune after playtests.
- Broken Blade recovery: one 60-second task should restore the daily streak state.

## Next Steps

1. Fix Practice answer reveal.
2. Create a `design/gdd/curriculum-progression.md` source of truth with the revised level bands.
3. Add `SkillMastery` and `Quest` models before redesigning Home.
4. Implement daily/recommended quest Home UX from `design/ux/core-learning-loop-home.md`.
5. Re-run this balance check after the first mastery/quest implementation.
