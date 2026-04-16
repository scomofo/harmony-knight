/// Types of theory questions the system can ask.
enum QuestionType {
  /// "Which note is stable over this chord?" — root, 3rd, 5th
  chordTone,

  /// "Which note fits this scale?" — any diatonic note
  scaleTone,

  /// "Which note resolves this tension?" — resolution to root/tonic
  resolution,

  /// "What interval is this?" — identify distance between notes
  interval,
}
