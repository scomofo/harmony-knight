# Quest of the Harmony Knight — Game Studio Agent Architecture

Music theory educational game for ADHD learners (Grade 0–8+), managed through
49 coordinated Claude Code subagents. Each agent owns a specific domain,
enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: Flutter 3.41+ (mobile + Windows desktop)
- **Language**: Dart 3.6+
- **State Management**: Riverpod 2.6 (StateNotifier pattern)
- **Navigation**: go_router 14
- **Audio**: just_audio + flutter_soloud
- **Pitch Detection**: pitch_detector_dart + flutter_audio_capture
- **Persistence**: path_provider (JSON files) + shared_preferences
- **Version Control**: Git with trunk-based development
- **Build System**: Flutter build system (flutter build windows / apk / ios)
- **Asset Pipeline**: assets/audio/, assets/images/, assets/fonts/ (currently placeholder)

> **Note**: This is a Flutter project, not Godot/Unity/Unreal. Engine-specialist
> agents for those engines are included but not applicable here.

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

Flutter 3.41+ / Dart 3.6+ — no engine-reference doc needed (use flutter.dev docs)

## Technical Preferences

@.claude/docs/technical-preferences.md

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

@.claude/docs/context-management.md
