import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Route as RouteIcon, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: RouteIcon,
    title: 'Pathway puzzles, not flashcards',
    body: 'Guess the intermediates, then the reagents and conditions for each step — the same game, every time.',
  },
  {
    icon: Sparkles,
    title: 'The schedule picks the route',
    body: 'Set a daily minimum of steps per paper. Spaced repetition decides which pathways get you there fastest.',
  },
  {
    icon: Flame,
    title: 'Streaks that forgive a bad week',
    body: 'Miss a day and a banked freeze covers it automatically — consistency matters more than a perfect record.',
  },
  {
    icon: Trophy,
    title: 'Compare with your class',
    body: 'A leaderboard scoped to your school, or the whole cohort, ranked by XP or streak length.',
  },
];

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#a855f7', '#ec4899',
];

const TILE_SIZE = 48; // w-12
const GAP = 8; // gap-2

const SequencerGrid = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });
  
  // High-performance direct references to avoid querySelectorAll
  const gridRefs = useRef<(HTMLDivElement | null)[][]>([]);

  // 1. Calculate Grid
  useEffect(() => {
    const calculateGrid = () => {
      const cols = Math.floor(window.innerWidth / (TILE_SIZE + GAP)) + 2;
      const rows = Math.floor(window.innerHeight / (TILE_SIZE + GAP)) + 2;
      
      // Pre-allocate the 2D array to hold tile refs
      gridRefs.current = Array.from({ length: cols }, () => Array(rows).fill(null));
      setDimensions({ cols, rows });
    };

    calculateGrid();

    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateGrid, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Helper for applying glitch-free glow transitions
  const triggerGlow = (el: HTMLElement, color: string, isHover = false) => {
    // Snap immediately to active state
    el.style.transition = 'none';
    el.style.backgroundColor = color;
    el.style.boxShadow = `0 0 ${isHover ? '20px' : '16px'} ${color}${isHover ? '80' : '60'}`;
    el.style.borderColor = color;

    // Double requestAnimationFrame ensures the browser paints the "none" state 
    // before re-applying the transition, eliminating all CSS snapping glitches.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!el) return;
        el.style.transition = `all ${isHover ? '0.8s' : '0.6s'} ease-out`;
        el.style.backgroundColor = '';
        el.style.boxShadow = '';
        el.style.borderColor = '';
      });
    });
  };

  // 2. High-performance Animation Loop
  useEffect(() => {
    if (dimensions.cols === 0) return;
    
    let currentCol = 0;
    let animationFrameId: number;
    let lastTime = 0;
    const intervalMs = 150;

    // Using requestAnimationFrame instead of setInterval prevents background-tab 
    // pileup and syncs smoothly with the monitor's refresh rate.
    const loop = (timestamp: number) => {
      if (timestamp - lastTime >= intervalMs) {
        lastTime = timestamp;
        
        // Grab the precise column of elements straight from memory
        const colRefs = gridRefs.current[currentCol];
        
        if (colRefs) {
          const color = COLORS[Math.floor(Math.random() * COLORS.length)];
          
          for (let i = 0; i < colRefs.length; i++) {
            const el = colRefs[i];
            // Skip animating if the user is currently hovering over it
            if (!el || el.matches(':hover')) continue;
            triggerGlow(el, color, false);
          }
        }
        
        currentCol = (currentCol + 1) % dimensions.cols;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    triggerGlow(el, color, true);
  };

  if (dimensions.cols === 0) return null;

  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center overflow-hidden bg-background">
      <div
        ref={containerRef}
        className="flex-none"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${dimensions.cols}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${dimensions.rows}, ${TILE_SIZE}px)`,
          gap: `${GAP}px`,
        }}
      >
        {Array.from({ length: dimensions.rows }).map((_, r) =>
          Array.from({ length: dimensions.cols }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              ref={(el) => {
                // Populate the 2D array memory bank as React mounts elements
                if (gridRefs.current[c]) {
                  gridRefs.current[c][r] = el;
                }
              }}
              onMouseEnter={handleMouseEnter}
              // Added willChange hint to let the browser GPU accelerate the tile
              style={{ willChange: 'background-color, box-shadow, border-color' }}
              className="w-12 h-12 rounded-lg bg-secondary/30 border border-border/40 cursor-pointer"
            />
          ))
        )}
      </div>
      
      <div className="absolute inset-0 bg-background/50 pointer-events-none" style={{ maskImage: 'radial-gradient(ellipse at center, transparent 20%, black 100%)' }} />
    </div>
  );
};

export const Landing: React.FC = () => (
  // <Landing> stays exactly as you provided
  <div className="relative min-h-screen text-foreground flex flex-col overflow-hidden">
    <SequencerGrid />
    <div className="relative z-10 flex flex-col flex-1 pointer-events-none">
      
      <header className="w-full border-b border-border/40 bg-background/60 backdrop-blur-md pointer-events-auto">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-black text-lg tracking-widest text-primary">CHEMWORDLE</span>
          <Button asChild size="sm" variant="outline" className="bg-background/50 hover:bg-background">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-16 pb-12 gap-16 px-4">
        <section className="pointer-events-auto max-w-3xl mx-auto text-center space-y-6 bg-background/80 backdrop-blur-xl border border-border/50 p-8 sm:p-12 rounded-3xl shadow-2xl">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            CIE 9701 A Level Chemistry
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Organic synthesis revision that decides what you need to practise.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Set a daily minimum of reaction steps per paper. The scheduler serves you pathway
            puzzles that cover whichever steps are due or weak — you just play.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/login">Get started — it's free</Link>
            </Button>
          </div>
        </section>

        <section className="pointer-events-auto max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div 
              key={title} 
              className="bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 space-y-3 shadow-lg transition-transform hover:-translate-y-1"
            >
              <div className="bg-primary/10 w-fit p-2 rounded-lg">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-bold text-base">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="w-full border-t border-border/40 bg-background/80 backdrop-blur-md py-6 pointer-events-auto mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Not endorsed by Cambridge Assessment. Built for students studying the 9701 syllabus.
          </p>
          
          <a 
            href="https://pushthecar.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span>From</span>
            <span className="font-semibold tracking-tight">pushthecar.com</span>
          </a>
        </div>
      </footer>
    </div>
  </div>
);