import React, { useState, useEffect, useMemo, useRef } from 'react';
import { type GameConfig, type ConditionSpec } from '../data/types';
import { type Mode, type PathwayFinishResult } from '../data/srsTypes';
import { ChemicalStructure } from './ChemicalStructure';
import {
  Search, HelpCircle, CheckCircle2,
  ArrowRight, ArrowLeft, ArrowDown, Trophy, X,
  Thermometer, Wind, Sun, Flame, Gauge, Check
} from 'lucide-react';

const HEART_IMG_URL = "https://static.wikia.nocookie.net/hexxit/images/a/a7/Heart.svg/revision/latest/thumbnail/width/360/height/360?cb=20130827213425";
const MAX_ATTEMPTS = 5;

type SlotStatus = 'correct' | 'present' | 'absent' | 'empty';

interface SlotSpec {
  type: 'reagent' | 'catalyst' | 'condition';
  label: string;
  expectedId: string;
}

interface AttemptRecord {
  values: string[];
  statuses: SlotStatus[];
}

interface Props {
  config: GameConfig;
  /** Required alongside `onFinish` — which deck's scheduler grades this pathway. */
  mode?: Mode;
  /**
   * Fixed target compound, supplied by the scheduler. When present, the game
   * plays exactly one pathway (no random re-roll) and reports the outcome via
   * `onFinish`/`onContinue`. Omit both to get the original free-play mode used
   * at /practice — pick-your-own-random-target, "Play Another Route" and all.
   */
  target?: string;
  onFinish?: (result: PathwayFinishResult) => void;
  onContinue?: () => void;
  /** Changes the summary modal's continue label; purely cosmetic. */
  hasNext?: boolean;
}

export const OrganicSynthesisWordle: React.FC<Props> = ({
  config, mode = 'aromatic', target, onFinish, onContinue, hasNext,
}) => {
  const { title, startNode, data, reagents, catalysts, conditions, themeColor, filters } = config;
  const sessionMode = Boolean(onFinish || onContinue);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());

  // Game Routing & Solution
  const [targetEndpoint, setTargetEndpoint] = useState<string>('');
  const [solutionIntermediates, setSolutionIntermediates] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<'phase1' | 'phase2' | 'complete'>('phase1');

  // Phase 1 State
  const [phase1History, setPhase1History] = useState<AttemptRecord[]>([]);
  const [currentP1Guess, setCurrentP1Guess] = useState<string[]>([]);
  const [activeP1Slot, setActiveP1Slot] = useState<number>(0);
  const [viewingP1Attempt, setViewingP1Attempt] = useState<number>(0);

  // Phase 2 State
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [activeSubSlotIndex, setActiveSubSlotIndex] = useState<number>(0);
  const [stepHistories, setStepHistories] = useState<AttemptRecord[][]>([]);
  const [currentStepGuesses, setCurrentStepGuesses] = useState<string[][]>([]);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [viewingP2Attempt, setViewingP2Attempt] = useState<number>(0);

  // Filter & Modals
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // BFS Path Finder
  const findPath = (start: string, end: string): string[] | null => {
    const queue: { node: string; path: string[] }[] = [{ node: start, path: [start] }];
    const visited = new Set<string>([start]);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === end) return path;

      const trans = data[node]?.transitions || [];
      for (const t of trans) {
        if (!visited.has(t.target)) {
          visited.add(t.target);
          queue.push({ node: t.target, path: [...path, t.target] });
        }
      }
    }
    return null;
  };

  // Initialize a puzzle: a fixed `target` (scheduler-driven session) if one was
  // given as a prop, otherwise the original random-target free-play behaviour.
  const startNewGame = (fixedTarget?: string) => {
    let chosenTarget = fixedTarget;

    if (!chosenTarget) {
      const validTargets: string[] = [];
      Object.keys(data).forEach((key) => {
        if (key !== startNode) {
          const path = findPath(startNode, key);
          if (path && path.length >= 3 && path.length <= 5) validTargets.push(key);
        }
      });
      if (validTargets.length === 0) return;
      chosenTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
    }

    const path = findPath(startNode, chosenTarget);
    if (!path) return; // a fixed target should always be reachable; guard anyway
    finishedRef.current = false;
    startedAtRef.current = Date.now();

    const target = chosenTarget;
    const intermediates = path.slice(1, -1);
    const totalTransitions = intermediates.length + 1;
    const fullPath = [startNode, ...intermediates, target];

    setTargetEndpoint(target);
    setSolutionIntermediates(intermediates);
    setGamePhase('phase1');

    setPhase1History([]);
    setCurrentP1Guess(new Array(intermediates.length).fill(''));
    setActiveP1Slot(0);
    setViewingP1Attempt(0);

    const initialGuesses: string[][] = [];
    for (let i = 0; i < totalTransitions; i++) {
      const from = fullPath[i];
      const to = fullPath[i + 1];
      const trans = data[from]?.transitions.find(t => t.target === to);
      const slotCount = (trans?.reagents.length || 0) + (trans?.catalysts.length || 0) + (trans?.conditions.length || 0);
      initialGuesses.push(new Array(slotCount).fill(''));
    }

    setCurrentStepGuesses(initialGuesses);
    setStepHistories(Array.from({ length: totalTransitions }, () => []));
    setCompletedSteps(new Array(totalTransitions).fill(false));
    setActiveStepIndex(0);
    setActiveSubSlotIndex(0);
    setViewingP2Attempt(0);
    setShowSummaryModal(false);
  };

  useEffect(() => {
    startNewGame(target);
    setSelectedFilter('all');
    setSearchQuery('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, target]);

  const fullCanonicalPath = [startNode, ...solutionIntermediates, targetEndpoint];

  /**
   * Reads the outcome of the pathway just played straight out of the existing
   * attempt-history state — no separate tracking needed. `null` at index i
   * means step i was never reached (an earlier step ended the pathway first),
   * so it gets no grade and no coverage credit.
   */
  const computeFinishResult = (): PathwayFinishResult => {
    const totalSteps = fullCanonicalPath.length - 1;

    const productResults = Array.from({ length: totalSteps }, (_, i) => {
      if (phase1History.length === 0) return null;
      for (let a = 0; a < phase1History.length; a++) {
        if (phase1History[a].statuses[i] === 'correct') return { attempts: a + 1, solved: true };
      }
      return { attempts: phase1History.length, solved: false };
    });

    const conditionResults = Array.from({ length: totalSteps }, (_, i) => {
      const hist = stepHistories[i] || [];
      if (hist.length === 0) return null; // phase 2 never reached this step
      for (let a = 0; a < hist.length; a++) {
        if (hist[a].statuses.every((s) => s === 'correct')) return { attempts: a + 1, solved: true };
      }
      return { attempts: hist.length, solved: false };
    });

    return {
      mode,
      target: targetEndpoint,
      path: fullCanonicalPath,
      productResults,
      conditionResults,
      durationMs: Date.now() - startedAtRef.current,
    };
  };

  const reportFinish = () => {
    if (finishedRef.current || !onFinish) return;
    finishedRef.current = true;
    onFinish(computeFinishResult());
  };

  // All three ways a pathway can end — full success, phase-1 failure, or a
  // single step's attempts running out in phase 2 — open the summary modal.
  // Firing from that one signal (rather than from each branch directly) means
  // `computeFinishResult` always reads state after it has actually committed,
  // including the final attempt that ended the game.
  useEffect(() => {
    if (showSummaryModal) reportFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSummaryModal]);

  const activeStepSlots = useMemo((): SlotSpec[] => {
    if (!fullCanonicalPath[activeStepIndex] || !fullCanonicalPath[activeStepIndex + 1]) return [];
    const from = fullCanonicalPath[activeStepIndex];
    const to = fullCanonicalPath[activeStepIndex + 1];
    const trans = data[from]?.transitions.find(t => t.target === to);
    if (!trans) return [];

    const slots: SlotSpec[] = [];
    trans.reagents.forEach((r, idx) => slots.push({ type: 'reagent', label: `Reagent ${idx + 1}`, expectedId: r }));
    trans.catalysts.forEach((c) => slots.push({ type: 'catalyst', label: `Catalyst`, expectedId: c }));
    trans.conditions.forEach((cond, idx) => slots.push({ type: 'condition', label: `Condition ${idx + 1}`, expectedId: cond.id }));
    return slots;
  }, [activeStepIndex, fullCanonicalPath, data]);

  const phase1LockedCorrect = useMemo(() => {
    const locked = new Array(solutionIntermediates.length).fill(false);
    phase1History.forEach(attempt => {
      attempt.statuses.forEach((st, idx) => {
        if (st === 'correct') locked[idx] = true;
      });
    });
    return locked;
  }, [phase1History, solutionIntermediates.length]);

  const activeStepLockedCorrect = useMemo(() => {
    const history = stepHistories[activeStepIndex] || [];
    const locked = new Array(activeStepSlots.length).fill(false);
    history.forEach(attempt => {
      attempt.statuses.forEach((st, idx) => {
        if (st === 'correct') locked[idx] = true;
      });
    });
    return locked;
  }, [stepHistories, activeStepIndex, activeStepSlots.length]);

  const handleCheckPhase1 = () => {
    if (currentP1Guess.some(val => val === '')) return;

    const statuses: SlotStatus[] = new Array(solutionIntermediates.length).fill('absent');
    const remainingSolution = [...solutionIntermediates];

    currentP1Guess.forEach((guess, idx) => {
      if (guess === solutionIntermediates[idx]) {
        statuses[idx] = 'correct';
        remainingSolution[idx] = '';
      }
    });

    currentP1Guess.forEach((guess, idx) => {
      if (statuses[idx] !== 'correct') {
        const found = remainingSolution.findIndex(s => s === guess && s !== '');
        if (found !== -1) {
          statuses[idx] = 'present';
          remainingSolution[found] = '';
        }
      }
    });

    const isAllCorrect = statuses.every(st => st === 'correct');
    const newHistory = [...phase1History, { values: [...currentP1Guess], statuses }];
    setPhase1History(newHistory);

    if (isAllCorrect) {
      setGamePhase('phase2');
      setActiveStepIndex(0);
      setActiveSubSlotIndex(0);
      setViewingP1Attempt(newHistory.length - 1);
    } else if (newHistory.length >= MAX_ATTEMPTS) {
      setViewingP1Attempt(newHistory.length - 1);
      setShowSummaryModal(true);
    } else {
      const nextGuess = currentP1Guess.map((guess, idx) => (statuses[idx] === 'correct' ? guess : ''));
      setCurrentP1Guess(nextGuess);
      setViewingP1Attempt(newHistory.length);

      const nextEmpty = nextGuess.findIndex((val, idx) => val === '' && statuses[idx] !== 'correct');
      setActiveP1Slot(nextEmpty !== -1 ? nextEmpty : 0);
    }
  };

  const handleCheckPhase2Step = () => {
    const guessArr = currentStepGuesses[activeStepIndex] || [];
    if (guessArr.some(g => g === '')) return;

    const from = fullCanonicalPath[activeStepIndex];
    const to = fullCanonicalPath[activeStepIndex + 1];
    const trans = data[from]?.transitions.find(t => t.target === to);
    if (!trans) return;

    const remainingReagents = [...trans.reagents];
    const remainingCatalysts = [...trans.catalysts];
    const remainingConditions = trans.conditions.map(c => c.id);

    const allPathwayItems = new Set<string>();
    for (let i = 0; i < fullCanonicalPath.length - 1; i++) {
      const f = fullCanonicalPath[i];
      const tNode = fullCanonicalPath[i + 1];
      const tr = data[f]?.transitions.find(x => x.target === tNode);
      if (tr) {
        tr.reagents.forEach(r => allPathwayItems.add(r));
        tr.catalysts.forEach(c => allPathwayItems.add(c));
        tr.conditions.forEach(c => allPathwayItems.add(c.id));
      }
    }

    const statuses: SlotStatus[] = new Array(activeStepSlots.length).fill('absent');

    activeStepSlots.forEach((slot, idx) => {
      const guess = guessArr[idx];
      if (slot.type === 'reagent') {
        const found = remainingReagents.indexOf(guess);
        if (found !== -1) {
          statuses[idx] = 'correct';
          remainingReagents.splice(found, 1);
        }
      } else if (slot.type === 'catalyst') {
        const found = remainingCatalysts.indexOf(guess);
        if (found !== -1) {
          statuses[idx] = 'correct';
          remainingCatalysts.splice(found, 1);
        }
      } else if (slot.type === 'condition') {
        const found = remainingConditions.indexOf(guess);
        if (found !== -1) {
          statuses[idx] = 'correct';
          remainingConditions.splice(found, 1);
        }
      }
    });

    activeStepSlots.forEach((slot, idx) => {
      if (statuses[idx] !== 'correct') {
        if (allPathwayItems.has(guessArr[idx])) {
          statuses[idx] = 'present';
        } else {
          statuses[idx] = 'absent';
        }
      }
    });

    const isStepWon = statuses.every(st => st === 'correct');
    const currentHist = stepHistories[activeStepIndex] || [];
    const updatedHist = [...currentHist, { values: [...guessArr], statuses }];

    const nextStepHistories = [...stepHistories];
    nextStepHistories[activeStepIndex] = updatedHist;
    setStepHistories(nextStepHistories);

    if (isStepWon) {
      const nextCompleted = [...completedSteps];
      nextCompleted[activeStepIndex] = true;
      setCompletedSteps(nextCompleted);
      setViewingP2Attempt(updatedHist.length - 1);

      if (activeStepIndex < fullCanonicalPath.length - 2) {
        const nextStep = activeStepIndex + 1;
        setActiveStepIndex(nextStep);
        setActiveSubSlotIndex(0);
        setViewingP2Attempt((nextStepHistories[nextStep] || []).length);
      } else if (nextCompleted.every(Boolean)) {
        setGamePhase('complete');
        setTimeout(() => setShowSummaryModal(true), 400);
      }
    } else if (updatedHist.length >= MAX_ATTEMPTS) {
      setViewingP2Attempt(updatedHist.length - 1);
      setShowSummaryModal(true);
    } else {
      const nextGuesses = [...currentStepGuesses];
      const nextStepGuess = guessArr.map((guess, idx) => (statuses[idx] === 'correct' ? guess : ''));
      nextGuesses[activeStepIndex] = nextStepGuess;
      setCurrentStepGuesses(nextGuesses);
      setViewingP2Attempt(updatedHist.length);

      const firstEmpty = nextStepGuess.findIndex(g => g === '');
      setActiveSubSlotIndex(firstEmpty !== -1 ? firstEmpty : 0);
    }
  };

  const renderConditionIcon = (type: ConditionSpec['type']) => {
    switch (type) {
      case 'temperature': return <Thermometer className="w-4 h-4 text-orange-500 shrink-0" />;
      case 'heating': return <Flame className="w-4 h-4 text-red-500 shrink-0" />;
      case 'energy': return <Sun className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'pressure': return <Gauge className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'environment': return <Wind className="w-4 h-4 text-cyan-500 shrink-0" />;
      case 'both': return <Gauge className="w-4 h-4 text-purple-500 shrink-0" />;
    }
  };

  const isViewingLiveP1 = viewingP1Attempt === phase1History.length;
  const displayedP1Values = gamePhase !== 'phase1'
    ? solutionIntermediates
    : isViewingLiveP1
      ? currentP1Guess
      : phase1History[viewingP1Attempt]?.values || [];

  const displayedP1Statuses = gamePhase !== 'phase1'
    ? solutionIntermediates.map(() => 'correct' as SlotStatus)
    : isViewingLiveP1
      ? phase1LockedCorrect.map(isLock => isLock ? 'correct' as SlotStatus : 'empty' as SlotStatus)
      : phase1History[viewingP1Attempt]?.statuses || [];

  const currentStepHist = stepHistories[activeStepIndex] || [];
  const isCurrentStepDone = completedSteps[activeStepIndex];
  const isViewingLiveP2 = viewingP2Attempt === currentStepHist.length && !isCurrentStepDone;

  const displayedP2Values = isCurrentStepDone
    ? currentStepHist[currentStepHist.length - 1]?.values || []
    : isViewingLiveP2
      ? currentStepGuesses[activeStepIndex] || []
      : currentStepHist[viewingP2Attempt]?.values || [];

  const displayedP2Statuses = isCurrentStepDone
    ? currentStepHist[currentStepHist.length - 1]?.statuses || []
    : isViewingLiveP2
      ? activeStepLockedCorrect.map(isLock => isLock ? 'correct' as SlotStatus : 'empty' as SlotStatus)
      : currentStepHist[viewingP2Attempt]?.statuses || [];

  const activeSubSlot = activeStepSlots[activeSubSlotIndex];

  const candidatePool = useMemo(() => {
    return Object.entries(data).filter(([key, compound]) => {
      if (key === startNode || key === targetEndpoint) return false;
      const matches = compound.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      compound.formula.toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedFilter !== 'all') return matches && compound.tags.includes(selectedFilter);
      return matches;
    });
  }, [searchQuery, selectedFilter, targetEndpoint, startNode, data]);

  const themeStyles = useMemo(() => {
    switch (themeColor) {
      case 'emerald':
        return {
          text: 'text-emerald-600 dark:text-emerald-500',
          bg: 'bg-emerald-500/20',
          button: 'bg-emerald-600 text-white hover:bg-emerald-700',
          borderFocus: 'focus:ring-emerald-500 ring-emerald-500 border-emerald-500',
          bgSolid: 'bg-emerald-600',
          borderLight: 'border-emerald-400/40',
          hoverBorder: 'hover:border-emerald-500',
          focusRing: 'focus:ring-emerald-500',
          icon: 'text-emerald-500'
        };
      case 'blue':
        return {
          text: 'text-blue-600 dark:text-blue-500',
          bg: 'bg-blue-500/20',
          button: 'bg-blue-600 text-white hover:bg-blue-700',
          borderFocus: 'focus:ring-blue-500 ring-blue-500 border-blue-500',
          bgSolid: 'bg-blue-600',
          borderLight: 'border-blue-400/40',
          hoverBorder: 'hover:border-blue-500',
          focusRing: 'focus:ring-blue-500',
          icon: 'text-blue-500'
        };
      case 'primary':
      default:
        return {
          text: 'text-primary',
          bg: 'bg-primary/20',
          button: 'bg-primary text-primary-foreground hover:bg-primary/90',
          borderFocus: 'focus:ring-primary ring-primary border-primary',
          bgSolid: 'bg-primary',
          borderLight: 'border-primary/40',
          hoverBorder: 'hover:border-primary',
          focusRing: 'focus:ring-primary',
          icon: 'text-primary'
        };
    }
  }, [themeColor]);

  const themeClass = `${themeStyles.text} ${themeStyles.bg}`;
  const buttonClass = themeStyles.button;
  const borderFocusClass = themeStyles.borderFocus;

  // Reusable Pathway Node with identical styling handling and multiline un-truncated wrapping
  const renderPathwayNode = (nodeType: 'start' | 'intermediate' | 'target', intermediateIndex?: number) => {
    if (nodeType === 'start') {
      return (
        <div className="flex flex-col items-center justify-between w-full h-full min-h-[195px] p-4 rounded-2xl bg-muted/40 border-2 border-border text-center shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Start</span>
          <div className="w-20 h-20 sm:w-24 sm:h-24 my-auto flex items-center justify-center">
            <ChemicalStructure smiles={data[startNode]?.smiles || ""} width={85} height={85} />
          </div>
          <div className="w-full mt-2">
            <p className="font-bold text-xs text-foreground leading-snug break-words [overflow-wrap:anywhere]">
              {data[startNode]?.name}
            </p>
            <span className="text-[16px] text-muted-foreground font-mono block mt-1">{data[startNode]?.formula}</span>
          </div>
        </div>
      );
    }

    if (nodeType === 'target') {
      return (
        <div className={`flex flex-col items-center justify-between w-full h-full min-h-[195px] p-4 rounded-2xl border-2 text-center shadow-xs ${themeClass} ${themeStyles.borderLight}`}>
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${themeStyles.text}`}>Target</span>
          {targetEndpoint && data[targetEndpoint] && (
            <>
              <div className="w-20 h-20 sm:w-24 sm:h-24 my-auto flex items-center justify-center">
                <ChemicalStructure smiles={data[targetEndpoint].smiles} width={85} height={85} />
              </div>
              <div className="w-full mt-2">
                <p className="font-bold text-xs text-foreground leading-snug break-words [overflow-wrap:anywhere]">
                  {data[targetEndpoint].name}
                </p>
                <span className="text-[16px] text-muted-foreground font-mono block mt-1">
                  {data[targetEndpoint].formula}
                </span>
              </div>
            </>
          )}
        </div>
      );
    }

    // Intermediate Node
    const idx = intermediateIndex!;
    const chemKey = displayedP1Values[idx];
    const chem = chemKey ? data[chemKey] : null;
    const status = displayedP1Statuses[idx];
    const isLocked = phase1LockedCorrect[idx];
    const isActive = gamePhase === 'phase1' && isViewingLiveP1 && activeP1Slot === idx;

    let statusStyle = "border-dashed border-border bg-card";
    if (status === 'correct' || (isViewingLiveP1 && isLocked)) {
      statusStyle = "bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 border-solid shadow-sm";
    } else if (status === 'present') {
      statusStyle = "bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-200 border-solid shadow-sm";
    } else if (status === 'absent') {
      statusStyle = "bg-muted/70 border-muted-foreground/30 text-muted-foreground border-solid";
    }

    return (
      <div
        onClick={() => {
          if (gamePhase === 'phase1' && !isLocked) {
            setActiveP1Slot(idx);
          }
        }}
        className={`cursor-pointer flex flex-col items-center justify-between w-full h-full min-h-[195px] p-4 rounded-2xl border-2 transition-all text-center ${statusStyle} ${
          isActive ? `ring-2 ring-offset-2 scale-[1.02] ${borderFocusClass}` : 'hover:border-primary/50'
        }`}
      >
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Intermediate {idx + 1}
        </span>

        {chem ? (
          <>
            <div className="w-20 h-20 sm:w-24 sm:h-24 my-auto flex items-center justify-center">
              <ChemicalStructure smiles={chem.smiles} width={80} height={80} />
            </div>
            <div className="w-full mt-2">
              <p className="font-bold text-xs text-foreground leading-snug break-words [overflow-wrap:anywhere]">
                {chem.name}
              </p>
              <span className="text-[16px] text-muted-foreground font-mono block mt-1">{chem.formula}</span>
            </div>
          </>
        ) : (
          <div className="my-auto flex flex-col items-center justify-center text-muted-foreground/50 py-4">
            <span className="text-xs font-semibold">Click to Pick</span>
            <span className="text-[10px]">Intermediate</span>
          </div>
        )}

        {(status === 'correct' || (isViewingLiveP1 && isLocked)) && (
          <div className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            ✓ Correct
          </div>
        )}
        {status === 'present' && !isLocked && (
          <div className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            ↔ Misplaced
          </div>
        )}
        {status === 'absent' && !isLocked && (
          <div className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            ✕ Wrong
          </div>
        )}
      </div>
    );
  };

  const renderStepConnector = (stepIdx: number, direction: 'right' | 'left' | 'down' = 'right') => {
    const isCompleted = completedSteps[stepIdx];
    const isSelected = activeStepIndex === stepIdx;
    const ArrowIcon = direction === 'down' ? ArrowDown : direction === 'left' ? ArrowLeft : ArrowRight;

    if (gamePhase !== 'phase1') {
      return (
        <button
          onClick={() => {
            setActiveStepIndex(stepIdx);
            setActiveSubSlotIndex(0);
            setViewingP2Attempt(isCompleted ? (stepHistories[stepIdx]?.length || 1) - 1 : (stepHistories[stepIdx]?.length || 0));
          }}
          className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap ${
            isCompleted
              ? 'bg-emerald-600 text-white border-emerald-600'
              : isSelected
                ? `${buttonClass} ring-2 ring-offset-2 ${borderFocusClass}`
                : 'bg-muted hover:bg-muted/80 text-foreground'
          }`}
        >
          {isCompleted ? <Check className="w-3.5 h-3.5" /> : <ArrowIcon className="w-4 h-4" />}
          <span>Step {stepIdx + 1}</span>
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center p-2 text-muted-foreground">
        <ArrowIcon className="w-6 h-6" />
      </div>
    );
  };

  const allPathwayNodes = [
    { type: 'start' as const, index: -1 },
    ...solutionIntermediates.map((_, i) => ({ type: 'intermediate' as const, index: i })),
    { type: 'target' as const, index: -1 }
  ];

  // Serpentine Grid Logic generator
  const renderGrid = (cols: number, classes: string) => {
    const colsTemplate = Array(cols).fill('minmax(180px, 1fr)').join(' auto ');

    return (
      <div className={`grid ${classes}`} style={{ gridTemplateColumns: colsTemplate }}>
         {allPathwayNodes.map((node, index) => {
            const rowIndex = Math.floor(index / cols);
            const isLTR = rowIndex % 2 === 0;
            const posInRow = index % cols;
            const nodeRow = rowIndex * 2 + 1;
            const nodeCol = isLTR ? posInRow * 2 + 1 : (cols - posInRow - 1) * 2 + 1;

            const isLastNode = index === allPathwayNodes.length - 1;
            const isLastInRow = posInRow === cols - 1;

            let arrowCol, arrowRow, arrowType: 'right' | 'left' | 'down' = 'right';
            if (!isLastNode) {
               if (isLastInRow) {
                  arrowCol = nodeCol;
                  arrowRow = nodeRow + 1;
                  arrowType = 'down';
               } else {
                  arrowCol = isLTR ? nodeCol + 1 : nodeCol - 1;
                  arrowRow = nodeRow;
                  arrowType = isLTR ? 'right' : 'left';
               }
            }

            return (
               <React.Fragment key={index}>
                  <div style={{ gridColumn: nodeCol, gridRow: nodeRow }} className="w-full h-full flex flex-col">
                     {renderPathwayNode(node.type, node.index)}
                  </div>
                  {!isLastNode && (
                     <div
                       style={{ gridColumn: arrowCol, gridRow: arrowRow }}
                       className={`flex items-center justify-center ${arrowType === 'down' ? 'py-4' : 'px-3'}`}
                     >
                        {renderStepConnector(index, arrowType)}
                     </div>
                  )}
               </React.Fragment>
            )
         })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-4 sm:py-6 px-3 sm:px-6 select-none">
      
      <header className="w-full max-w-5xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl font-black text-lg md:text-xl tracking-wider shrink-0 shadow-sm ${buttonClass}`}>
            9701
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg md:text-2xl font-black tracking-tight truncate">
                {title.toUpperCase()}
              </h1>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-mono font-bold tracking-tight whitespace-nowrap ${themeClass}`}>
                {gamePhase === 'phase1' ? 'PHASE 1: INTERMEDIATES' : `PHASE 2: STEP ${activeStepIndex + 1} BENCH`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {gamePhase === 'phase1'
                ? 'Deduce the synthetic intermediate pathway'
                : 'Determine required reagents, catalysts, and conditions'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
            title="How to Play"
          >
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </button>
          {/* Freeplay only — a scheduled session's target is the scheduler's
              call, not the student's, so this control doesn't exist there. */}
          {!sessionMode && (
            <button
              onClick={() => startNewGame()}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-sm ${buttonClass}`}
            >
              New Puzzle
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center gap-6">

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, idx) => {
              const histList = gamePhase === 'phase1' ? phase1History : currentStepHist;
              const isDone = gamePhase === 'phase2' && isCurrentStepDone;
              const isUsed = !isDone ? idx < histList.length : idx < histList.length - 1;
              const isSelected = gamePhase === 'phase1' ? viewingP1Attempt === idx : viewingP2Attempt === idx;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (idx <= histList.length) {
                      if (gamePhase === 'phase1') setViewingP1Attempt(idx);
                      else setViewingP2Attempt(idx);
                    }
                  }}
                  disabled={idx > histList.length}
                  className={`flex flex-col items-center transition-transform ${isSelected ? 'scale-110' : ''}`}
                >
                  <img
                    src={HEART_IMG_URL}
                    alt="heart"
                    className={`w-7 h-7 sm:w-9 sm:h-9 object-contain drop-shadow transition-all ${
                      isUsed ? 'filter grayscale brightness-[90%] opacity-100' : ''
                    }`}
                  />
                  <span className={`h-1 rounded-full mt-1.5 transition-all ${isSelected ? `w-5 sm:w-7 ${themeStyles.bgSolid}` : 'w-0'}`} />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground font-medium text-center">
            {gamePhase === 'phase1'
              ? `Intermediate Pathway Attempt ${Math.min(phase1History.length + 1, MAX_ATTEMPTS)} of ${MAX_ATTEMPTS}`
              : isCurrentStepDone
                ? `Step ${activeStepIndex + 1} Solved in ${currentStepHist.length} attempt(s)`
                : `Step ${activeStepIndex + 1} Bench Attempt ${Math.min(currentStepHist.length + 1, MAX_ATTEMPTS)} of ${MAX_ATTEMPTS}`}
          </p>
        </div>

        {/* Serpentine Grid Pathway Container */}
        <section className="w-full bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
          
          {/* Mobile (1 col) */}
          <div className="flex md:hidden flex-col items-center w-full max-w-sm mx-auto">
             {allPathwayNodes.map((node, index) => (
                <React.Fragment key={index}>
                   <div className="w-full flex h-full">
                     {renderPathwayNode(node.type, node.index)}
                   </div>
                   {index < allPathwayNodes.length - 1 && (
                     <div className="py-3 flex items-center justify-center">
                        {renderStepConnector(index, 'down')}
                     </div>
                   )}
                </React.Fragment>
             ))}
          </div>

          {/* Tablet (2 cols) */}
          {renderGrid(2, 'hidden md:grid lg:hidden w-full max-w-2xl mx-auto gap-y-1 gap-x-2')}

          {/* Desktop (3 cols) */}
          {renderGrid(3, 'hidden lg:grid w-full max-w-5xl mx-auto gap-y-1 gap-x-3')}

          {/* Phase 1 Submit Button */}
          {gamePhase === 'phase1' && (
            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <button
                onClick={handleCheckPhase1}
                disabled={currentP1Guess.some(c => c === '')}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-40 shadow-md transition-all ${buttonClass}`}
              >
                <CheckCircle2 className="w-5 h-5" /> Check Intermediates
              </button>
            </div>
          )}
        </section>

        {/* Phase 2: Active Reaction Workbench */}
        {gamePhase === 'phase2' && (
          <section className="w-full bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${themeStyles.text}`}>
                  Configuring Step {activeStepIndex + 1}
                </span>
                <h3 className="text-sm sm:text-base font-bold">
                  {data[fullCanonicalPath[activeStepIndex]]?.name} ➔ {data[fullCanonicalPath[activeStepIndex + 1]]?.name}
                </h3>
              </div>

              {isCurrentStepDone ? (
                <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Check className="w-4 h-4" /> Step Completed
                </div>
              ) : (
                <button
                  onClick={handleCheckPhase2Step}
                  disabled={currentStepGuesses[activeStepIndex]?.some(g => g === '') || viewingP2Attempt !== currentStepHist.length}
                  className={`self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs disabled:opacity-40 shadow-md transition-all ${buttonClass}`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Check Step {activeStepIndex + 1}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {activeStepSlots.map((slot, subIdx) => {
                const guessVal = displayedP2Values[subIdx];
                const status = displayedP2Statuses[subIdx];
                const isLocked = activeStepLockedCorrect[subIdx];
                const isActive = !isCurrentStepDone && isViewingLiveP2 && activeSubSlotIndex === subIdx;

                let displayLabel = guessVal;
                if (slot.type === 'condition') {
                  const condObj = conditions.find(c => c.id === guessVal);
                  if (condObj) displayLabel = condObj.label;
                }

                let statusStyle = "border-dashed border-border bg-muted/20";
                if (status === 'correct' || (isViewingLiveP2 && isLocked)) {
                  statusStyle = "bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 border-solid shadow-xs";
                } else if (status === 'present') {
                  statusStyle = "bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-200 border-solid shadow-xs";
                } else if (status === 'absent') {
                  statusStyle = "bg-muted/70 border-muted-foreground/30 text-muted-foreground border-solid";
                }

                return (
                  <div
                    key={subIdx}
                    onClick={() => {
                      if (!isCurrentStepDone && isViewingLiveP2 && !isLocked) {
                        setActiveSubSlotIndex(subIdx);
                      }
                    }}
                    className={`cursor-pointer flex flex-col justify-between p-3 rounded-xl border-2 h-24 transition-all ${statusStyle} ${
                      isActive ? `ring-2 ring-offset-2 scale-[1.01] ${borderFocusClass}` : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                      <span>{slot.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted font-mono">{slot.type}</span>
                    </div>

                    <div className="my-auto font-semibold text-xs truncate">
                      {guessVal ? (
                        <span>{displayLabel}</span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">Empty Slot</span>
                      )}
                    </div>

                    {(status === 'correct' || (isViewingLiveP2 && isLocked)) && (
                      <span className="text-[9px] font-black uppercase text-right text-emerald-600 dark:text-emerald-400">
                        ✓ Match
                      </span>
                    )}
                    {status === 'present' && !isLocked && (
                      <span className="text-[9px] font-black uppercase text-right text-amber-600 dark:text-amber-400">
                        ↔ Misplaced
                      </span>
                    )}
                    {status === 'absent' && !isLocked && (
                      <span className="text-[9px] font-black uppercase text-right text-muted-foreground">
                        ✕ Wrong
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {!isCurrentStepDone && activeSubSlot && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Select {activeSubSlot.type.toUpperCase()}:
                  </span>
                  <button
                    onClick={() => {
                      const next = [...currentStepGuesses];
                      next[activeStepIndex][activeSubSlotIndex] = '';
                      setCurrentStepGuesses(next);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Clear Slot
                  </button>
                </div>

                {activeSubSlot.type === 'reagent' && (
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                    {reagents.map(reagent => (
                      <button
                        key={reagent}
                        onClick={() => {
                          const next = [...currentStepGuesses];
                          next[activeStepIndex][activeSubSlotIndex] = reagent;
                          setCurrentStepGuesses(next);
                          const nextEmpty = next[activeStepIndex].findIndex((v, i) => i > activeSubSlotIndex && v === '' && !activeStepLockedCorrect[i]);
                          if (nextEmpty !== -1) setActiveSubSlotIndex(nextEmpty);
                        }}
                        className={`px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-mono font-medium transition-colors shadow-xs ${themeStyles.hoverBorder}`}
                      >
                        {reagent}
                      </button>
                    ))}
                  </div>
                )}

                {activeSubSlot.type === 'catalyst' && (
                  <div className="flex flex-wrap gap-2">
                    {catalysts.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          const next = [...currentStepGuesses];
                          next[activeStepIndex][activeSubSlotIndex] = cat;
                          setCurrentStepGuesses(next);
                          const nextEmpty = next[activeStepIndex].findIndex((v, i) => i > activeSubSlotIndex && v === '' && !activeStepLockedCorrect[i]);
                          if (nextEmpty !== -1) setActiveSubSlotIndex(nextEmpty);
                        }}
                        className={`px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-medium transition-colors shadow-xs ${themeStyles.hoverBorder}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {activeSubSlot.type === 'condition' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {conditions.map(cond => (
                      <button
                        key={cond.id}
                        onClick={() => {
                          const next = [...currentStepGuesses];
                          next[activeStepIndex][activeSubSlotIndex] = cond.id;
                          setCurrentStepGuesses(next);
                          const nextEmpty = next[activeStepIndex].findIndex((v, i) => i > activeSubSlotIndex && v === '' && !activeStepLockedCorrect[i]);
                          if (nextEmpty !== -1) setActiveSubSlotIndex(nextEmpty);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border text-left transition-colors text-xs font-medium shadow-xs ${themeStyles.hoverBorder}`}
                      >
                        {renderConditionIcon(cond.type)}
                        <span className="truncate">{cond.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Phase 1 Candidate Grid */}
        {gamePhase === 'phase1' && (
          <section className="w-full flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search intermediate chemicals or formula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 ${themeStyles.focusRing}`}
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                <button 
                  onClick={() => setSelectedFilter('all')} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selectedFilter === 'all' ? buttonClass : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                >
                  All
                </button>
                {filters.map(f => (
                  <button 
                    key={f.value}
                    onClick={() => setSelectedFilter(f.value)} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selectedFilter === f.value ? buttonClass : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 max-h-[440px] overflow-y-auto pr-1">
              {candidatePool.map(([key, compound]) => (
                <button
                  key={key}
                  onClick={() => {
                    const next = [...currentP1Guess];
                    next[activeP1Slot] = key;
                    setCurrentP1Guess(next);
                    const nextEmpty = next.findIndex((v, i) => i > activeP1Slot && v === '' && !phase1LockedCorrect[i]);
                    if (nextEmpty !== -1) setActiveP1Slot(nextEmpty);
                    else {
                      const firstEmpty = next.findIndex((v, i) => v === '' && !phase1LockedCorrect[i]);
                      if (firstEmpty !== -1) setActiveP1Slot(firstEmpty);
                    }
                  }}
                  className={`p-2.5 sm:p-3 rounded-2xl border border-border bg-card text-center flex flex-col items-center justify-between min-h-[160px] sm:min-h-[170px] transition-colors shadow-xs hover:bg-muted/40 ${themeStyles.hoverBorder}`}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                    <ChemicalStructure smiles={compound.smiles} width={70} height={70} />
                  </div>
                  <div className="w-full mt-2">
                    <p className="font-bold text-xs text-foreground leading-snug break-words [overflow-wrap:anywhere]">
                      {compound.name}
                    </p>
                    <span className="text-[16px] text-muted-foreground font-mono block mt-1">
                      {compound.formula}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 max-h-[85vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <Trophy className={`w-6 h-6 ${gamePhase === 'complete' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <h3 className="text-base sm:text-lg font-bold">
                  {gamePhase === 'complete' ? 'Synthesis Route Verified' : 'Route Revealed'}
                </h3>
              </div>
              {/* In a scheduled session there's no "close and keep looking" —
                  the route is either continued or the session is done. */}
              {!sessionMode && (
                <button onClick={() => setShowSummaryModal(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-3 my-4">
              {fullCanonicalPath.slice(0, -1).map((fromKey, i) => {
                const toKey = fullCanonicalPath[i + 1];
                const trans = data[fromKey]?.transitions.find((t) => t.target === toKey);

                return (
                  <div key={i} className="p-3 sm:p-3.5 rounded-xl bg-muted/20 border border-border text-xs space-y-1.5">
                    <span className={`font-bold uppercase text-[10px] ${themeStyles.text}`}>Step {i + 1}: {trans?.process}</span>
                    <p className="font-semibold text-sm">{data[fromKey]?.name} ➔ {data[toKey]?.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <span className="text-muted-foreground font-semibold block text-[10px]">REAGENTS:</span>
                        <span className="font-mono">{trans?.reagents.join(' + ') || 'None'}</span>
                      </div>
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <span className="text-muted-foreground font-semibold block text-[10px]">CATALYST:</span>
                        <span>{trans?.catalysts.join(', ') || 'None'}</span>
                      </div>
                    </div>
                    {trans?.notes && (
                      <p className="text-muted-foreground pt-1"><span className="font-semibold text-foreground">Note:</span> {trans.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => (sessionMode ? onContinue?.() : startNewGame())}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-opacity ${buttonClass}`}
            >
              {sessionMode ? (hasNext ? 'Continue' : 'Finish session') : 'Play Another Route'}
            </button>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <HelpCircle className={`w-5 h-5 ${themeStyles.icon}`} /> How to Play
              </h3>
              <button onClick={() => setShowRulesModal(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              <p><strong className="text-foreground">Phase 1:</strong> Guess the intermediate compounds between the start node and target.</p>
              <p><strong className="text-foreground">Phase 2:</strong> For each reaction step arrow, assign the correct reagents, catalysts, and conditions.</p>
              <div className="space-y-1.5 py-2">
                <p><span className="text-emerald-600 font-bold">🟩 Green:</span> Correct item in correct slot.</p>
                <p><span className="text-amber-600 font-bold">🟨 Yellow:</span> Item belongs in a different step of this synthesis.</p>
                <p><span className="text-muted-foreground font-bold">⬜ Gray:</span> Incorrect / not part of this reaction pathway.</p>
              </div>

              <p>You have 5 attempts per step. Tap any heart at the top to inspect previous attempt feedback.</p>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className={`mt-4 w-full py-2.5 rounded-xl font-semibold text-sm ${buttonClass}`}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};