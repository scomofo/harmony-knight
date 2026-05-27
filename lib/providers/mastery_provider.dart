import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/models/skill_mastery.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MasteryNotifier extends StateNotifier<Map<String, SkillMastery>> {
  static const storageKey = 'mastery.topics';

  SharedPreferences? _prefs;

  MasteryNotifier({SharedPreferences? prefs})
      : _prefs = prefs,
        super(const {}) {
    if (prefs == null) {
      loadSavedState();
    } else {
      _loadFromPrefs(prefs);
    }
  }

  static String encodeState(Map<String, SkillMastery> state) {
    final json = {
      for (final entry in state.entries) entry.key: entry.value.toJson(),
    };
    return jsonEncode(json);
  }

  static Map<String, SkillMastery> decodeState(String value) {
    final json = jsonDecode(value) as Map<String, dynamic>;
    return {
      for (final entry in json.entries)
        entry.key: SkillMastery.fromJson(entry.value as Map<String, dynamic>),
    };
  }

  Future<SharedPreferences> get _store async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  Future<void> loadSavedState() async {
    _loadFromPrefs(await _store);
  }

  void _loadFromPrefs(SharedPreferences prefs) {
    final saved = prefs.getString(storageKey);
    if (saved == null) return;

    try {
      state = decodeState(saved);
    } catch (_) {
      state = const {};
    }
  }

  Future<void> _persist() async {
    final prefs = await _store;
    await prefs.setString(storageKey, encodeState(state));
  }

  Future<void> recordAttempt({
    required String topicId,
    required bool correct,
    required int responseMs,
    required double confidence,
  }) async {
    final current = state[topicId] ?? SkillMastery(topicId: topicId);
    state = {
      ...state,
      topicId: current.recordAttempt(
        correct: correct,
        responseMs: responseMs,
        confidence: confidence,
      ),
    };
    await _persist();
  }

  SkillMastery? masteryFor(String topicId) => state[topicId];
}

final masteryProvider =
    StateNotifierProvider<MasteryNotifier, Map<String, SkillMastery>>(
  (ref) => MasteryNotifier(),
);
