/**
 * Delete account — the confirmation dialog and the call to the Function that
 * actually does it. Kept out of SettingsPage.tsx to keep that file's already
 * long list of sections readable.
 *
 * Transparency about what happens is deliberate, not just a courtesy: telling
 * someone exactly what gets erased versus anonymised before they confirm is
 * part of giving them a genuinely informed choice, which is the same spirit
 * behind GDPR's erasure right rather than a box-ticking exercise.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignOut } from '@appwrite.io/react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { deleteAccount } from '../../services/accountDeletion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const DeleteAccountSection: React.FC<{ username: string }> = ({ username }) => {
  const { signOut } = useSignOut();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === username.trim().toLowerCase();

  function reset() {
    setTyped('');
    setError(null);
    setBusy(false);
  }

  async function confirmDelete() {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);

    const outcome = await deleteAccount(typed.trim());

    if (!outcome.success) {
      setError(outcome.error ?? 'Something went wrong. Nothing was deleted — try again.');
      setBusy(false);
      return;
    }

    toast.success('Account deleted.');
    // The Auth user is already gone server-side; this just clears whatever
    // local session state remains before leaving.
    await signOut({}).catch(() => undefined);
    navigate('/login', { replace: true });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-bold text-sm text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Permanently delete your account. This cannot be undone.
        </p>
      </div>

      <div className="bg-card border border-destructive/30 rounded-2xl p-4">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="w-4 h-4" /> Delete account
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" /> Delete your account
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-left pt-2">
                  <div>
                    <p className="font-semibold text-foreground text-xs mb-1">Deleted immediately:</p>
                    <ul className="text-xs list-disc pl-4 space-y-0.5">
                      <li>Your name, school, year of birth and username</li>
                      <li>Your schedule, streak, XP, badges and leaderboard entry</li>
                      <li>Your sign-in — you'll need a new account to come back</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-xs mb-1">Anonymised, not deleted:</p>
                    <ul className="text-xs list-disc pl-4 space-y-0.5">
                      <li>
                        Your past review history (ratings and timings only — never your name or
                        identity) helps tune the scheduler for everyone. It's kept but permanently
                        disconnected from your account, with no way back to it.
                      </li>
                    </ul>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-mono font-bold">{username}</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                autoComplete="off"
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={username}
                aria-invalid={typed.length > 0 && !matches}
              />
              {error && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={!matches || busy} onClick={() => void confirmDelete()}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Permanently delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};
