/**
 * Leaderboard.
 *
 * Defaults to the student's own school, because "12th of 4,300 worldwide" is
 * noise and "3rd in my class" is motivation. Streak is offered alongside XP so
 * someone who started late still has a table they can win.
 *
 * Note on trust: rows are written by the client, so XP is self-reported. That
 * is fine for a classroom tool and wrong for anything with stakes — see
 * docs/APPWRITE_SETUP.md, "Hardening the leaderboard", for the Function that
 * moves scoring server-side when you need it.
 */

import React, { useEffect, useState } from 'react';
import { useAppwrite } from '@appwrite.io/react';
import { Flame, Loader2, Trophy } from 'lucide-react';

import type { Progress } from '../../data/srsTypes';
import { levelTitle } from '../../lib/gamification';
import { listLeaderboard, type LeaderboardMetric } from '../../services/repository';
import { useStudy } from '../../providers/StudyProvider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export const Leaderboard: React.FC = () => {
  const { tablesDB } = useAppwrite();
  const { profile } = useStudy();

  const [scope, setScope] = useState<'school' | 'global'>('school');
  const [metric, setMetric] = useState<LeaderboardMetric>('totalXp');
  const [rows, setRows] = useState<Progress[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    setRows(null);
    listLeaderboard(tablesDB, {
      scope,
      schoolNameLower: profile.schoolNameLower,
      metric,
      limit: 50,
    })
      .then(setRows)
      .catch(() => setRows([]));
  }, [tablesDB, profile, scope, metric]);

  return (
    <div className="min-h-screen bg-background text-foreground px-3 sm:px-6 py-5 sm:py-7">
      <div className="w-full max-w-2xl mx-auto space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {scope === 'school' ? profile?.schoolName : 'Everyone using ChemWordle'}
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <TabsList>
              <TabsTrigger value="school">My school</TabsTrigger>
              <TabsTrigger value="global">Global</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as LeaderboardMetric)}>
            <TabsList>
              <TabsTrigger value="totalXp">XP</TabsTrigger>
              <TabsTrigger value="currentStreak">Streak</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Nobody here yet. Be the first — finish today's goal and you're on the board.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {rows.map((row, i) => (
              <li
                key={row.userId}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border',
                  row.userId === profile?.userId
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card',
                )}
              >
                <span
                  className={cn(
                    'w-7 text-center font-black tabular-nums text-sm',
                    i === 0 && 'text-amber-500',
                    i === 1 && 'text-slate-400',
                    i === 2 && 'text-amber-700',
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm font-mono truncate">{row.username}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Level {row.level} · {levelTitle(row.level)}
                  </p>
                </div>
                <span className="font-black tabular-nums text-sm flex items-center gap-1">
                  {metric === 'currentStreak' && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                  {metric === 'totalXp'
                    ? `${row.totalXp.toLocaleString()} XP`
                    : `${row.currentStreak}d`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
