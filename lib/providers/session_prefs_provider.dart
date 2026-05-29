import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// User-configurable session preferences.
class SessionPrefs {
  final int sessionLengthMinutes;
  final int warmUpNotes;
  final int newItemsPerSession;
  final bool metronomeEnabled;
  final bool hapticEnabled;
  final bool reduceMotion;

  const SessionPrefs({
    this.sessionLengthMinutes = 12,
    this.warmUpNotes = 3,
    this.newItemsPerSession = 20,
    this.metronomeEnabled = true,
    this.hapticEnabled = true,
    this.reduceMotion = false,
  });

  SessionPrefs copyWith({
    int? sessionLengthMinutes,
    int? warmUpNotes,
    int? newItemsPerSession,
    bool? metronomeEnabled,
    bool? hapticEnabled,
    bool? reduceMotion,
  }) =>
      SessionPrefs(
        sessionLengthMinutes:
            sessionLengthMinutes ?? this.sessionLengthMinutes,
        warmUpNotes: warmUpNotes ?? this.warmUpNotes,
        newItemsPerSession: newItemsPerSession ?? this.newItemsPerSession,
        metronomeEnabled: metronomeEnabled ?? this.metronomeEnabled,
        hapticEnabled: hapticEnabled ?? this.hapticEnabled,
        reduceMotion: reduceMotion ?? this.reduceMotion,
      );
}

/// Persists session preferences to SharedPreferences.
class SessionPrefsNotifier extends StateNotifier<SessionPrefs> {
  static const _keyLength = 'session_length';
  static const _keyWarmUp = 'warm_up_notes';
  static const _keyNewItems = 'new_items_per_session';
  static const _keyMetronome = 'metronome_enabled';
  static const _keyHaptic = 'haptic_enabled';
  static const _keyReduceMotion = 'reduce_motion';

  SessionPrefsNotifier() : super(const SessionPrefs()) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final p = await SharedPreferences.getInstance();
    if (!mounted) return;
    state = SessionPrefs(
      sessionLengthMinutes: p.getInt(_keyLength) ?? 12,
      warmUpNotes: p.getInt(_keyWarmUp) ?? 3,
      newItemsPerSession: p.getInt(_keyNewItems) ?? 20,
      metronomeEnabled: p.getBool(_keyMetronome) ?? true,
      hapticEnabled: p.getBool(_keyHaptic) ?? true,
      reduceMotion: p.getBool(_keyReduceMotion) ?? false,
    );
  }

  Future<void> _prefs(Future<void> Function(SharedPreferences) fn) async {
    final p = await SharedPreferences.getInstance();
    await fn(p);
  }

  void setSessionLength(int minutes) {
    state = state.copyWith(sessionLengthMinutes: minutes.clamp(10, 20));
    _prefs((p) async => p.setInt(_keyLength, state.sessionLengthMinutes));
  }

  void setWarmUpNotes(int count) {
    state = state.copyWith(warmUpNotes: count.clamp(1, 10));
    _prefs((p) async => p.setInt(_keyWarmUp, state.warmUpNotes));
  }

  void setNewItemsPerSession(int count) {
    state = state.copyWith(newItemsPerSession: count.clamp(5, 30));
    _prefs((p) async => p.setInt(_keyNewItems, state.newItemsPerSession));
  }

  void setMetronomeEnabled(bool enabled) {
    state = state.copyWith(metronomeEnabled: enabled);
    _prefs((p) async => p.setBool(_keyMetronome, enabled));
  }

  void setHapticEnabled(bool enabled) {
    state = state.copyWith(hapticEnabled: enabled);
    _prefs((p) async => p.setBool(_keyHaptic, enabled));
  }

  void setReduceMotion(bool enabled) {
    state = state.copyWith(reduceMotion: enabled);
    _prefs((p) async => p.setBool(_keyReduceMotion, enabled));
  }
}

final sessionPrefsProvider =
    StateNotifierProvider<SessionPrefsNotifier, SessionPrefs>((ref) {
  return SessionPrefsNotifier();
});
