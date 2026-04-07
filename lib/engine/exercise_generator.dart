import 'dart:math';
import 'package:harmony_knight/models/note.dart';
import 'package:harmony_knight/core/constants.dart';

/// Exercise generator for all 11 curriculum levels.
///
/// Each level produces exercises aligned with the curriculum objectives.
/// Exercises are procedurally generated for infinite variety.
class ExerciseGenerator {
  final Random _rng = Random();

  /// Generate an exercise for the given curriculum level.
  Exercise generate({required int level}) {
    switch (level) {
      case 0:
        return _level0SensoryEntry();
      case 1:
        return _level1NoteIdentification();
      case 2:
        return _level2RhythmBasics();
      case 3:
        return _level3ScalesAndKeys();
      case 4:
        return _level4IntervalsAndTriads();
      case 5:
        return _level5Cadences();
      case 6:
        return _level6PartWriting();
      case 7:
        return _level7Modulation();
      case 8:
        return _level8AdvancedHarmony();
      case 9:
        return _level9Counterpoint();
      case 10:
        return _level10FugueAnalysis();
      default:
        return _level1NoteIdentification();
    }
  }

  // ── Level 0: Sensory Entry Point ──

  Exercise _level0SensoryEntry() {
    final types = [
      ExerciseType.pitchDiscrimination,
      ExerciseType.timbreRecognition,
      ExerciseType.dynamicsAwareness,
    ];
    final type = types[_rng.nextInt(types.length)];

    switch (type) {
      case ExerciseType.pitchDiscrimination:
        // "Is this note higher or lower?"
        final base = 60 + _rng.nextInt(12);
        final offset = _rng.nextBool() ? _rng.nextInt(5) + 3 : -(_rng.nextInt(5) + 3);
        return Exercise(
          type: type,
          prompt: 'Is the second note higher or lower?',
          notes: [Note(midi: base), Note(midi: base + offset)],
          correctAnswer: offset > 0 ? 'Higher' : 'Lower',
          options: ['Higher', 'Lower'],
          level: 0,
        );
      case ExerciseType.timbreRecognition:
        final instruments = ['Piano', 'Guitar', 'Violin', 'Flute'];
        final correct = instruments[_rng.nextInt(instruments.length)];
        return Exercise(
          type: type,
          prompt: 'What instrument is playing?',
          notes: [Note(midi: 60 + _rng.nextInt(12))],
          correctAnswer: correct,
          options: instruments,
          level: 0,
        );
      default:
        return Exercise(
          type: ExerciseType.dynamicsAwareness,
          prompt: 'Is this loud or soft?',
          notes: [const Note(midi: 60)],
          correctAnswer: _rng.nextBool() ? 'Loud' : 'Soft',
          options: ['Loud', 'Soft'],
          level: 0,
        );
    }
  }

  // ── Level 1: Note Identification (Figurenotes) ──

  Exercise _level1NoteIdentification() {
    const cMajorNotes = [60, 62, 64, 65, 67, 69, 71];
    final targetMidi = cMajorNotes[_rng.nextInt(cMajorNotes.length)];
    final target = Note(midi: targetMidi);
    final options = (List<int>.from(cMajorNotes)..shuffle(_rng)).take(4).toList();
    if (!options.contains(targetMidi)) {
      options[0] = targetMidi;
      options.shuffle(_rng);
    }

    return Exercise(
      type: ExerciseType.noteIdentification,
      prompt: 'What note is this?',
      notes: [target],
      correctAnswer: target.name,
      options: options.map((m) => Note(midi: m).name).toList(),
      level: 1,
    );
  }

  // ── Level 2: Rhythm Basics ──

  Exercise _level2RhythmBasics() {
    final rhythms = [
      RhythmPattern('Whole Note', [4.0]),
      RhythmPattern('Half Notes', [2.0, 2.0]),
      RhythmPattern('Quarter Notes', [1.0, 1.0, 1.0, 1.0]),
      RhythmPattern('Eighth Notes', [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]),
      RhythmPattern('Dotted Half + Quarter', [3.0, 1.0]),
      RhythmPattern('Dotted Quarter + Eighth', [1.5, 0.5, 1.5, 0.5]),
    ];
    final correct = rhythms[_rng.nextInt(rhythms.length)];
    final options = (List<RhythmPattern>.from(rhythms)..shuffle(_rng))
        .take(4)
        .toList();
    if (!options.contains(correct)) {
      options[0] = correct;
      options.shuffle(_rng);
    }

    return Exercise(
      type: ExerciseType.rhythmIdentification,
      prompt: 'Tap the rhythm, then identify it:',
      notes: [const Note(midi: 60)],
      correctAnswer: correct.name,
      options: options.map((r) => r.name).toList(),
      metadata: {'rhythmBeats': correct.beats},
      level: 2,
    );
  }

  // ── Level 3: Scales and Key Signatures ──

  Exercise _level3ScalesAndKeys() {
    final keys = [
      KeyInfo('C Major', 0, true),
      KeyInfo('G Major', 1, true),
      KeyInfo('D Major', 2, true),
      KeyInfo('F Major', 1, true),
      KeyInfo('Bb Major', 2, true),
      KeyInfo('A Minor', 0, false),
      KeyInfo('E Minor', 1, false),
      KeyInfo('D Minor', 1, false),
    ];
    final correct = keys[_rng.nextInt(keys.length)];
    final options = (List<KeyInfo>.from(keys)..shuffle(_rng)).take(4).toList();
    if (!options.contains(correct)) {
      options[0] = correct;
      options.shuffle(_rng);
    }

    return Exercise(
      type: ExerciseType.keySignatureIdentification,
      prompt: 'What key has ${correct.accidentalCount} '
          '${correct.isMajor ? "sharp(s)" : "flat(s)"}?',
      notes: const [],
      correctAnswer: correct.name,
      options: options.map((k) => k.name).toList(),
      level: 3,
    );
  }

  // ── Level 4: Intervals and Triads ──

  Exercise _level4IntervalsAndTriads() {
    if (_rng.nextBool()) {
      return _intervalExercise();
    }
    return _triadExercise();
  }

  Exercise _intervalExercise() {
    const intervals = [
      IntervalInfo('Minor 2nd', 1),
      IntervalInfo('Major 2nd', 2),
      IntervalInfo('Minor 3rd', 3),
      IntervalInfo('Major 3rd', 4),
      IntervalInfo('Perfect 4th', 5),
      IntervalInfo('Tritone', 6),
      IntervalInfo('Perfect 5th', 7),
      IntervalInfo('Minor 6th', 8),
      IntervalInfo('Major 6th', 9),
      IntervalInfo('Minor 7th', 10),
      IntervalInfo('Major 7th', 11),
      IntervalInfo('Octave', 12),
    ];
    final correct = intervals[_rng.nextInt(intervals.length)];
    final baseMidi = 60 + _rng.nextInt(8);
    final options =
        (List<IntervalInfo>.from(intervals)..shuffle(_rng)).take(4).toList();
    if (!options.contains(correct)) {
      options[0] = correct;
      options.shuffle(_rng);
    }

    return Exercise(
      type: ExerciseType.intervalIdentification,
      prompt: 'What interval do you hear?',
      notes: [
        Note(midi: baseMidi),
        Note(midi: baseMidi + correct.semitones),
      ],
      correctAnswer: correct.name,
      options: options.map((i) => i.name).toList(),
      level: 4,
    );
  }

  Exercise _triadExercise() {
    final triads = [
      TriadInfo('Major', [0, 4, 7]),
      TriadInfo('Minor', [0, 3, 7]),
      TriadInfo('Augmented', [0, 4, 8]),
      TriadInfo('Diminished', [0, 3, 6]),
    ];
    final correct = triads[_rng.nextInt(triads.length)];
    final root = 60 + _rng.nextInt(8);

    return Exercise(
      type: ExerciseType.triadIdentification,
      prompt: 'What type of triad is this?',
      notes: correct.intervals.map((i) => Note(midi: root + i)).toList(),
      correctAnswer: correct.name,
      options: triads.map((t) => t.name).toList(),
      level: 4,
    );
  }

  // ── Level 5: Cadences ──

  Exercise _level5Cadences() {
    final cadences = [
      'Perfect Authentic (V → I)',
      'Imperfect Authentic (V → I, inverted)',
      'Plagal (IV → I)',
      'Half Cadence (→ V)',
      'Deceptive (V → vi)',
    ];
    final correct = cadences[_rng.nextInt(cadences.length)];
    final options = (List<String>.from(cadences)..shuffle(_rng)).take(4).toList();
    if (!options.contains(correct)) {
      options[0] = correct;
      options.shuffle(_rng);
    }

    return Exercise(
      type: ExerciseType.cadenceIdentification,
      prompt: 'What type of cadence do you hear?',
      notes: const [],
      correctAnswer: correct,
      options: options,
      level: 5,
    );
  }

  // ── Level 6: Part-Writing ──

  Exercise _level6PartWriting() {
    // Voice leading error detection exercises.
    final errors = [
      'Parallel Fifths',
      'Parallel Octaves',
      'Hidden Fifths',
      'Voice Crossing',
      'No Error',
    ];
    final correct = errors[_rng.nextInt(errors.length)];

    return Exercise(
      type: ExerciseType.voiceLeadingError,
      prompt: 'Identify the voice-leading error (if any):',
      notes: const [],
      correctAnswer: correct,
      options: errors,
      level: 6,
    );
  }

  // ── Level 7: Modulation ──

  Exercise _level7Modulation() {
    final modulations = [
      'C Major → G Major',
      'G Major → D Major',
      'F Major → C Major',
      'D Major → A Major',
      'Bb Major → F Major',
    ];
    final correct = modulations[_rng.nextInt(modulations.length)];
    final options =
        (List<String>.from(modulations)..shuffle(_rng)).take(4).toList();
    if (!options.contains(correct)) {
      options[0] = correct;
      options.shuffle(_rng);
    }

    return Exercise(
      type: ExerciseType.modulationIdentification,
      prompt: 'What modulation occurs in this passage?',
      notes: const [],
      correctAnswer: correct,
      options: options,
      level: 7,
    );
  }

  // ── Level 8: Advanced Harmony ──

  Exercise _level8AdvancedHarmony() {
    final chords = [
      'Neapolitan 6th',
      'Italian Augmented 6th',
      'French Augmented 6th',
      'German Augmented 6th',
      'Secondary Dominant (V/V)',
    ];
    final correct = chords[_rng.nextInt(chords.length)];
    final options = (List<String>.from(chords)..shuffle(_rng)).take(4).toList();
    if (!options.contains(correct)) {
      options[0] = correct;
      options.shuffle(_rng);
    }

    return Exercise(
      type: ExerciseType.chordIdentification,
      prompt: 'Identify this chromatic harmony:',
      notes: const [],
      correctAnswer: correct,
      options: options,
      level: 8,
    );
  }

  // ── Level 9: Counterpoint ──

  Exercise _level9Counterpoint() {
    return Exercise(
      type: ExerciseType.counterpointDuel,
      prompt: 'Complete the counterpoint against the cantus firmus.',
      notes: const [],
      correctAnswer: 'duel_mode',
      options: const [],
      metadata: {'redirectToDuel': true},
      level: 9,
    );
  }

  // ── Level 10: Fugue Analysis ──

  Exercise _level10FugueAnalysis() {
    final tasks = [
      'Identify the fugue subject',
      'Identify the answer (real or tonal)',
      'Locate the countersubject',
      'Find the stretto entries',
    ];
    final correct = tasks[_rng.nextInt(tasks.length)];

    return Exercise(
      type: ExerciseType.fugueAnalysis,
      prompt: correct,
      notes: const [],
      correctAnswer: correct,
      options: const [],
      level: 10,
    );
  }
}

/// A generated exercise with prompt, notes, and answer options.
class Exercise {
  final ExerciseType type;
  final String prompt;
  final List<Note> notes;
  final String correctAnswer;
  final List<String> options;
  final int level;
  final Map<String, dynamic>? metadata;

  const Exercise({
    required this.type,
    required this.prompt,
    required this.notes,
    required this.correctAnswer,
    required this.options,
    required this.level,
    this.metadata,
  });
}

enum ExerciseType {
  pitchDiscrimination,
  timbreRecognition,
  dynamicsAwareness,
  noteIdentification,
  rhythmIdentification,
  keySignatureIdentification,
  intervalIdentification,
  triadIdentification,
  cadenceIdentification,
  voiceLeadingError,
  modulationIdentification,
  chordIdentification,
  counterpointDuel,
  fugueAnalysis,
}

class RhythmPattern {
  final String name;
  final List<double> beats;
  const RhythmPattern(this.name, this.beats);
}

class KeyInfo {
  final String name;
  final int accidentalCount;
  final bool isMajor;
  const KeyInfo(this.name, this.accidentalCount, this.isMajor);
}

class IntervalInfo {
  final String name;
  final int semitones;
  const IntervalInfo(this.name, this.semitones);
}

class TriadInfo {
  final String name;
  final List<int> intervals;
  const TriadInfo(this.name, this.intervals);
}
