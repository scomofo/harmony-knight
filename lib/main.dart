import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/core/router.dart';
import 'package:harmony_knight/engine/audio_service.dart';

/// Quest of the Harmony Knight
///
/// A neuro-inclusive, high-performance music theory app (Grade 0–8+)
/// optimized for ADHD learners using multisensory engagement, user-led
/// scaffolding, and collaborative AI mechanics.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Route framework errors (widget build/layout/paint failures) through
  // debugPrint so they're visible in logs instead of vanishing, while
  // keeping the default presentation (red screen in debug) for developers.
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('FlutterError: ${details.exceptionAsString()}');
  };

  // Route uncaught async errors (outside the Flutter framework's own error
  // handling, e.g. an unawaited Future) the same way instead of letting
  // them crash the app silently.
  WidgetsBinding.instance.platformDispatcher.onError = (error, stack) {
    debugPrint('Uncaught async error: $error\n$stack');
    return true;
  };

  // In release builds, replace the default red screen of death with a
  // friendlier fallback — this app's audience is children, and a raw
  // stack trace is neither helpful nor age-appropriate.
  if (kReleaseMode) {
    ErrorWidget.builder = (FlutterErrorDetails details) => const _FriendlyErrorScreen();
  }

  // Force portrait orientation for consistent layout.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Dark system UI overlay for immersive experience.
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0D1117),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // Initialize the audio engine (non-blocking — app works without audio).
  try {
    await AudioService().initialize();
  } catch (e) {
    debugPrint('Audio init failed (non-critical): $e');
  }

  runApp(const ProviderScope(child: HarmonyKnightApp()));
}

/// Shown in place of the default red error screen in release builds when a
/// widget throws during build. Kept intentionally simple so it renders
/// safely under any parent constraints.
class _FriendlyErrorScreen extends StatelessWidget {
  const _FriendlyErrorScreen();

  @override
  Widget build(BuildContext context) {
    return const Material(
      color: Color(0xFF0D1117),
      child: Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Oops — this screen hit a snag.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70),
          ),
        ),
      ),
    );
  }
}

class HarmonyKnightApp extends StatelessWidget {
  const HarmonyKnightApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Harmony Knight',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0D1117),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF7C4DFF),
          secondary: Color(0xFF4FC3F7),
          surface: Color(0xFF161B22),
        ),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      routerConfig: appRouter,
    );
  }
}
