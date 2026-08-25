/**
 * The `/login` route.
 *
 * Lives outside <AppLayout> deliberately — it's the one screen that must
 * render with no nav chrome and no dependency on `useStudy()` (which needs an
 * authenticated client to load anything). If someone is already signed in and
 * lands here anyway — a stale bookmark, a back-button — send them to `/`
 * rather than showing them the OTP form again.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@appwrite.io/react';
import { Loader2 } from 'lucide-react';

import { SignIn } from './SignIn';

export const LoginRoute: React.FC = () => {
  const { user, isLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  if (isLoading || user === undefined || user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">Signing you in</p>
      </div>
    );
  }

  return <SignIn />;
};
