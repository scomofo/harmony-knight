import 'package:go_router/go_router.dart';
import 'package:harmony_knight/screens/home_screen.dart';
import 'package:harmony_knight/screens/practice_screen.dart';
import 'package:harmony_knight/screens/duel_screen.dart';
import 'package:harmony_knight/screens/curriculum_screen.dart';
import 'package:harmony_knight/screens/circle_of_fifths_screen.dart';
import 'package:harmony_knight/screens/heatmap_screen.dart';
import 'package:harmony_knight/screens/settings_screen.dart';
import 'package:harmony_knight/screens/onboarding_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// App router with simple, direct navigation paths.
///
/// Designed for low-friction entry: Home → Practice/Duel/Curriculum.
/// No deep nesting, no hidden menus — the 10-Second Rule applies.
final appRouter = GoRouter(
  initialLocation: '/',
  redirect: (context, state) async {
    // Show onboarding on first launch only (redirect from home, not from within onboarding).
    if (state.matchedLocation == '/') {
      final prefs = await SharedPreferences.getInstance();
      final done = prefs.getBool('onboarding_done') ?? false;
      if (!done) return '/onboarding';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/practice',
      builder: (context, state) {
        final mode = state.uri.queryParameters['mode'];
        return PracticeScreen(
          isBrokenBladeMode: mode == 'broken_blade',
          isFocusMode: mode == 'focus',
        );
      },
    ),
    GoRoute(
      path: '/duel',
      builder: (context, state) => const DuelScreen(),
    ),
    GoRoute(
      path: '/curriculum',
      builder: (context, state) => const CurriculumScreen(),
    ),
    GoRoute(
      path: '/circle-of-fifths',
      builder: (context, state) => const CircleOfFifthsScreen(),
    ),
    GoRoute(
      path: '/heatmap',
      builder: (context, state) => const HeatmapScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
);
