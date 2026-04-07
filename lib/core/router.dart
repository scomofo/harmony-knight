import 'package:go_router/go_router.dart';
import 'package:harmony_knight/screens/home_screen.dart';
import 'package:harmony_knight/screens/practice_screen.dart';
import 'package:harmony_knight/screens/duel_screen.dart';
import 'package:harmony_knight/screens/curriculum_screen.dart';

/// App router with simple, direct navigation paths.
///
/// Designed for low-friction entry: Home → Practice/Duel/Curriculum.
/// No deep nesting, no hidden menus — the 10-Second Rule applies.
final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
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
  ],
);
