import 'package:go_router/go_router.dart';
import 'package:harmony_knight/screens/home_screen.dart';
import 'package:harmony_knight/screens/practice_screen.dart';
import 'package:harmony_knight/screens/duel_screen.dart';
import 'package:harmony_knight/screens/curriculum_screen.dart';
import 'package:harmony_knight/screens/circle_of_fifths_screen.dart';
import 'package:harmony_knight/screens/heatmap_screen.dart';
import 'package:harmony_knight/screens/settings_screen.dart';
import 'package:harmony_knight/screens/onboarding_screen.dart';
import 'package:harmony_knight/screens/game_screen.dart';

/// App router with simple, direct navigation paths.
///
/// Designed for low-friction entry: Onboarding → Game → Home/Practice/Duel.
/// No deep nesting, no hidden menus — the 10-Second Rule applies.
final appRouter = GoRouter(
  initialLocation: '/onboarding',
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
      path: '/game',
      builder: (context, state) => createGameScreen(),
    ),
    GoRoute(
      path: '/practice',
      builder: (context, state) {
        final isBrokenBlade = state.uri.queryParameters['mode'] == 'broken_blade';
        return PracticeScreen(isBrokenBladeMode: isBrokenBlade);
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
