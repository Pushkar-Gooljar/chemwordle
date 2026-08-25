/**
 * Dashboard — the screen a student sees on open.
 *
 * Its job is to answer one question fast: *what do I do now?* The goal here
 * is "N different reaction steps today", not "N reviews" — the ring fills as
 * distinct steps get covered by whatever pathways the scheduler serves up, not
 * as raw attempts pile up. Everything else (streak, XP, history) is supporting
 * evidence placed below the two start buttons, never above them.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppwrite } from '@appwrite.io/react';
import { Flame, Play, Snowflake, Sparkles, Trophy } from 'lucide-react';

import type { DailyStat, Mode } from '../../data/srsTypes';
import { MODES } from '../../data/srsTypes';
import { stepCount } from '../../data/deck';
import { dayRange, formatDayKey } from '../../lib/day';
import { levelProgress, levelTitle, streakIsAlive } from '../../lib/gamification';
import { countDueSteps } from '../../lib/srs/pathSelection';
import { listDailyStats } from '../../services/repository';
import { useStudy } from '../../providers/StudyProvider';
import { Button } from '@/components/ui/button';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const MODE_META: Record<Mode, { label: string; accent: string; ring: string }> = {
  aromatic: { label: 'Aromatic', accent: 'text-primary', ring: 'stroke-primary' },
  aliphatic: { label: 'Aliphatic', accent: 'text-blue-600 dark:text-blue-400', ring: 'stroke-blue-500' },
};

export const Dashboard: React.FC = () => {
  const { tablesDB } = useAppwrite();
  const { profile, progress, states, goalFor, stepsCoveredToday, goalMet, dayKey, matureSteps } = useStudy();

  const [history, setHistory] = useState<DailyStat[]>([]);

  useEffect(() => {
    if (!profile) return;
    listDailyStats(tablesDB, profile.userId, 120).then(setHistory).catch(() => setHistory([]));
  }, [tablesDB, profile]);

  const level = useMemo(() => levelProgress(progress?.totalXp ?? 0), [progress?.totalXp]);
  const streakAlive = progress ? streakIsAlive(progress, dayKey) : false;

  const dueByMode = useMemo(() => {
    const out = {} as Record<Mode, number>;
    for (const mode of MODES) out[mode] = countDueSteps(mode, states);
    return out;
  }, [states]);

  if (!profile || !progress) return null;

  const totalCoveredToday = MODES.reduce((sum, m) => sum + stepsCoveredToday(m), 0);

  return (
    <div className="min-h-screen bg-background text-foreground px-3 sm:px-6 py-5 sm:py-7">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {greeting()}, {profile.fullName.split(' ')[0]}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {totalCoveredToday > 0
                ? `${totalCoveredToday} steps covered today`
                : dueByMode.aromatic + dueByMode.aliphatic > 0
                  ? 'Reactions are waiting'
                  : 'All caught up'}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <StreakPill streak={progress.currentStreak} alive={streakAlive} freezes={progress.streakFreezes} />
            <div className="text-right shrink-0 ">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Level {level.level} · {levelTitle(level.level)}
              </p>
              <div className="w-28 mt-1">
                <ProgressBar value={level.pct} className="h-1.5" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 tabular-nums whitespace-nowrap">
                {level.into}/{level.span} XP
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODES.map((mode) => (
            <DeckCard
              key={mode}
              mode={mode}
              covered={stepsCoveredToday(mode)}
              goal={goalFor(mode)}
              met={goalMet(mode)}
              due={dueByMode[mode]}
              total={stepCount(mode)}
            />
          ))}
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Reviews all-time" value={progress.totalReviews.toLocaleString()} />
          <Stat
            label="Accuracy"
            value={progress.totalReviews ? `${Math.round((progress.totalCorrect / progress.totalReviews) * 100)}%` : '—'}
          />
          <Stat label="Settled steps" value={`${matureSteps}`} sub={`of ${stepCount('aromatic') + stepCount('aliphatic')}`} />
          <Stat label="Longest streak" value={`${progress.longestStreak}d`} />
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-muted-foreground" /> Last 17 weeks
            </h2>
            <Link to="/leaderboard" className="text-xs font-semibold text-primary hover:underline">
              <Trophy className="w-3.5 h-3.5 inline mr-1" />
              Leaderboard
            </Link>
          </div>
          <Heatmap history={history} today={dayKey} />
        </section>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const DeckCard: React.FC<{
  mode: Mode;
  covered: number;
  goal: number;
  met: boolean;
  due: number;
  total: number;
}> = ({ mode, covered, goal, met, due, total }) => {
  const meta = MODE_META[mode];
  const pct = goal > 0 ? Math.min(1, covered / goal) : 1;
  const nothingToDo = due === 0 && covered >= goal;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
      <GoalRing pct={pct} met={met} className={meta.ring} />

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h2 className={cn('font-black tracking-tight', meta.accent)}>{meta.label}</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {covered} of {goal} steps today
            {met && <span className="text-emerald-600 dark:text-emerald-500 font-semibold"> · done</span>}
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground leading-tight">
          {due > 0
            ? `${due} step${due === 1 ? '' : 's'} due · ${total} in the deck`
            : `Nothing overdue · ${total} steps in the deck`}
        </p>

        <Button asChild size="sm" className="w-full" disabled={nothingToDo}>
          <Link to={`/study/${mode}`} className='flex flex-row gap-2 justify-center items-center'>
            <Play className="w-3.5 h-3.5" />
            {met ? "Keep practising" : "Start today's pathways"}
          </Link>
        </Button>
      </div>
    </div>
  );
};

const GoalRing: React.FC<{ pct: number; met: boolean; className: string }> = ({ pct, met, className }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="38" cy="38" r={radius} className="stroke-muted" strokeWidth="7" fill="none" />
      <circle
        cx="38"
        cy="38"
        r={radius}
        className={cn(met ? 'stroke-emerald-500' : className, 'transition-[stroke-dashoffset] duration-500')}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
      />
      <text x="38" y="38" className="rotate-90 origin-center fill-foreground text-[15px] font-black" textAnchor="middle" dominantBaseline="central">
        {Math.round(pct * 100)}
      </text>
    </svg>
  );
};

const StreakPill: React.FC<{ streak: number; alive: boolean; freezes: number }> = ({ streak, alive, freezes }) => (
  <div
    className={cn(
      'flex items-center gap-1.5 px-3 py-2 rounded-xl border font-black tabular-nums',
      alive && streak > 0
        ? 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400'
        : 'border-border bg-muted/40 text-muted-foreground',
    )}
    title={freezes ? `${freezes} streak freeze${freezes > 1 ? 's' : ''} banked` : undefined}
  >
    <Flame className="w-4 h-4" />
    {streak}
    {freezes > 0 && (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-sky-500">
        <Snowflake className="w-3 h-3" />
        {freezes}
      </span>
    )}
  </div>
);

const Stat: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="bg-card border border-border rounded-xl p-3">
    <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-xl font-black tabular-nums mt-0.5">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
  </div>
);

/** 17 weeks of activity, coloured by whether that day's goal was met. */
const Heatmap: React.FC<{ history: DailyStat[]; today: string }> = ({ history, today }) => {
  const byDate = useMemo(() => new Map(history.map((h) => [h.date, h])), [history]);
  const days = useMemo(() => dayRange(today, 17 * 7), [today]);

  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {chunk(days, 7).map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day) => {
            const stat = byDate.get(day);
            const total = stat ? stat.aromaticSteps.length + stat.aliphaticSteps.length : 0;
            return (
              <div
                key={day}
                title={`${formatDayKey(day)} — ${total} step${total === 1 ? '' : 's'}`}
                className={cn(
                  'w-3 h-3 rounded-[3px]',
                  stat?.goalMet
                    ? 'bg-emerald-500'
                    : total > 10
                      ? 'bg-emerald-500/60'
                      : total > 0
                        ? 'bg-emerald-500/30'
                        : 'bg-muted',
                  day === today && 'ring-1 ring-foreground/40',
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));
}
