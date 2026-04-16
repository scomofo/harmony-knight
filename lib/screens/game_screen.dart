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

/// The main game screen with a web-friendly Row layout.
///
/// Left: main play area (challenge prompt, harmony bar, feedback, input pad).
/// Right: side panel (progress, current challenge, feedback summary).
///
/// Integrates keyboard input so users can play notes with the home row.
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

  /// Web/desktop layout: main area left, side panel right.
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

  /// Mobile layout: single column.
  Widget _buildNarrowLayout() {
    return _buildMainArea();
  }

  Widget _buildMainArea() {
    final game = widget.game;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Challenge prompt.
        Text(
          game.currentChallenge.prompt,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),

        const SizedBox(height: 24),

        // Harmony bar.
        HarmonyBar(game.harmonyValue),

        const SizedBox(height: 32),

        // Feedback banner.
        FeedbackBanner(game.lastFeedback),

        const Spacer(),

        // Keyboard hint.
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            'Keyboard: A=C  S=D  D=E  F=F  G=G  H=A  J=B',
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withAlpha(100),
            ),
          ),
        ),

        // Input pad.
        InputPad(onNote: game.onPlayerAction),
      ],
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
