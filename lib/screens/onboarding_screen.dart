import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// First-launch onboarding flow.
///
/// Designed for the 10-Second Rule: each page has ONE key concept,
/// large visuals, and minimal text. The user can skip at any time
/// (ADHD users shouldn't feel trapped in a tutorial).
///
/// Pages:
/// 1. Welcome — "You are the Harmony Knight"
/// 2. The Slider — Show the confidence slider mechanic
/// 3. Figurenotes — Explain color-coded notation
/// 4. Practice — Show the core gameplay loop
/// 5. Ready — Jump straight into the app
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  static const _pages = [
    _OnboardingPage(
      title: 'You Are the\nHarmony Knight',
      subtitle: 'A quest to master the language of music.',
      icon: Icons.shield,
      color: Color(0xFF7C4DFF),
      description:
          'Learn music theory from absolute zero to advanced analysis — '
          'at your own pace, in your own way.',
    ),
    _OnboardingPage(
      title: 'Your Confidence\nSlider',
      subtitle: 'Always in your control.',
      icon: Icons.tune,
      color: Color(0xFF4FC3F7),
      description:
          'Slide left for colorful shapes and helpful sounds. '
          'Slide right to read standard notation solo. '
          'Adjust anytime — it\'s never locked.',
    ),
    _OnboardingPage(
      title: 'Colors Are\nYour Guide',
      subtitle: 'Figurenotes make music visible.',
      icon: Icons.palette,
      color: Color(0xFFE53935),
      description:
          'Each note has a color and shape. C is a red circle. '
          'G is a blue circle. As you grow confident, the colors '
          'fade to standard black-and-white notation.',
    ),
    _OnboardingPage(
      title: 'Learn By\nPlaying',
      subtitle: 'No pressure. No timers.',
      icon: Icons.music_note,
      color: Color(0xFF2E7D32),
      description:
          'Every exercise waits for you. Get a streak going and '
          'unlock Fever Mode! Miss a few days? No problem — '
          'a quick warm-up restores your progress.',
    ),
    _OnboardingPage(
      title: 'Ready to\nBegin?',
      subtitle: 'Your quest awaits, Harmony Knight.',
      icon: Icons.play_arrow,
      color: Color(0xFFFFD54F),
      description: '',
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
    }
  }

  void _completeOnboarding() {
    // Mark onboarding as complete (would be persisted in production).
    context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      body: SafeArea(
        child: Column(
          children: [
            // Skip button — ADHD users shouldn't feel trapped.
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: _completeOnboarding,
                child: Text(
                  'Skip',
                  style: TextStyle(color: Colors.white.withAlpha(120)),
                ),
              ),
            ),

            // Page content.
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (page) => setState(() => _currentPage = page),
                itemCount: _pages.length,
                itemBuilder: (context, index) {
                  final page = _pages[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Icon.
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            color: page.color.withAlpha(30),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(page.icon, color: page.color, size: 48),
                        ),
                        const SizedBox(height: 32),
                        // Title.
                        Text(
                          page.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Subtitle.
                        Text(
                          page.subtitle,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: page.color,
                            fontSize: 16,
                          ),
                        ),
                        if (page.description.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            page.description,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white.withAlpha(150),
                              fontSize: 14,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),

            // Page indicator dots.
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (i) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _currentPage ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i == _currentPage
                        ? _pages[_currentPage].color
                        : Colors.grey.shade700,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),

            const SizedBox(height: 24),

            // Next / Start button.
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _nextPage,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _pages[_currentPage].color,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    _currentPage == _pages.length - 1
                        ? 'Begin Your Quest'
                        : 'Next',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPage {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final String description;

  const _OnboardingPage({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.description,
  });
}
