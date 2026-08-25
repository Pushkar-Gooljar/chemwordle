/**
 * Settings.
 *
 * The two things students actually change are the daily minimums, so they are
 * first and they are sliders. Retention is framed by consequence ("more
 * pathways, sharper recall"), not by the FSRS parameter name.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignOut } from '@appwrite.io/react';
import { LogOut, Moon, Monitor, RotateCcw, Sun } from 'lucide-react';
import { toast } from 'sonner';

import { MODES, type Mode } from '../../data/srsTypes';
import { stepCount } from '../../data/deck';
import { detectTimeZone } from '../../lib/day';
import { useStudy } from '../../providers/StudyProvider';
import { useTheme, type Theme } from '../../providers/ThemeProvider';
import { DeleteAccountSection } from './DeleteAccountSection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Some shadcn CLI generations wire `Slider`'s `onValueChange` straight through
 * to Radix, which always calls back with `number[]` even for a single thumb.
 * Others (older/newer registry variants) call back with a plain `number`.
 * Normalising here means the handler works either way instead of assuming one
 * and crashing on the other with "number is not iterable".
 */
function firstSliderValue(value: number | number[]): number {
  return Array.isArray(value) ? value[0] : value;
}

const RETENTION_STEPS = [
  { value: 0.85, label: 'Lighter', blurb: 'Fewer pathways. Expect to forget roughly 1 in 7 steps.' },
  { value: 0.9, label: 'Balanced', blurb: 'The default. Recommended until a month before the exam.' },
  { value: 0.94, label: 'Exam mode', blurb: 'More pathways, sharper recall. Use in the final weeks.' },
];

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, profile } = useStudy();
  const { theme, setTheme } = useTheme();
  const { signOut } = useSignOut();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  async function patch(update: Parameters<typeof updateSettings>[0]) {
    setSaving(true);
    try {
      await updateSettings(update);
    } catch {
      toast.error('Could not save that. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-3 sm:px-6 py-5 sm:py-7">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-black tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-mono">{profile?.username}</span>
            {saving && <span className="ml-2 text-xs">Saving…</span>}
          </p>
        </header>

        <Section
          title="Daily minimum"
          blurb="How many different reaction steps you commit to covering each day, per paper. The scheduler picks pathways whose routes add up to this many — your streak advances once both are hit. Extra pathways always count."
        >
          {MODES.map((mode) => (
            <GoalSlider
              key={mode}
              mode={mode}
              value={mode === 'aromatic' ? settings.dailyGoalAromatic : settings.dailyGoalAliphatic}
              onChange={(value) =>
                patch(mode === 'aromatic' ? { dailyGoalAromatic: value } : { dailyGoalAliphatic: value })
              }
            />
          ))}
        </Section>

        <Section
          title="New steps per day"
          blurb="How fast you meet unfamiliar chemistry. Introductions pause automatically when a backlog of due steps builds up, so this is a ceiling, not a promise."
        >
          {MODES.map((mode) => (
            <div key={mode} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="capitalize">{mode}</Label>
                <span className="text-sm font-black tabular-nums">
                  {mode === 'aromatic' ? settings.newPerDayAromatic : settings.newPerDayAliphatic}
                </span>
              </div>
              <Slider
                min={0}
                max={20}
                step={1}
                value={[mode === 'aromatic' ? settings.newPerDayAromatic : settings.newPerDayAliphatic]}
                onValueChange={(value) =>
                  patch(
                    mode === 'aromatic'
                      ? { newPerDayAromatic: firstSliderValue(value) }
                      : { newPerDayAliphatic: firstSliderValue(value) },
                  )
                }
              />
              <p className="text-[11px] text-muted-foreground">{stepCount(mode)} steps in this deck.</p>
            </div>
          ))}
        </Section>

        <Section
          title="How much you want to remember"
          blurb="The scheduler aims to bring each step back just as you're about to forget it. This sets where that line sits."
        >
          <div className="grid grid-cols-3 gap-2">
            {RETENTION_STEPS.map((step) => (
              <button
                key={step.value}
                type="button"
                onClick={() => patch({ desiredRetention: step.value })}
                className={cn(
                  'p-3 rounded-xl border-2 text-left transition-colors',
                  Math.abs(settings.desiredRetention - step.value) < 0.005
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50',
                )}
              >
                <span className="font-bold text-sm block">{step.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">{step.blurb}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Appearance" blurb="Applies immediately and follows you between devices.">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'light', label: 'Light', Icon: Sun },
                { value: 'dark', label: 'Dark', Icon: Moon },
                { value: 'system', label: 'System', Icon: Monitor },
              ] as Array<{ value: Theme; label: string; Icon: typeof Sun }>
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTheme(value);
                  void patch({ theme: value });
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-colors',
                  theme === value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Your day"
          blurb="Pathways played before your rollover hour count towards the previous day, so a late night doesn't cost you a streak."
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Day starts at</Label>
              <Select
                value={String(settings.dayRolloverHour)}
                onValueChange={(value) => patch({ dayRolloverHour: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6].map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {String(hour).padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Button
                variant="outline"
                className="w-full justify-start font-mono text-xs"
                onClick={() => patch({ timezone: detectTimeZone() })}
              >
                {settings.timezone}
              </Button>
              <p className="text-[10px] text-muted-foreground">Tap to match this device.</p>
            </div>
          </div>
        </Section>

        <Section title="Reminders" blurb="A nudge on days you haven't hit your minimum yet.">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminders">Email me when my streak is at risk</Label>
            <Switch
              id="reminders"
              checked={settings.reminderEmails}
              onCheckedChange={(checked) => patch({ reminderEmails: checked })}
            />
          </div>
        </Section>

        <Section title="Account" blurb="">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCcw className="w-4 h-4" /> Reload data
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // Explicit navigation rather than relying solely on the
                // reactive `user` state to flip AppLayout's guard — it will
                // too, but this is immediate and doesn't depend on the auth
                // hook's own propagation timing.
                void signOut({}).finally(() => navigate('/login', { replace: true }));
              }}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </Section>

        {profile && <DeleteAccountSection username={profile.username} />}
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; blurb: string; children: React.ReactNode }> = ({
  title,
  blurb,
  children,
}) => (
  <section className="space-y-3">
    <div>
      <h2 className="font-bold text-sm">{title}</h2>
      {blurb && <p className="text-xs text-muted-foreground mt-0.5">{blurb}</p>}
    </div>
    <div className="space-y-4 bg-card border border-border rounded-2xl p-4">{children}</div>
  </section>
);

const GoalSlider: React.FC<{ mode: Mode; value: number; onChange: (value: number) => void }> = ({
  mode,
  value,
  onChange,
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="capitalize">{mode}</Label>
      <span className="text-sm font-black tabular-nums">
        {value} <span className="text-xs font-medium text-muted-foreground">steps / day</span>
      </span>
    </div>
    <Slider
      min={0}
      max={60}
      step={5}
      value={[value]}
      onValueChange={(next) => onChange(firstSliderValue(next))}
      aria-label={`${mode} daily minimum`}
    />
  </div>
);
