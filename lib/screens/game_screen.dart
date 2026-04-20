import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:harmony_knight/engine/duel_engine.dart';
import 'package:harmony_knight/game/evaluation_engine.dart';
import 'package:harmony_knight/game/game_state.dart';
import 'package:harmony_knight/game/sentinel.dart';
import 'package:harmony_knight/input/keyboard_input.dart';
import 'package:harmony_knight/ui/theme/app_theme.dart';
import 'package:harmony_knight/ui/widgets/feedback_banner.dart';
import 'package:harmony_knight/ui/widgets/harmony_bar.dart';
import 'package:harmony_knight/ui/widgets/input_pad.dart';
import 'package:harmony_knight/ui/widgets/side_panel.dart';

/// Theory-first game screen.
///
/// Flow: context -> question -> decision -> validation -> explanation -> Next.
/// The user sees the musical context, reads the question, chooses a note,
/// reads the explanation, then presses Next to continue.
class GameScreen extends StatefulWidget {
  final GameState game;

  const GameScreen(this.game, {super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late final KeyboardInputHandler _keyboardHandler;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _keyboardHandler = KeyboardInputHandler()
      ..onNote = (note) {
        widget.game.onPlayerAction(note);
      };

    widget.game.addListener(_onGameUpdate);
  }

  void _onGameUpdate() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.game.removeListener(_onGameUpdate);
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 700;

    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Harmony Knight',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/'),
        ),
      ),
      body: KeyboardListener(
        focusNode: _focusNode,
        autofocus: true,
        onKeyEvent: _keyboardHandler.handleKeyEvent,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: isWide ? _buildWideLayout() : _buildNarrowLayout(),
          ),
        ),
      ),
    );
  }

  Widget _buildWideLayout() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(flex: 2, child: _buildMainArea()),
        const SizedBox(width: 20),
        Expanded(flex: 1, child: SidePanel(widget.game)),
      ],
    );
  }

  Widget _buildNarrowLayout() {
    return _buildMainArea();
  }

  Widget _buildMainArea() {
    final game = widget.game;
    final challenge = game.currentChallenge;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Concept label.
        Text(
          game.currentConcept,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppTheme.accent,
            letterSpacing: 1.2,
          ),
        ),

        const SizedBox(height: 12),

        // Musical context (key + chord).
        Row(
          children: [
            _contextChip('Key', challenge.context.key),
            const SizedBox(width: 12),
            _contextChip('Chord', challenge.context.chordName),
          ],
        ),

        const SizedBox(height: 20),

        // Question.
        Text(
          challenge.question,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Colors.white,
            height: 1.3,
          ),
        ),

        // Hint.
        if (challenge.hint.isNotEmpty && !game.awaitingNext) ...[
          const SizedBox(height: 8),
          Text(
            challenge.hint,
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withAlpha(120),
            ),
          ),
        ],

        const SizedBox(height: 20),

        // Stability bar.
        HarmonyBar(game.stabilityValue),

        const SizedBox(height: 24),

        // Explanation (visible after answering).
        if (game.awaitingNext)
          FeedbackBanner(game.lastFeedback, hint: game.lastHint),

        const Spacer(),

        // Insight (subtle, below input area).
        if (game.insights.buildInsight().isNotEmpty && !game.awaitingNext)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              game.insights.buildInsight(),
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withAlpha(100),
                fontStyle: FontStyle.italic,
              ),
            ),
          ),

        // Input area or Next button.
        if (game.awaitingNext)
          _buildNextButton()
        else ...[
          // Label.
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'Select a note:',
              style: TextStyle(
                fontSize: 13,
                color: Colors.white.withAlpha(150),
              ),
            ),
          ),
          InputPad(onNote: game.onPlayerAction),
          const SizedBox(height: 8),
          Text(
            'Keyboard: A=C  S=D  D=E  F=F  G=G  H=A  J=B',
            style: TextStyle(
              fontSize: 11,
              color: Colors.white.withAlpha(80),
            ),
          ),
        ],
      ],
    );
  }

  Widget _contextChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.darkSurface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withAlpha(30)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label: ',
            style: TextStyle(
              fontSize: 13,
              color: Colors.white.withAlpha(120),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNextButton() {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: () => widget.game.advanceToNext(),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.accent,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: const Text(
          'Next Question',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

/// Factory to create a GameScreen with all dependencies wired.
GameScreen createGameScreen() {
  final game = GameState(
    duel: DuelEngine(),
    evaluator: EvaluationEngine(),
    sentinel: Sentinel(),
  );
  return GameScreen(game);
}
