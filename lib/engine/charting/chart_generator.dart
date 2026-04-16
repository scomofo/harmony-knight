import 'dart:convert';
import 'dart:io';

import '../core/chart_note.dart';
import 'chart.dart';

/// Generates charts from music21 server output.
///
/// CRITICAL: This is only ever called at chart load time (app startup,
/// level selection, etc.) — NEVER during the gameplay loop. Chart
/// generation can be slow (music21 is Python); the engine must not wait
/// on it mid-session.
class ChartGenerator {
  /// music21 server base URL.
  final String serverUrl;

  /// HTTP client for server communication.
  final HttpClient _client = HttpClient();

  ChartGenerator({this.serverUrl = 'http://127.0.0.1:8765'});

  /// Generate a chart from a music21 server endpoint.
  ///
  /// The server should return JSON matching [Chart.fromJson].
  Future<Chart> generateFromServer({
    required String endpoint,
    required Map<String, dynamic> payload,
  }) async {
    final uri = Uri.parse('$serverUrl$endpoint');
    final req = await _client.postUrl(uri);
    req.headers.contentType = ContentType.json;
    req.write(jsonEncode(payload));

    final res = await req.close();
    if (res.statusCode != 200) {
      throw StateError('Chart generation failed: ${res.statusCode}');
    }

    final body = await res.transform(utf8.decoder).join();
    final json = jsonDecode(body) as Map<String, dynamic>;
    return Chart.fromJson(json);
  }

  /// Load a precomputed chart from a local asset or file.
  Future<Chart> loadFromJson(String jsonString) async {
    final json = jsonDecode(jsonString) as Map<String, dynamic>;
    return Chart.fromJson(json);
  }

  /// Build a simple test chart in code (for smoke tests and development).
  static Chart buildTestChart({
    String title = 'Test Chart',
    double bpm = 120.0,
    int noteCount = 8,
    double spacing = 1.0,
    int startMidi = 60,
  }) {
    final notes = <ChartNote>[];
    for (int i = 0; i < noteCount; i++) {
      notes.add(ChartNote(
        time: 2.0 + i * spacing,
        duration: 0.0,
        midi: startMidi + (i % 8),
        lane: i % 4,
        id: i,
      ));
    }
    return Chart(
      title: title,
      bpm: bpm,
      durationSeconds: 2.0 + noteCount * spacing + 1.0,
      notes: notes,
    );
  }

  void dispose() {
    _client.close();
  }
}
