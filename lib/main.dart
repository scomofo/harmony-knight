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

  // Allow all orientations — the Row layout adapts to wide screens.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Dark system UI overlay for immersive experience.
  SystemChrome.setSystemUIOverlayStyle(const SystemUIOverlayStyle(
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
