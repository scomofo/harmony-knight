import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * PWA install nudge. Captures the browser's install prompt when available
 * (Chrome/Edge/Android); on iOS Safari, which has no prompt event, shows
 * the manual Add-to-Home-Screen path instead. Never nags after dismissal.
 */
export function InstallApp() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isInstalled());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setInstalled(true);
    else setDismissed(true);
  };

  if (installed) {
    return <p className="text-sm text-emerald-200">Installed — launch it from your home screen. It works offline.</p>;
  }
  if (dismissed) return null;
  if (deferred) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold"
      >
        Install Harmony Knight
      </button>
    );
  }
  return (
    <p className="text-sm text-white/60">
      To install on this device: open your browser&apos;s Share menu and choose{" "}
      <span className="font-semibold text-white/80">Add to Home Screen</span>. Installed, the app
      opens fullscreen and works offline.
    </p>
  );
}
