/**
 * Live username availability.
 *
 * Debounced to 400ms and guarded by a request sequence number, so a fast typer
 * can never see the verdict for a username they have already edited away from.
 * Format is validated locally first — no point asking the server about
 * "ab" or "Bad Name".
 */

import { useEffect, useRef, useState } from 'react';
import { useAppwrite } from '@appwrite.io/react';

import { isUsernameAvailable, normaliseUsername, validateUsername } from '../services/repository';

export type UsernameStatus =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'error'; message: string };

const DEBOUNCE_MS = 400;

export function useUsernameAvailability(raw: string): UsernameStatus {
  const { tablesDB } = useAppwrite();
  const [status, setStatus] = useState<UsernameStatus>({ kind: 'idle' });
  const sequence = useRef(0);

  useEffect(() => {
    const value = normaliseUsername(raw);
    const ticket = ++sequence.current;

    if (!value) {
      setStatus({ kind: 'idle' });
      return;
    }

    const formatError = validateUsername(value);
    if (formatError) {
      setStatus({ kind: 'invalid', message: formatError });
      return;
    }

    setStatus({ kind: 'checking' });

    const timer = window.setTimeout(async () => {
      try {
        const free = await isUsernameAvailable(tablesDB, value);
        if (ticket !== sequence.current) return; // superseded
        setStatus({ kind: free ? 'available' : 'taken' });
      } catch {
        if (ticket !== sequence.current) return;
        setStatus({ kind: 'error', message: 'Could not check right now.' });
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [raw, tablesDB]);

  return status;
}
