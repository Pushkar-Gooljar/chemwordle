/**
 * A scheduled study session.
 *
 * There is no separate "review" screen — the student plays the same pathway
 * game as /practice, except the target isn't random. On mount, the scheduler
 * (`planPathwaySession`) picks a sequence of targets whose routes cover the
 * steps most in need of practice, until today's goal — "N different steps" —
 * is met. The runner plays them one at a time; each time one finishes, it's
 * graded immediately (so a closed tab never loses progress) and the student
 * chooses when to continue via the game's own summary screen.
 *
 * The plan is computed once at mount and not recalculated mid-session — the
 * scheduler already saw the whole due list up front, and recalculating after
 * every pathway would mean showing the student a shrinking, twitchy target
 * list instead of a stable session with a clear end.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PartyPopper, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { GAME_CONFIGS } from '../../data/gameConfigs';
import { MODES, type Mode, type PathwayFinishResult } from '../../data/srsTypes';
import { useStudy } from '../../providers/StudyProvider';
import { OrganicSynthesisWordle } from '../../components/OrganicSynthesisWordle';
import { Button } from '@/components/ui/button';
import { Progress as ProgressBar } from '@/components/ui/progress';

export const PathwaySessionRunner: React.FC = () => {
  const { mode: modeParam } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const mode = (MODES.includes(modeParam as Mode) ? modeParam : 'aromatic') as Mode;

  const { planPathwaySession, finishPathway, goalFor, stepsCoveredToday } = useStudy();

  // Computed once per mount: which pathways will fill today's goal.
  const [plan] = useState(() => planPathwaySession(mode));
  const [index, setIndex] = useState(0);
  const [grading, setGrading] = useState(false);
  const [lastOutcomeSteps, setLastOutcomeSteps] = useState<number | null>(null);

  const goal = goalFor(mode);
  const startCovered = useMemo(() => stepsCoveredToday(mode), []); // eslint-disable-line react-hooks/exhaustive-deps
  const current = plan.pathways[index];

  async function handleFinish(result: PathwayFinishResult) {
    setGrading(true);
    try {
      const outcome = await finishPathway(result);
      setLastOutcomeSteps(outcome.stepsCovered);

      if (outcome.goalJustMet) {
        toast.success(`${titleCase(mode)} goal reached`, {
          description: `+${outcome.xpEarned} XP. Keep going if you like — extra pathways still count.`,
          icon: <PartyPopper className="w-4 h-4" />,
        });
      }
      for (const badge of outcome.newBadges) toast(`Badge unlocked: ${badge.replace(/-/g, ' ')}`);
      if (outcome.streakEvents.includes('record')) toast.success('New longest streak.');
      if (outcome.streakEvents.includes('freeze-used')) toast('Streak freeze used — your run is intact.');
    } catch {
      toast.error("That pathway didn't save. Check your connection — it will retry shortly.");
    } finally {
      setGrading(false);
    }
  }

  function handleContinue() {
    if (index + 1 < plan.pathways.length) setIndex((i) => i + 1);
    else navigate('/');
  }

  if (!current) {
    return (
      <EmptyState
        title="Nothing to schedule right now"
        body={
          plan.coveredStepIds.size > 0
            ? `Every reachable step is already covered for today. That's ${plan.coveredStepIds.size} steps — nice work.`
            : "Nothing is due and nothing new is queued. Adjust today's minimum in Settings if you want more."
        }
        onBack={() => navigate('/')}
      />
    );
  }

  const coveredSoFar = (lastOutcomeSteps ?? startCovered);
  const pct = goal > 0 ? Math.min(100, Math.round((coveredSoFar / goal) * 100)) : 100;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-4">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Pathway {index + 1} of {plan.pathways.length} · {coveredSoFar}/{goal} {mode} steps today
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            Save and exit
          </Button>
        </div>
        <ProgressBar value={pct} className="h-1.5 mb-3" />
      </div>

      <OrganicSynthesisWordle
        key={`${mode}-${index}`}
        config={GAME_CONFIGS[mode]}
        mode={mode}
        target={current.target}
        onFinish={handleFinish}
        onContinue={handleContinue}
        hasNext={index + 1 < plan.pathways.length}
      />

      {grading && (
        <p className="text-center text-xs text-muted-foreground pb-4">Saving your progress…</p>
      )}
    </div>
  );
};

const EmptyState: React.FC<{ title: string; body: string; onBack: () => void }> = ({ title, body, onBack }) => (
  <div className="min-h-screen flex items-center justify-center px-4">
    <div className="max-w-sm text-center space-y-3">
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Button onClick={onBack}>Back to dashboard</Button>
    </div>
  </div>
);

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
