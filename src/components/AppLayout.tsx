/**
 * App shell.
 *
 * Also the auth gate: the router renders <AppLayout> for every route, so the
 * three states a session can be in — signed out, signed in but unregistered,
 * fully set up — are resolved in one place rather than scattered through
 * per-route guards.
 */

import React from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '@appwrite.io/react';
import { Hexagon, Activity, Home, Loader2, Settings, Trophy } from 'lucide-react';

import { Landing } from '../features/auth/Landing';
import { Onboarding } from '../features/auth/Onboarding';
import { useStudy } from '../providers/StudyProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/practice/aromatic', label: 'Practice: Aromatic', icon: Hexagon, end: false },
  { to: '/practice/aliphatic', label: 'Practice: Aliphatic', icon: Activity, end: false },
  { to: '/leaderboard', label: 'Ranks', icon: Trophy, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export const AppLayout: React.FC = () => {
  const { user, isLoading } = useUser();
  const location = useLocation();
  const study = useStudy();

  if (isLoading || user === undefined) return <FullPageSpinner label="Signing you in" />;

  if (user === null) {
    // The bare domain gets a pitch, not the OTP form — anyone else trying a
    // protected URL directly (a bookmark, a shared link) goes straight to
    // /login instead, since they already know what they're here for.
    return location.pathname === '/' ? <Landing /> : <Navigate to="/login" replace />;
  }

  if (study.status === 'loading') return <FullPageSpinner label="Loading your schedule" />;
  if (study.status === 'needs-onboarding') return <Onboarding />;
  if (study.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <h2 className="text-lg font-black">We couldn't load your data</h2>
          <p className="text-sm text-muted-foreground">
            {study.error?.message ?? 'Something went wrong on the way to the database.'}
          </p>
          <Button onClick={() => void study.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="w-full border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-1 sm:gap-4">
          <span className="font-black text-sm sm:text-lg tracking-widest text-primary mr-1 sm:mr-3 shrink-0">
            CHEMWORDLE
          </span>
          <div className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto hide-scrollbar">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 h-14 border-b-2 px-2 sm:px-2.5 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

const FullPageSpinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="w-6 h-6 animate-spin" />
    <p className="text-sm">{label}</p>
  </div>
);
