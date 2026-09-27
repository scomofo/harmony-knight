import { useEffect, useRef, useState } from "react";
import { useStore } from "../../lib/game/store.ts";
import {
  MAX_PROFILE_NAME_LENGTH,
  PROFILE_AVATARS,
  type ProfileData,
} from "../../lib/game/schema.ts";

type DialogMode =
  | { kind: "list" }
  | { kind: "add" }
  | { kind: "edit"; id: string }
  | { kind: "delete"; id: string };

function summary(p: ProfileData): string {
  return `${p.save.harmonyPoints} points · Grade ${p.save.grade}`;
}

/**
 * Household profile switcher, shown on the home screen. Kids pick who is
 * playing; each profile keeps its own full save (progress, points,
 * creations, settings). All controls are labelled for assistive tech.
 */
export function ProfileSwitcher() {
  const profiles = useStore((s) => s.profiles);
  const activeProfileId = useStore((s) => s.activeProfileId);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>({ kind: "list" });

  const active = profiles[activeProfileId];
  const list = Object.values(profiles).sort((a, b) => a.createdAt - b.createdAt);

  const close = () => {
    setOpen(false);
    setMode({ kind: "list" });
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={active ? `Switch profile. Current profile: ${active.name}` : "Switch profile"}
        className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
      >
        <span className="text-3xl" aria-hidden>
          {active?.avatar ?? "⚔️"}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{active?.name ?? "…"}</span>
          <span className="block text-xs text-white/50">
            {active ? summary(active) : ""} · Switch
          </span>
        </span>
        <span className="text-white/40" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ProfileDialog mode={mode} setMode={setMode} close={close} list={list} activeProfileId={activeProfileId} />
      )}
    </div>
  );
}

function ProfileDialog({
  mode,
  setMode,
  close,
  list,
  activeProfileId,
}: {
  mode: DialogMode;
  setMode: (m: DialogMode) => void;
  close: () => void;
  list: ProfileData[];
  activeProfileId: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const title =
    mode.kind === "add"
      ? "New profile"
      : mode.kind === "edit"
        ? "Edit profile"
        : mode.kind === "delete"
          ? "Delete profile"
          : "Who's playing?";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-[#1d1533] p-5 outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close profile switcher"
            className="rounded-lg px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {mode.kind === "list" && (
          <ProfileList list={list} activeProfileId={activeProfileId} setMode={setMode} close={close} />
        )}
        {mode.kind === "add" && <ProfileForm setMode={setMode} />}
        {mode.kind === "edit" && <ProfileForm setMode={setMode} editingId={mode.id} />}
        {mode.kind === "delete" && (
          <DeleteConfirm id={mode.id} setMode={setMode} isLast={list.length === 1} />
        )}
      </div>
    </div>
  );
}

function ProfileList({
  list,
  activeProfileId,
  setMode,
  close,
}: {
  list: ProfileData[];
  activeProfileId: string;
  setMode: (m: DialogMode) => void;
  close: () => void;
}) {
  const switchProfile = useStore((s) => s.switchProfile);

  return (
    <>
      <ul className="mt-4 space-y-2">
        {list.map((p) => {
          const isActive = p.id === activeProfileId;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-xl border p-2 ${
                isActive ? "border-indigo-400/50 bg-indigo-500/15" : "border-white/10 bg-white/5"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  switchProfile(p.id);
                  close();
                }}
                aria-current={isActive ? "true" : undefined}
                aria-label={isActive ? `${p.name}, current profile` : `Switch to ${p.name}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-left"
              >
                <span className="text-3xl" aria-hidden>
                  {p.avatar}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {p.name}
                    {isActive && (
                      <span className="ml-2 text-xs font-normal text-indigo-300">✓ current</span>
                    )}
                  </span>
                  <span className="block text-xs text-white/50">{summary(p)}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode({ kind: "edit", id: p.id })}
                aria-label={`Rename ${p.name}`}
                title={`Rename ${p.name}`}
                className="rounded-lg px-2 py-1 text-lg text-white/60 hover:bg-white/10 hover:text-white"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => setMode({ kind: "delete", id: p.id })}
                aria-label={`Delete ${p.name}`}
                title={`Delete ${p.name}`}
                className="rounded-lg px-2 py-1 text-lg text-white/60 hover:bg-white/10 hover:text-white"
              >
                🗑️
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => setMode({ kind: "add" })}
        className="mt-4 w-full rounded-xl border border-dashed border-white/25 px-4 py-3 font-semibold text-white/80 hover:bg-white/5"
      >
        ＋ Add a profile
      </button>
      <p className="mt-3 text-center text-xs text-white/40">
        Each profile keeps its own progress, points, and creations on this device.
      </p>
    </>
  );
}

function ProfileForm({
  setMode,
  editingId,
}: {
  setMode: (m: DialogMode) => void;
  editingId?: string;
}) {
  const profiles = useStore((s) => s.profiles);
  const addProfile = useStore((s) => s.addProfile);
  const updateProfile = useStore((s) => s.updateProfile);
  const existing = editingId ? profiles[editingId] : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [avatar, setAvatar] = useState(existing?.avatar ?? PROFILE_AVATARS[0]);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (name.trim().length === 0) {
      setError("Give the profile a name first.");
      return;
    }
    if (existing) updateProfile(existing.id, { name, avatar });
    else addProfile(name, avatar);
    setMode({ kind: "list" });
  };

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <label htmlFor="profile-name" className="block text-sm font-semibold text-white/80">
          Profile name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_PROFILE_NAME_LENGTH}
          autoComplete="off"
          placeholder="e.g. Maya"
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-lg"
        />
      </div>
      <div>
        <p id="avatar-label" className="text-sm font-semibold text-white/80">
          Pick an avatar
        </p>
        <div role="radiogroup" aria-labelledby="avatar-label" className="mt-2 grid grid-cols-6 gap-2">
          {PROFILE_AVATARS.map((a) => {
            const selected = a === avatar;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Avatar ${a}`}
                onClick={() => setAvatar(a)}
                className={`rounded-xl border p-2 text-2xl ${
                  selected
                    ? "border-indigo-400 bg-indigo-500/25"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span aria-hidden>{a}</span>
              </button>
            );
          })}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white"
        >
          {existing ? "Save changes" : "Create profile"}
        </button>
        <button
          type="button"
          onClick={() => setMode({ kind: "list" })}
          className="rounded-xl border border-white/20 px-4 py-3"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteConfirm({
  id,
  setMode,
  isLast,
}: {
  id: string;
  setMode: (m: DialogMode) => void;
  isLast: boolean;
}) {
  const profiles = useStore((s) => s.profiles);
  const deleteProfile = useStore((s) => s.deleteProfile);
  const profile = profiles[id];
  const [typed, setTyped] = useState("");

  if (!profile) {
    return (
      <div className="mt-4">
        <p className="text-sm text-white/60">That profile is already gone.</p>
        <button
          type="button"
          onClick={() => setMode({ kind: "list" })}
          className="mt-3 rounded-xl border border-white/20 px-4 py-2"
        >
          Back
        </button>
      </div>
    );
  }

  const matches = typed.trim() === profile.name;

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm leading-relaxed text-white/75">
        Deleting <strong>{profile.name}</strong> erases their progress, points, and creations
        forever. This can&apos;t be undone.
        {isLast && (
          <>
            {" "}
            It&apos;s the last profile, so a fresh empty one will be created in its place.
          </>
        )}
      </p>
      <div>
        <label htmlFor="delete-confirm-name" className="block text-sm font-semibold text-white/80">
          Type <span className="text-white">{profile.name}</span> to confirm
        </label>
        <input
          id="delete-confirm-name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          placeholder={profile.name}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!matches}
          onClick={() => {
            deleteProfile(id);
            setMode({ kind: "list" });
          }}
          className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete {profile.name}
        </button>
        <button
          type="button"
          onClick={() => setMode({ kind: "list" })}
          className="rounded-xl border border-white/20 px-4 py-3"
        >
          Keep
        </button>
      </div>
    </div>
  );
}
