import { useEffect } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { stopAll } from "./lib/game/audio.ts";
import { cancelEffects, setMotionPolicy } from "./lib/game/effects.ts";
import { useStore } from "./lib/game/store.ts";
import { EffectLayer } from "./components/game/EffectLayer.tsx";
import { BreakReminder } from "./components/game/BreakReminder.tsx";
import { HomeScreen, LearningPathScreen, OnboardingScreen } from "./routes/Screens.tsx";
import { PracticeScreen } from "./routes/PracticeScreen.tsx";
import { LessonScreen } from "./routes/LessonScreen.tsx";
import { SettingsScreen } from "./routes/SettingsScreen.tsx";
import { GamesScreen } from "./routes/GamesScreen.tsx";
import { StudiesHubScreen, StudyDrillScreen } from "./routes/StudiesScreen.tsx";
import { CreationsScreen } from "./routes/CreationsScreen.tsx";
import { StrikeScreen } from "./routes/StrikeScreen.tsx";
import { DuelScreen } from "./routes/DuelScreen.tsx";
import { GradesScreen } from "./routes/GradesScreen.tsx";
import { GrownUpsScreen } from "./routes/GrownUpsScreen.tsx";
import { SharedScreen } from "./routes/SharedScreen.tsx";
import { SingScreen } from "./routes/SingScreen.tsx";

const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/onboarding/, "Begin your quest"],
  [/^\/path/, "Learning path"],
  [/^\/lesson/, "Lesson"],
  [/^\/practice/, "Practice"],
  [/^\/games/, "Play"],
  [/^\/studies/, "Studies"],
  [/^\/create/, "Create"],
  [/^\/strike/, "Strike"],
  [/^\/duel/, "Duel"],
  [/^\/grades/, "Grades"],
  [/^\/grown-ups/, "Grown-ups"],
  [/^\/shared/, "Shared melody"],
  [/^\/sing/, "Singing studio"],
  [/^\/settings/, "Settings"],
];

/** Page title for a pathname. Exported for tests. */
export function titleFor(pathname: string): string {
  const hit = ROUTE_TITLES.find(([re]) => re.test(pathname));
  return hit ? `Harmony Knight — ${hit[1]}` : "Harmony Knight — music theory, one idea at a time";
}

function Shell() {
  const settings = useStore((s) => s.save.settings);
  const onboarded = useStore((s) => s.save.onboarded);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Apply motion/audio policy from saved settings on boot.
  useEffect(() => {
    setMotionPolicy({
      reducedMotion: settings.reducedMotion,
      highContrast: settings.highContrast,
      focusMode: settings.focusMode,
      muted: settings.muted,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab hiding pauses everything: audio, effects, timers.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        stopAll();
        cancelEffects();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!onboarded) navigate({ to: "/onboarding" });
  }, [onboarded, navigate]);

  // Navigating away is a documented interruption: stop in-flight sound and
  // effects, name the new page, and move focus to its main region so
  // keyboard and screen-reader users land in the right place.
  useEffect(() => {
    stopAll();
    cancelEffects();
    document.title = titleFor(pathname);
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <EffectLayer />
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-2xl items-center gap-4 p-3 text-sm">
          <Link to="/" className="font-bold text-amber-200">
            ⚔️ Harmony Knight
          </Link>
          <Link to="/path" className="text-white/70 hover:text-white">
            Path
          </Link>
          <Link to="/practice" className="text-white/70 hover:text-white">
            Practice
          </Link>
          <Link to="/games" className="text-white/70 hover:text-white">
            Play
          </Link>
          <Link to="/settings" className="ml-auto text-white/70 hover:text-white">
            Settings
          </Link>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <BreakReminder />
    </div>
  );
}

const rootRoute = createRootRoute({ component: Shell });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeScreen });
const onboardingRoute = createRoute({ getParentRoute: () => rootRoute, path: "/onboarding", component: OnboardingScreen });
const pathRoute = createRoute({ getParentRoute: () => rootRoute, path: "/path", component: LearningPathScreen });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/settings", component: SettingsScreen });
const lessonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lesson/$lessonId",
  component: function LessonRoute() {
    const { lessonId } = lessonRoute.useParams();
    return <LessonScreen lessonId={lessonId} />;
  },
});

const practiceRoute = createRoute({ getParentRoute: () => rootRoute, path: "/practice", component: PracticeScreen });
const gamesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/games", component: GamesScreen });
const studiesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/studies", component: StudiesHubScreen });
const studyDrillRoute = createRoute({ getParentRoute: () => rootRoute, path: "/studies/$studyId", component: StudyDrillScreen });
const creationsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/create", component: CreationsScreen });
const strikeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/strike", component: StrikeScreen });
const duelRoute = createRoute({ getParentRoute: () => rootRoute, path: "/duel", component: DuelScreen });
const gradesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/grades", component: GradesScreen });
const grownUpsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/grown-ups", component: GrownUpsScreen });
const sharedRoute = createRoute({ getParentRoute: () => rootRoute, path: "/shared/$payload", component: SharedScreen });
const singRoute = createRoute({ getParentRoute: () => rootRoute, path: "/sing", component: SingScreen });

const routeTree = rootRoute.addChildren([indexRoute, onboardingRoute, pathRoute, practiceRoute, settingsRoute, lessonRoute, gamesRoute, studiesRoute, studyDrillRoute, creationsRoute, strikeRoute, duelRoute, gradesRoute, grownUpsRoute, sharedRoute, singRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return <RouterProvider router={router} />;
}
