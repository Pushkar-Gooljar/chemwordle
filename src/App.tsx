/**
 * Routes.
 *
 * Two ways to play the same pathway game:
 *
 *   /study/:mode     the scheduled session — the scheduler picks targets to
 *                    cover today's weakest steps until the goal is met
 *   /practice/:mode  the original game, unscheduled — pick a random route and
 *                    play as many as you like, no grading
 *
 * Practice is useful for a first pass through unfamiliar territory or a
 * pre-exam cram; /study is what keeps it from evaporating afterwards.
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/AppLayout';
import { OrganicSynthesisWordle } from './components/OrganicSynthesisWordle';
import { Dashboard } from './features/dashboard/Dashboard';
import { Leaderboard } from './features/dashboard/Leaderboard';
import { LoginRoute } from './features/auth/LoginRoute';
import { PathwaySessionRunner } from './features/session/PathwaySessionRunner';
import { SettingsPage } from './features/settings/SettingsPage';
import { GAME_CONFIGS } from './data/gameConfigs';

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Outside <AppLayout> on purpose — no nav chrome, no useStudy()
          dependency, since there's no authenticated session to load yet. */}
      <Route path="/login" element={<LoginRoute />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="study/:mode" element={<PathwaySessionRunner />} />
        <Route path="practice/aromatic" element={<OrganicSynthesisWordle config={GAME_CONFIGS.aromatic} />} />
        <Route path="practice/aliphatic" element={<OrganicSynthesisWordle config={GAME_CONFIGS.aliphatic} />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
