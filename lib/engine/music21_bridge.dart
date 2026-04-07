import 'dart:convert';
import 'dart:io';
import 'package:harmony_knight/models/note.dart';

/// Bridge to the Python Music21 backend for advanced harmonic analysis.
///
/// Music21 is used for:
/// - Advanced counterpoint validation (Species 2-5)
/// - Harmonic analysis of complex chord progressions
/// - Figured bass realization
/// - Fugue subject/answer analysis
///
/// Communication is via JSON over a local HTTP API or subprocess.
/// The Python backend runs as a lightweight Flask/FastAPI server.
class Music21Bridge {
  /// Base URL for the Music21 backend API.
  final String baseUrl;

  /// Whether the backend is available (checked at startup).
  bool _isAvailable = false;
  bool get isAvailable => _isAvailable;

  Music21Bridge({this.baseUrl = 'http://localhost:5321'});

  /// Check if the Music21 backend is running.
  Future<bool> checkAvailability() async {
    try {
      final client = HttpClient()
        ..connectionTimeout = const Duration(seconds: 2);
      final request = await client.getUrl(Uri.parse('$baseUrl/health'));
      final response = await request.close();
      _isAvailable = response.statusCode == 200;
      client.close();
      return _isAvailable;
    } catch (e) {
      _isAvailable = false;
      return false;
    }
  }

  /// Validate a complete counterpoint exercise against Music21 rules.
  ///
  /// Returns detailed analysis including all violations and a grade.
  Future<CounterpointAnalysis> analyzeCounterpoint({
    required List<Note> cantusFirmus,
    required List<Note> counterpoint,
    int species = 1,
  }) async {
    if (!_isAvailable) {
      return CounterpointAnalysis.unavailable();
    }

    try {
      final body = jsonEncode({
        'cantus_firmus': cantusFirmus.map((n) => n.midi).toList(),
        'counterpoint': counterpoint.map((n) => n.midi).toList(),
        'species': species,
      });

      final client = HttpClient();
      final request = await client.postUrl(
        Uri.parse('$baseUrl/analyze/counterpoint'),
      );
      request.headers.set('Content-Type', 'application/json');
      request.write(body);
      final response = await request.close();
      final responseBody = await response.transform(utf8.decoder).join();
      client.close();

      if (response.statusCode == 200) {
        final json = jsonDecode(responseBody) as Map<String, dynamic>;
        return CounterpointAnalysis.fromJson(json);
      }
      return CounterpointAnalysis.unavailable();
    } catch (e) {
      return CounterpointAnalysis.unavailable();
    }
  }

  /// Analyze a chord progression for harmonic errors and quality.
  Future<HarmonicAnalysis> analyzeHarmony({
    required List<List<int>> chords, // Each chord = list of MIDI notes.
    required String key,
  }) async {
    if (!_isAvailable) {
      return HarmonicAnalysis.unavailable();
    }

    try {
      final body = jsonEncode({
        'chords': chords,
        'key': key,
      });

      final client = HttpClient();
      final request = await client.postUrl(
        Uri.parse('$baseUrl/analyze/harmony'),
      );
      request.headers.set('Content-Type', 'application/json');
      request.write(body);
      final response = await request.close();
      final responseBody = await response.transform(utf8.decoder).join();
      client.close();

      if (response.statusCode == 200) {
        final json = jsonDecode(responseBody) as Map<String, dynamic>;
        return HarmonicAnalysis.fromJson(json);
      }
      return HarmonicAnalysis.unavailable();
    } catch (e) {
      return HarmonicAnalysis.unavailable();
    }
  }

  /// Identify the subject and answer in a fugue excerpt.
  Future<FugueAnalysis> analyzeFugue({
    required List<List<int>> voices, // Each voice = list of MIDI notes.
  }) async {
    if (!_isAvailable) {
      return FugueAnalysis.unavailable();
    }

    try {
      final body = jsonEncode({'voices': voices});
      final client = HttpClient();
      final request = await client.postUrl(
        Uri.parse('$baseUrl/analyze/fugue'),
      );
      request.headers.set('Content-Type', 'application/json');
      request.write(body);
      final response = await request.close();
      final responseBody = await response.transform(utf8.decoder).join();
      client.close();

      if (response.statusCode == 200) {
        final json = jsonDecode(responseBody) as Map<String, dynamic>;
        return FugueAnalysis.fromJson(json);
      }
      return FugueAnalysis.unavailable();
    } catch (e) {
      return FugueAnalysis.unavailable();
    }
  }
}

/// Result of a counterpoint analysis from Music21.
class CounterpointAnalysis {
  final bool isAvailable;
  final double score; // 0.0 to 1.0.
  final List<String> violations;
  final List<String> suggestions;
  final String grade; // A, B, C, D, F.

  const CounterpointAnalysis({
    required this.isAvailable,
    this.score = 0,
    this.violations = const [],
    this.suggestions = const [],
    this.grade = '',
  });

  factory CounterpointAnalysis.unavailable() =>
      const CounterpointAnalysis(isAvailable: false);

  factory CounterpointAnalysis.fromJson(Map<String, dynamic> j) =>
      CounterpointAnalysis(
        isAvailable: true,
        score: (j['score'] as num?)?.toDouble() ?? 0,
        violations: (j['violations'] as List?)?.cast<String>() ?? [],
        suggestions: (j['suggestions'] as List?)?.cast<String>() ?? [],
        grade: j['grade'] as String? ?? '',
      );
}

/// Result of a harmonic analysis.
class HarmonicAnalysis {
  final bool isAvailable;
  final List<String> romanNumerals;
  final List<String> errors;
  final String key;

  const HarmonicAnalysis({
    required this.isAvailable,
    this.romanNumerals = const [],
    this.errors = const [],
    this.key = '',
  });

  factory HarmonicAnalysis.unavailable() =>
      const HarmonicAnalysis(isAvailable: false);

  factory HarmonicAnalysis.fromJson(Map<String, dynamic> j) =>
      HarmonicAnalysis(
        isAvailable: true,
        romanNumerals: (j['roman_numerals'] as List?)?.cast<String>() ?? [],
        errors: (j['errors'] as List?)?.cast<String>() ?? [],
        key: j['key'] as String? ?? '',
      );
}

/// Result of a fugue analysis.
class FugueAnalysis {
  final bool isAvailable;
  final List<int>? subjectMidi;
  final List<int>? answerMidi;
  final String answerType; // "real" or "tonal".
  final List<int>? countersubjectMidi;

  const FugueAnalysis({
    required this.isAvailable,
    this.subjectMidi,
    this.answerMidi,
    this.answerType = '',
    this.countersubjectMidi,
  });

  factory FugueAnalysis.unavailable() =>
      const FugueAnalysis(isAvailable: false);

  factory FugueAnalysis.fromJson(Map<String, dynamic> j) => FugueAnalysis(
        isAvailable: true,
        subjectMidi: (j['subject'] as List?)?.cast<int>(),
        answerMidi: (j['answer'] as List?)?.cast<int>(),
        answerType: j['answer_type'] as String? ?? '',
        countersubjectMidi: (j['countersubject'] as List?)?.cast<int>(),
      );
}
