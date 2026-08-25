/**
 * Email OTP sign-in.
 *
 * Two steps: request a code, then exchange it for a session. There is no
 * password anywhere in this app — students share devices, forget passwords and
 * reuse them across sites, and a six-digit code to a school inbox sidesteps all
 * three.
 *
 * The `@appwrite.io/react` hooks cover email/password and OAuth only, so the
 * OTP calls drop down to the Web SDK through `useAppwrite().account`, which is
 * the documented escape hatch and shares the provider's client.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAppwrite, useUser } from '@appwrite.io/react';
import { ID } from 'appwrite';
import { ArrowLeft, FlaskConical, Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';

const RESEND_SECONDS = 45;

export const SignIn: React.FC = () => {
  const { account, setAuthenticated } = useAppwrite();
  const { refresh } = useUser();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [phrase, setPhrase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const submittedFor = useRef<string>('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(target: string) {
    setBusy(true);
    setMessage(null);
    try {
      const token = await account.createEmailToken({
        userId: ID.unique(),
        email: target.trim().toLowerCase(),
        // The security phrase is shown here and in the email. If they differ,
        // the student is looking at a phishing page.
        phrase: true,
      });
      setPendingUserId(token.userId);
      setPhrase((token as { phrase?: string }).phrase ?? null);
      setStep('code');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setMessage(readableError(err, 'That email address was not accepted. Check it and try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    if (submittedFor.current === value) return; // auto-submit fires once per code
    submittedFor.current = value;
    setBusy(true);
    setMessage(null);
    try {
      await account.createSession({ userId: pendingUserId, secret: value });
      setAuthenticated(true);
      await refresh();
    } catch (err) {
      submittedFor.current = '';
      setCode('');
      setMessage(readableError(err, 'That code did not work. Codes expire after 15 minutes.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xl tracking-wider">
            9701
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight">CHEMWORDLE</h1>
            <p className="text-xs text-muted-foreground">Organic synthesis, spaced out.</p>
          </div>
        </div>

        {step === 'email' ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) void sendCode(email);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We send a six-digit code. No password to forget.
              </p>
            </div>

            {message && <ErrorNote>{message}</ErrorNote>}

            <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send code
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setMessage(null);
                submittedFor.current = '';
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Use a different email
            </button>

            <div className="space-y-1">
              <h2 className="font-bold text-base">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                We sent a code to <span className="font-medium text-foreground">{email}</span>.
              </p>
            </div>

            {phrase && (
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Security phrase
                </span>
                <p className="font-mono text-sm font-semibold mt-0.5">{phrase}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  The email shows this same phrase. If it doesn't match, don't enter the code.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp">Six-digit code</Label>
              <InputOTP
                id="otp"
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (value.length === 6) void verify(value);
                }}
                disabled={busy}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {message && <ErrorNote>{message}</ErrorNote>}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={cooldown > 0 || busy}
                onClick={() => void sendCode(email)}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </Button>
              {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        )}

        <p className="mt-10 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <FlaskConical className="w-3.5 h-3.5" />
          Built for CIE 9701 A Level Chemistry.
        </p>
      </div>
    </div>
  );
};

const ErrorNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    role="alert"
    className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
  >
    {children}
  </p>
);

/**
 * Appwrite error messages are written for developers. Rate limits are the one
 * case where the underlying reason genuinely helps the student, so it gets its
 * own line; everything else falls back to something actionable.
 */
function readableError(err: unknown, fallback: string): string {
  const code = (err as { code?: number })?.code;
  if (code === 429) return 'Too many attempts. Wait a minute, then try again.';
  if (code === 401) return 'That code is wrong or has expired. Request a new one.';
  return fallback;
}
