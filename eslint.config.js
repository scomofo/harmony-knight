// Minimal ESLint flat config: TypeScript-aware linting via typescript-eslint,
// plus the two classic React Hooks rules (the codebase already carries
// eslint-disable comments for react-hooks/exhaustive-deps). The plugin's
// newer React Compiler rules are intentionally off — the app isn't written
// against them.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
