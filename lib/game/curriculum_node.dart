import 'package:harmony_knight/game/question_type.dart';

/// A node in the theory curriculum — represents one concept to master.
class CurriculumNode {
  /// Unique identifier.
  final String id;

  /// Human-readable concept name.
  final String concept;

  /// Question types used to teach this concept.
  final List<QuestionType> types;

  /// Musical keys this concept is practiced in.
  final List<String> keys;

  /// Score threshold to advance past this node.
  final int requiredScore;

  const CurriculumNode({
    required this.id,
    required this.concept,
    required this.types,
    required this.keys,
    required this.requiredScore,
  });
}

/// The progressive theory curriculum.
///
/// Rules:
///   - Never introduce more than 1 new concept at once
///   - Repeat concepts until confident
///   - Escalate slowly
const theoryCurriculum = [
  CurriculumNode(
    id: 'chord_basics_c',
    concept: 'Chord Tones (C Major)',
    types: [QuestionType.chordTone],
    keys: ['C'],
    requiredScore: 50,
  ),
  CurriculumNode(
    id: 'chord_basics_g',
    concept: 'Chord Tones (G Major)',
    types: [QuestionType.chordTone],
    keys: ['G'],
    requiredScore: 50,
  ),
  CurriculumNode(
    id: 'scale_awareness_c',
    concept: 'Scale Awareness (C Major)',
    types: [QuestionType.scaleTone],
    keys: ['C'],
    requiredScore: 70,
  ),
  CurriculumNode(
    id: 'chord_and_scale_c',
    concept: 'Chords & Scales (C Major)',
    types: [QuestionType.chordTone, QuestionType.scaleTone],
    keys: ['C'],
    requiredScore: 80,
  ),
  CurriculumNode(
    id: 'resolution_c',
    concept: 'Resolution (C Major)',
    types: [QuestionType.resolution],
    keys: ['C'],
    requiredScore: 60,
  ),
  CurriculumNode(
    id: 'resolution_g',
    concept: 'Resolution (G Major)',
    types: [QuestionType.resolution],
    keys: ['G'],
    requiredScore: 60,
  ),
  CurriculumNode(
    id: 'mixed_c_g',
    concept: 'Mixed Review (C & G)',
    types: [QuestionType.chordTone, QuestionType.scaleTone, QuestionType.resolution],
    keys: ['C', 'G'],
    requiredScore: 100,
  ),
  CurriculumNode(
    id: 'chord_basics_f',
    concept: 'Chord Tones (F Major)',
    types: [QuestionType.chordTone],
    keys: ['F'],
    requiredScore: 50,
  ),
  CurriculumNode(
    id: 'intervals_intro',
    concept: 'Intervals',
    types: [QuestionType.interval],
    keys: ['C'],
    requiredScore: 70,
  ),
  CurriculumNode(
    id: 'minor_chords',
    concept: 'Minor Chords (A minor, D minor)',
    types: [QuestionType.chordTone],
    keys: ['Am', 'Dm'],
    requiredScore: 80,
  ),
];
