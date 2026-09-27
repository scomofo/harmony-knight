/**
 * Creation Contest: a weekly, fully local competition.
 *
 * Submit creations to the week's contest, vote head-to-head matchups, and
 * climb the local leaderboard. The Discord Sentinel and two clockwork
 * rivals fill out the bracket (seeded per week, deterministic). Everything
 * stays on this device — no network, no accounts.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { playSequence, stopLane } from "../lib/game/audio.ts";
import { parseCreationData } from "../lib/game/creations.ts";
import { paletteForProgress } from "../lib/game/palettes.ts";
import {
  CONTEST_SUBMISSION_POINTS,
  CONTEST_VOTING_BONUS,
  contestLeaderboard,
  contestMatchups,
  contestWeekId,
  entryAppeal,
  matchupWinner,
  pendingPlayerMatchups,
  playerEntryForCreation,
  votingBonusAvailable,
  type ContestEntry,
  type ContestMatchup,
} from "../lib/game/contest.ts";
import { useStore } from "../lib/game/store.ts";

const LANE = "contest";

function AppealStars({ notes }: { notes: number[] }) {
  const stars = Math.round(entryAppeal(notes) * 5);
  return (
    <span className="text-xs text-amber-200/80" title={`Crowd appeal ${stars}/5`}>
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
    </span>
  );
}

export function ContestScreen() {
  const weekId = useMemo(() => contestWeekId(), []);
  const contests = useStore((s) => s.save.contests);
  const creations = useStore((s) => s.save.creations);
  const ensureContestWeek = useStore((s) => s.ensureContestWeek);
  const submitContestEntry = useStore((s) => s.submitContestEntry);
  const voteContest = useStore((s) => s.voteContest);
  const claimContestVoteBonus = useStore((s) => s.claimContestVoteBonus);
  const lessons = useStore((s) => s.save.lessons);
  const completedLessonIds = useMemo(
    () =>
      Object.entries(lessons)
        .filter(([, p]) => p.completedAt != null)
        .map(([id]) => id),
    [lessons],
  );
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const palette = useMemo(() => paletteForProgress(completedLessonIds), [completedLessonIds]);

  useEffect(() => {
    ensureContestWeek(weekId, palette);
  }, [weekId, palette, ensureContestWeek]);

  useEffect(() => () => stopLane(LANE), []);

  const week = contests[weekId];
  const pastWeekIds = useMemo(
    () => Object.keys(contests).filter((id) => id !== weekId).sort().reverse(),
    [contests, weekId],
  );

  if (!week) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <h1 className="text-2xl font-bold">🏆 Creation Contest</h1>
        <p className="mt-2 text-white/60">Setting up this week's bracket…</p>
      </div>
    );
  }

  const playEntry = (entry: ContestEntry) => {
    stopLane(LANE);
    setPlayingId(entry.id);
    playSequence(entry.notes, {
      lane: LANE,
      noteDuration: 0.35,
      gap: 0.05,
      onDone: () => setPlayingId(null),
    });
  };

  const submittedIds = new Set(week.entries.filter((e) => !e.bot).map((e) => e.id));
  const submittable = creations.filter((c) => {
    const data = parseCreationData(c.data);
    return data.notes.length > 0 && !submittedIds.has(`player:${c.id}`);
  });

  const matchups = contestMatchups(week);
  const pending = pendingPlayerMatchups(week);
  const votedCount = matchups.filter((m) => matchupWinner(week, m) !== null).length;
  const board = contestLeaderboard(week);
  const bonusReady = votingBonusAvailable(week);

  const submit = (creationId: string, name: string, notes: number[]) => {
    const entry = playerEntryForCreation({ id: creationId, name, notes });
    if (!entry) return;
    const points = submitContestEntry(weekId, entry);
    setNotice(
      points > 0
        ? `“${name}” entered! +${points} harmony points.`
        : `“${name}” is already in this week's contest.`,
    );
  };

  const claimBonus = () => {
    const points = claimContestVoteBonus(weekId);
    if (points > 0) setNotice(`All matchups voted! +${points} harmony points.`);
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">🏆 Creation Contest</h1>
      <p className="mt-1 text-white/70">
        Week <span className="font-mono text-amber-200">{weekId}</span> · submit your
        creations, vote the head-to-heads, top the local leaderboard. The{" "}
        <span className="font-semibold text-rose-300">Discord Sentinel</span> and two
        clockwork rivals are already in the bracket.
      </p>
      {notice && (
        <p className="mt-2 rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200" role="status">
          {notice}
        </p>
      )}

      {/* Submit */}
      <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4" aria-labelledby="contest-submit">
        <h2 id="contest-submit" className="text-lg font-semibold">
          Your entries ({week.entries.filter((e) => !e.bot).length} in)
        </h2>
        <p className="mt-1 text-xs text-white/50">
          +{CONTEST_SUBMISSION_POINTS} harmony points per submission, once each.
        </p>
        {submittable.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">
            {creations.length === 0
              ? <>No creations yet — <Link to="/create" className="underline text-amber-200">compose one</Link> first.</>
              : "Everything you've made is already in this week's bracket. New creations can join too."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {submittable.map((c) => {
              const data = parseCreationData(c.data);
              return (
                <li key={c.id} className="flex items-center gap-2 rounded-lg border border-white/10 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-white/50">{data.notes.length} notes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => submit(c.id, c.name, data.notes)}
                    className="rounded-lg border border-amber-300/40 px-3 py-1 text-sm font-semibold text-amber-200"
                  >
                    Enter contest
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Vote */}
      <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4" aria-labelledby="contest-vote">
        <h2 id="contest-vote" className="text-lg font-semibold">
          Vote the head-to-heads
        </h2>
        <p className="mt-1 text-xs text-white/50">
          {votedCount} of {matchups.length} matchups decided · listen, then pick a winner.
          {pending.length === 0 && week.entries.some((e) => !e.bot)
            ? " All voted — nice ears."
            : ""}
        </p>
        {pending.length === 0 && (
          <p className="mt-2 text-sm text-white/50">
            {week.entries.some((e) => !e.bot)
              ? "Nothing left to vote — the leaderboard below is final for your matchups."
              : "Submit a creation above to unlock voting."}
          </p>
        )}
        <ul className="mt-2 space-y-3">
          {pending.map((m) => (
            <MatchupRow
              key={m.id}
              matchup={m}
              week={week}
              playingId={playingId}
              onPlay={playEntry}
              onVote={(winnerId) => voteContest(weekId, m, winnerId)}
            />
          ))}
        </ul>
        {bonusReady ? (
          <button
            type="button"
            onClick={claimBonus}
            className="mt-3 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-900"
          >
            Claim voting bonus +{CONTEST_VOTING_BONUS} ⭐
          </button>
        ) : (
          week.rewardsPaid.votingBonus && (
            <p className="mt-3 text-xs text-emerald-300">Voting bonus claimed ✓</p>
          )
        )}
      </section>

      {/* Leaderboard */}
      <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4" aria-labelledby="contest-board">
        <h2 id="contest-board" className="text-lg font-semibold">
          Leaderboard
        </h2>
        <ol className="mt-2 space-y-1.5">
          {board.map((row, i) => (
            <li
              key={row.entry.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                row.entry.bot ? "border-white/10" : "border-amber-300/30 bg-amber-300/5"
              }`}
            >
              <span className="w-6 text-center text-sm font-bold text-white/60" aria-hidden>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {row.entry.name}{" "}
                  <span className="font-normal text-white/40">· {row.entry.author}</span>
                </p>
                <p className="text-xs text-white/50">
                  {row.wins}W · {row.losses}L <AppealStars notes={row.entry.notes} />
                </p>
              </div>
              <button
                type="button"
                onClick={() => playEntry(row.entry)}
                aria-label={`Play ${row.entry.name}`}
                className="rounded-lg border border-white/20 px-2.5 py-1 text-sm"
              >
                {playingId === row.entry.id ? "⏸" : "▶"}
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* Past weeks */}
      {pastWeekIds.length > 0 && (
        <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4" aria-labelledby="contest-past">
          <h2 id="contest-past" className="text-lg font-semibold">
            Past weeks
          </h2>
          <ul className="mt-2 space-y-1">
            {pastWeekIds.map((id) => {
              const w = contests[id]!;
              const winner = contestLeaderboard(w)[0];
              return (
                <li key={id} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-white/50">{id}</span>
                  <span className="text-white/70">
                    🥇 {winner?.entry.name}{" "}
                    <span className="text-white/40">· {winner?.entry.author}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link to="/games" className="mt-6 inline-block text-sm text-white/60 underline">
        ← Back to games
      </Link>
    </div>
  );
}

function MatchupRow({
  matchup,
  week,
  playingId,
  onPlay,
  onVote,
}: {
  matchup: ContestMatchup;
  week: { entries: ContestEntry[]; votes: Record<string, string> };
  playingId: string | null;
  onPlay: (entry: ContestEntry) => void;
  onVote: (winnerId: string) => void;
}) {
  const a = week.entries.find((e) => e.id === matchup.a)!;
  const b = week.entries.find((e) => e.id === matchup.b)!;
  const voted = week.votes[matchup.id];
  return (
    <li className="rounded-lg border border-white/10 p-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <EntryVote
          entry={a}
          playing={playingId === a.id}
          selected={voted === a.id}
          onPlay={() => onPlay(a)}
          onVote={() => onVote(a.id)}
        />
        <span className="text-xs font-bold text-white/40">VS</span>
        <EntryVote
          entry={b}
          playing={playingId === b.id}
          selected={voted === b.id}
          onPlay={() => onPlay(b)}
          onVote={() => onVote(b.id)}
        />
      </div>
    </li>
  );
}

function EntryVote({
  entry,
  playing,
  selected,
  onPlay,
  onVote,
}: {
  entry: ContestEntry;
  playing: boolean;
  selected: boolean;
  onPlay: () => void;
  onVote: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-2 text-center ${
        selected ? "border-emerald-300/50 bg-emerald-500/10" : "border-white/10"
      }`}
    >
      <p className="truncate text-sm font-semibold">{entry.name}</p>
      <p className="truncate text-xs text-white/40">{entry.author}</p>
      <div className="mt-1.5 flex justify-center gap-1.5">
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Play ${entry.name}`}
          className="rounded-lg border border-white/20 px-2.5 py-1 text-xs"
        >
          {playing ? "⏸" : "▶ Play"}
        </button>
        <button
          type="button"
          onClick={onVote}
          aria-pressed={selected}
          aria-label={`Vote for ${entry.name}`}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
            selected
              ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-200"
              : "border-white/20 text-white/70 hover:border-emerald-300/40"
          }`}
        >
          {selected ? "✓ Voted" : "Vote"}
        </button>
      </div>
    </div>
  );
}
