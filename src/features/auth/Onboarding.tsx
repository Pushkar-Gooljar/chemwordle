/**
 * First-run registration.
 *
 * Collected once, after the first successful sign-in: full name, school,
 * year of birth, and a public username. Everything else (goals, retention,
 * theme) has a sensible default and lives in Settings — a student should reach
 * their first pathway in under a minute.
 *
 * Username availability is checked live, but the check is advisory. The real
 * guarantee is the 409 from Appwrite when the handle's row is claimed, which is
 * handled below.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignOut, useUser } from '@appwrite.io/react';
import { AlertCircle, Check, Loader2, X } from 'lucide-react';

import { MAURITIUS_SCHOOLS } from '../../data/schools';
import { SearchableSelect } from '../../components/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useStudy } from '../../providers/StudyProvider';
import { useUsernameAvailability } from '../../hooks/useUsernameAvailability';
import { isConflict } from '../../lib/appwrite';

/** Widest plausible range for an A-level cohort, plus room for resitters. */
const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 40 }, (_, i) => CURRENT_YEAR - 14 - i);

export const Onboarding: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useSignOut();
  const navigate = useNavigate();
  const { completeOnboarding } = useStudy();

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [schoolName, setSchoolName] = useState('');
  const [username, setUsername] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availability = useUsernameAvailability(username);

  const canSubmit = useMemo(
    () =>
      fullName.trim().length >= 2 &&
      schoolName.trim().length >= 2 &&
      yearOfBirth !== '' &&
      availability.kind === 'available' &&
      !busy,
    [fullName, schoolName, yearOfBirth, availability, busy],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({
        username: username.trim(),
        fullName: fullName.trim(),
        schoolName: schoolName.trim(),
        yearOfBirth: Number(yearOfBirth),
      });
    } catch (err) {
      setError(
        isConflict(err)
          ? 'Someone claimed that username a moment ago. Pick another.'
          : 'Could not save your details. Check your connection and try again.',
      );
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md space-y-6">
        <header className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
            One-time setup
          </span>
          <h1 className="text-2xl font-black tracking-tight">Tell us who you are</h1>
          <p className="text-sm text-muted-foreground">
            Your name and school stay private. Your username is what appears on leaderboards.
          </p>
        </header>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Sonion Ring"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="school">School</Label>
          <SearchableSelect
            id="school"
            options={MAURITIUS_SCHOOLS}
            value={schoolName}
            onChange={setSchoolName}
            placeholder="Select your school"
            searchPlaceholder="Search by name or town…"
            emptyText="No school matches that search."
          />
          <p className="text-xs text-muted-foreground">Used to rank you against classmates.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="yob">Year of birth</Label>
          <Select value={yearOfBirth} onValueChange={setYearOfBirth}>
            <SelectTrigger id="yob">
              <SelectValue placeholder="Select a year" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {BIRTH_YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <Input
              id="username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="high_on_potenuse"
              className="pr-9 font-mono"
              aria-describedby="username-status"
              aria-invalid={availability.kind === 'taken' || availability.kind === 'invalid'}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <AvailabilityIcon status={availability.kind} />
            </span>
          </div>
          <p id="username-status" className="text-xs min-h-4">
            <AvailabilityMessage status={availability} />
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" className="flex-1" disabled={!canSubmit}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Start revising
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void signOut({}).finally(() => navigate('/login', { replace: true }))}
          >
            Sign out
          </Button>
        </div>
      </form>
    </div>
  );
};

const AvailabilityIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'checking') return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (status === 'available') return <Check className="w-4 h-4 text-emerald-500" />;
  if (status === 'taken' || status === 'invalid') return <X className="w-4 h-4 text-destructive" />;
  return null;
};

const AvailabilityMessage: React.FC<{
  status: ReturnType<typeof useUsernameAvailability>;
}> = ({ status }) => {
  switch (status.kind) {
    case 'idle':
      return <span className="text-muted-foreground">3–20 characters. Letters, numbers, underscores.</span>;
    case 'checking':
      return <span className="text-muted-foreground">Checking…</span>;
    case 'available':
      return <span className="text-emerald-600 dark:text-emerald-500 font-medium">Available.</span>;
    case 'taken':
      return <span className="text-destructive font-medium">Already taken.</span>;
    case 'invalid':
      return <span className="text-destructive font-medium">{status.message}</span>;
    case 'error':
      return <span className="text-amber-600 dark:text-amber-500">{status.message}</span>;
  }
};
