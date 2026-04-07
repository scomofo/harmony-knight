/// The full curriculum model aligned with the Adaptive Musical Pedagogy framework.
///
/// Three phases: Foundation (Levels Prep-4), Intermediate (5-8), Advanced (9-10+).
/// Each level has ADHD-specific engagement triggers and multisensory bridges.

enum CurriculumPhase { foundation, intermediate, advanced }

/// A single curriculum level with its learning objectives and ADHD optimizations.
class CurriculumLevel {
  final int level;
  final String title;
  final String subtitle;
  final CurriculumPhase phase;
  final List<String> objectives;
  final List<String> adhdTriggers;
  final String narrativeTheme;

  const CurriculumLevel({
    required this.level,
    required this.title,
    required this.subtitle,
    required this.phase,
    required this.objectives,
    required this.adhdTriggers,
    required this.narrativeTheme,
  });
}

/// The complete curriculum progression from Absolute Zero to Grade 8+.
class Curriculum {
  Curriculum._();

  static const List<CurriculumLevel> levels = [
    // Phase 1: Foundation ("The Seed Phase")
    CurriculumLevel(
      level: 0,
      title: 'The Sensory Entry Point',
      subtitle: 'Sound Before Sight',
      phase: CurriculumPhase.foundation,
      objectives: [
        'Timbre recognition games (what instrument is this?)',
        'High vs. low pitch discrimination',
        'Loud vs. soft dynamics awareness',
        'Beat-finding with haptic pulses',
        'Musical emotion identification',
      ],
      adhdTriggers: [
        'Immediate audio feedback on every tap',
        'No reading required — pure sound exploration',
        'Sessions capped at 3 minutes for first engagement',
      ],
      narrativeTheme: 'Awakening — The Composer-Knight discovers sound.',
    ),
    CurriculumLevel(
      level: 1,
      title: 'The Color-Coded Staff',
      subtitle: 'Figurenotes & Landmark Notes',
      phase: CurriculumPhase.foundation,
      objectives: [
        'Learn Figurenotes color/shape mapping (C=Red Circle, D=Brown Square, etc.)',
        'Identify and play notes on virtual keyboard using color cues',
        'Establish Landmark Notes (Middle C, Treble G, Bass F)',
        'Play simple melodies with full scaffolding',
        'Introduction to the 5-line staff with colored note heads',
      ],
      adhdTriggers: [
        'Figurenotes removes decoding bottleneck — play immediately',
        'Staff Fading Algorithm begins (colors → grayscale)',
        'Streak system activates with first correct melody',
      ],
      narrativeTheme: 'First Light — Learning the language of color and sound.',
    ),
    CurriculumLevel(
      level: 2,
      title: 'Rhythm & The Body',
      subtitle: 'Body Base-10 Method',
      phase: CurriculumPhase.foundation,
      objectives: [
        'Whole, half, quarter, and eighth note durations',
        'Body Base-10: whole note = arms wide, half = waist, quarter = clap',
        'Time signatures: 4/4, 3/4, 2/4',
        'Rest recognition and "silent tapping"',
        'Dot notation (dotted half, dotted quarter)',
      ],
      adhdTriggers: [
        'Kinesthetic rhythm games — tap, shake, conduct',
        'Haptic metronome pulses during exercises',
        'Micro-goal: each rhythm pattern is a 30-second challenge',
      ],
      narrativeTheme: 'The Pulse — Feeling the heartbeat of music.',
    ),
    CurriculumLevel(
      level: 3,
      title: 'Scales & Key Signatures',
      subtitle: 'The Map of the Musical World',
      phase: CurriculumPhase.foundation,
      objectives: [
        'Major scale construction (W-W-H-W-W-W-H pattern)',
        'Natural minor scale construction',
        'Key signatures up to 4 sharps/flats',
        'Circle of Fifths as a navigable "world map"',
        'Compound time signatures (6/8, 9/8)',
      ],
      adhdTriggers: [
        'Circle of Fifths is a literal game map — travel to unlock keys',
        'Each new key signature is a "new level"',
        '"Quick Win" challenges: name the key in under 5 seconds',
      ],
      narrativeTheme: 'The Map — Exploring the Plains of C Major to distant keys.',
    ),
    CurriculumLevel(
      level: 4,
      title: 'Intervals & Triads',
      subtitle: 'The Gliph System',
      phase: CurriculumPhase.foundation,
      objectives: [
        'All intervals from unison to octave (melodic and harmonic)',
        'The "Gliph" system: visual shapes for interval patterns on keyboard',
        'Major, minor, augmented, diminished triads',
        'Alto Clef introduction (C-Clef)',
        'Transposition basics',
      ],
      adhdTriggers: [
        'Gliphs provide consistent visual anchor across transpositions',
        'Interval ear-training with instant "play both" comparison',
        'Triad construction as a puzzle-piece assembly game',
      ],
      narrativeTheme: 'The Forge — Crafting harmonic building blocks.',
    ),

    // Phase 2: Intermediate ("The Growth Phase")
    CurriculumLevel(
      level: 5,
      title: 'Harmony Foundations',
      subtitle: 'Cadences as Musical Punctuation',
      phase: CurriculumPhase.intermediate,
      objectives: [
        'Roman numeral analysis (I, IV, V, vi)',
        'Perfect, imperfect, plagal, and deceptive cadences',
        'Cadences as "punctuation" (period = PAC, comma = HC)',
        'Chord inversions and figured bass basics',
        'Harmonic rhythm awareness',
      ],
      adhdTriggers: [
        'Cadence identification as "sentence completion" — hear and choose',
        'Color-coded Roman numerals (tonic=warm, dominant=cool)',
        'Each cadence type has a distinct sound + haptic pattern',
      ],
      narrativeTheme: 'The Grammar — Learning to speak in harmonic sentences.',
    ),
    CurriculumLevel(
      level: 6,
      title: 'Part-Writing & Score Analysis',
      subtitle: 'The Four Voices',
      phase: CurriculumPhase.intermediate,
      objectives: [
        'SATB voice leading fundamentals',
        'Parallel 5ths/8ves detection and avoidance',
        'Hidden (direct) 5ths and 8ves',
        'Voice overlap and crossing rules',
        'Secondary dominants (V/V) as "Emotional Power-ups"',
        'Secondary diminished chords',
      ],
      adhdTriggers: [
        'Real-time "Voice-Leading Warnings" — offending notes glow + haptic vibration',
        'Partial credit for identifying WHY a motion is wrong',
        'AI ghost notes suggest fixes instead of just "Wrong"',
      ],
      narrativeTheme: 'The Council — Four voices learning to speak as one.',
    ),
    CurriculumLevel(
      level: 7,
      title: 'Modulation & Pivot Chords',
      subtitle: 'The Gateway',
      phase: CurriculumPhase.intermediate,
      objectives: [
        'Pivot chord modulation with dual Roman numeral display',
        'Direct (phrase) modulation',
        'Sequential modulation patterns',
        'Modulation to closely related keys',
        'Small forms: Binary (AB), Ternary (ABA), Rondo',
      ],
      adhdTriggers: [
        '"Transparent Layering" — see both keys during pivot chords',
        'Modulation as "portal" mechanics — enter a gateway to a new key',
        'Form analysis as a color-coded map of the piece',
      ],
      narrativeTheme: 'The Gateway — Traveling between tonal worlds.',
    ),
    CurriculumLevel(
      level: 8,
      title: 'Advanced Harmony & Orchestration',
      subtitle: 'The Full Score',
      phase: CurriculumPhase.intermediate,
      objectives: [
        'Neapolitan 6th and Augmented 6th chords',
        'Modulation to distant keys',
        'Full orchestral score reading',
        'Sonata-Allegro form analysis',
        'Odd meters (5/8, 7/8) via "Ta-ka" subdivision method',
        'Polyrhythms (3 against 2, 4 against 3)',
      ],
      adhdTriggers: [
        'Orchestral score as "layered" view — isolate one voice at a time',
        'Odd meters built from Simple (2) + Compound (3) blocks',
        'Polyrhythm games with split-screen tapping',
      ],
      narrativeTheme: 'The Orchestra — Commanding the full harmonic army.',
    ),

    // Phase 3: Advanced ("The Fruit Phase")
    CurriculumLevel(
      level: 9,
      title: 'Advanced Counterpoint',
      subtitle: 'Species Counterpoint Skill Tree',
      phase: CurriculumPhase.advanced,
      objectives: [
        'First Species: note-against-note counterpoint',
        'Second Species: two notes against one',
        'Third Species: four notes against one',
        'Fourth Species: suspensions and syncopation',
        'Fifth Species: florid counterpoint (combining all)',
      ],
      adhdTriggers: [
        'Collaborative "Duel" with AI Discord Sentinel',
        'Wait-Mode: no timers, duel pauses until valid response',
        'Ghost Resolutions show why corrections work',
        'Harmony Meter: filling it = winning the duel',
      ],
      narrativeTheme: 'The Duel — Sparring with the Discord Sentinel.',
    ),
    CurriculumLevel(
      level: 10,
      title: 'Fugue, Analysis & Modernism',
      subtitle: 'The Masterwork',
      phase: CurriculumPhase.advanced,
      objectives: [
        'Fugue subject/answer/countersubject identification',
        'Fugal analysis of Bach inventions and WTC excerpts',
        'Post-tonal set theory basics (pitch-class sets)',
        'Twentieth-century techniques (whole-tone, octatonic)',
        'Full analytical essay on a complete sonata movement',
      ],
      adhdTriggers: [
        'Fugue analysis as "detective work" — find the subject in each voice',
        'Color-coded voice tracking across the full score',
        'Set theory as "pattern puzzles" with visual card matching',
      ],
      narrativeTheme: 'The Masterwork — Composing your own harmonic legacy.',
    ),
  ];

  /// Get levels for a specific phase.
  static List<CurriculumLevel> forPhase(CurriculumPhase phase) =>
      levels.where((l) => l.phase == phase).toList();

  /// Get a specific level by number.
  static CurriculumLevel? forLevel(int level) {
    final matches = levels.where((l) => l.level == level);
    return matches.isNotEmpty ? matches.first : null;
  }
}

/// Figurenotes color/shape mapping per the research curriculum.
/// Follows the standard Figurenotes system used in music therapy.
class FigurenotesMapping {
  FigurenotesMapping._();

  /// Standard Figurenotes note-to-color mapping.
  static const Map<String, String> noteColors = {
    'C': 'Red',
    'D': 'Brown',
    'E': 'Yellow',
    'F': 'Blue',
    'G': 'Light Blue',
    'A': 'Purple',
    'B': 'Green',
  };

  /// Octave 4 shapes.
  static const Map<String, String> octave4Shapes = {
    'C': 'Circle',
    'D': 'Square',
    'E': 'Triangle',
    'F': 'Diamond',
    'G': 'Half-circle',
    'A': 'Star',
    'B': 'Heart',
  };

  /// Octave 5 shapes (same shape with cross overlay to distinguish octave).
  static const Map<String, String> octave5Shapes = {
    'C': 'Circle with Cross',
    'D': 'Square with Cross',
    'E': 'Triangle with Cross',
    'F': 'Diamond with Cross',
    'G': 'Half-circle with Cross',
    'A': 'Star with Cross',
    'B': 'Heart with Cross',
  };
}
