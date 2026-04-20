import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:harmony_knight/screens/game_screen.dart';
import 'package:harmony_knight/ui/theme/app_theme.dart';

/// Theory-first onboarding: 3 steps.
///
/// Step 1: "Understand music. One concept at a time."
/// Step 2: Force interaction — user must choose a note to proceed.
/// Step 3: Guarantee success — C, E, or G always succeeds.
///
/// Transitions smoothly into the game screen with a fade.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _step = 0;
  bool _interacted = false; // Step 2: user pressed a key
  bool _success = false;    // Step 3: user found a chord tone
  String? _successNote;

  void _nextStep() {
    if (_step < 2) {
      setState(() {
        _step++;
        _interacted = false;
        _success = false;
        _successNote = null;
      });
    } else {
      _launchGame();
    }
  }

  void _launchGame() {
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => createGameScreen(),
        transitionsBuilder: (_, anim, __, child) {
          return FadeTransition(opacity: anim, child: child);
        },
        transitionDuration: const Duration(milliseconds: 400),
      ),
    );
  }

  void _onKeyPress(String noteName) {
    setState(() {
      _interacted = true;

      // Step 3: C, E, G guarantee success.
      if (_step == 2 && ['C', 'E', 'G'].contains(noteName)) {
        _success = true;
        _successNote = noteName;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              // Skip button.
              Align(
                alignment: Alignment.topRight,
                child: TextButton(
                  onPressed: _launchGame,
                  child: Text(
                    'Skip',
                    style: TextStyle(color: Colors.white.withAlpha(120)),
                  ),
                ),
              ),

              const Spacer(),

              // Step content.
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: _buildStep(),
              ),

              const Spacer(),

              // Page indicator.
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(3, (i) {
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: i == _step ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i == _step
                          ? AppTheme.accent
                          : Colors.grey.shade700,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                }),
              ),

              const SizedBox(height: 24),

              // Next / Start button.
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _canProceed() ? _nextStep : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade800,
                    disabledForegroundColor: Colors.grey.shade600,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    _step == 2 ? 'Start Learning' : 'Next',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  bool _canProceed() {
    switch (_step) {
      case 0:
        return true; // Step 1 is passive.
      case 1:
        return _interacted; // Must press a key.
      case 2:
        return _success; // Must find a chord tone.
      default:
        return false;
    }
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return _buildStep1();
      case 1:
        return _buildStep2();
      case 2:
        return _buildStep3();
      default:
        return const SizedBox.shrink();
    }
  }

  /// Step 1: Minimal intro.
  Widget _buildStep1() {
    return Column(
      key: const ValueKey(0),
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: AppTheme.accent.withAlpha(30),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.music_note, color: AppTheme.accent, size: 48),
        ),
        const SizedBox(height: 32),
        const Text(
          'Understand music.\nOne concept at a time.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.bold,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Read the context. Think. Choose.\nLearn why it works.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withAlpha(150),
            fontSize: 16,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  /// Step 2: Force interaction.
  Widget _buildStep2() {
    return Column(
      key: const ValueKey(1),
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: (_interacted ? AppTheme.success : AppTheme.accent).withAlpha(30),
            shape: BoxShape.circle,
          ),
          child: Icon(
            _interacted ? Icons.check : Icons.keyboard,
            color: _interacted ? AppTheme.success : AppTheme.accent,
            size: 48,
          ),
        ),
        const SizedBox(height: 32),
        Text(
          _interacted ? 'You got it!' : 'Choose any note to try it',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.bold,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 24),
        // Interactive note buttons.
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((n) {
            return ElevatedButton(
              onPressed: () => _onKeyPress(n),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF161B22),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: BorderSide(color: AppTheme.accent.withAlpha(80)),
                ),
              ),
              child: Text(n),
            );
          }).toList(),
        ),
      ],
    );
  }

  /// Step 3: Guarantee success with C, E, or G.
  Widget _buildStep3() {
    return Column(
      key: const ValueKey(2),
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: (_success ? AppTheme.success : AppTheme.accent).withAlpha(30),
            shape: BoxShape.circle,
          ),
          child: Icon(
            _success ? Icons.star : Icons.piano,
            color: _success ? AppTheme.success : AppTheme.accent,
            size: 48,
          ),
        ),
        const SizedBox(height: 32),
        const Text(
          'Which notes are stable\nover C major?',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.bold,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'The chord tones are C, E, and G',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withAlpha(150),
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 24),
        // Note buttons — C, E, G guaranteed to succeed.
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((n) {
            final isChordTone = ['C', 'E', 'G'].contains(n);
            return ElevatedButton(
              onPressed: _success ? null : () => _onKeyPress(n),
              style: ElevatedButton.styleFrom(
                backgroundColor: _successNote == n
                    ? AppTheme.success.withAlpha(40)
                    : const Color(0xFF161B22),
                foregroundColor: isChordTone && !_success
                    ? AppTheme.accent
                    : Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: BorderSide(
                    color: _successNote == n
                        ? AppTheme.success
                        : AppTheme.accent.withAlpha(80),
                  ),
                ),
              ),
              child: Text(n),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        // Success feedback.
        if (_success)
          const Text(
            'Correct \u2014 that\'s a chord tone of C major',
            style: TextStyle(
              color: AppTheme.success,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
      ],
    );
  }
}
