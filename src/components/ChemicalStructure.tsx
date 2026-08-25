import React, { useEffect, useRef } from 'react';
// @ts-ignore -- smiles-drawer ships no types
import SmilesDrawer from 'smiles-drawer';

import { useTheme } from '../providers/ThemeProvider';

interface Props {
  smiles: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renders a SMILES string as an SVG skeletal structure.
 *
 * Changed from the original: the drawer picks its palette from the *resolved*
 * theme in React context rather than reading `document.documentElement` at draw
 * time. Reading the DOM meant a structure drawn before a theme flip kept its old
 * colours until something else forced a redraw — visible as dark-on-dark
 * molecules after toggling. Depending on `resolvedTheme` makes the redraw
 * automatic.
 */
export const ChemicalStructure: React.FC<Props> = ({
  smiles,
  width = 110,
  height = 110,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.innerHTML = '';

    const drawer = new SmilesDrawer.SvgDrawer({
      width,
      height,
      bondThickness: 2.0,
      bondLength: 26,
      shortBondLength: 0.82,
      bondSpacing: 0.2 * 26,
      atomVisualization: 'default',
      isomeric: true,
      fontSizeLarge: 7,
      fontSizeSmall: 5,
      padding: 6,
      themes: {
        dark: {
          C: '#f8fafc',
          O: '#ef4444',
          N: '#3b82f6',
          Cl: '#22c55e',
          Br: '#b45309',
          BACKGROUND: 'transparent',
        },
        light: {
          C: '#0f172a',
          O: '#dc2626',
          N: '#2563eb',
          Cl: '#16a34a',
          Br: '#92400e',
          BACKGROUND: 'transparent',
        },
      },
    });

    let cancelled = false;

    SmilesDrawer.parse(
      smiles,
      (tree: unknown) => {
        // The parse callback is async; a fast scroll through a deck can resolve
        // it after the component has moved on to a different molecule.
        if (cancelled || !svgRef.current) return;
        drawer.draw(tree, svgRef.current, resolvedTheme, false);
      },
      () => {
        if (cancelled || !svgRef.current) return;
        svgRef.current.innerHTML =
          '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
          'fill="currentColor" font-size="11">Structure</text>';
      },
    );

    return () => {
      cancelled = true;
    };
  }, [smiles, width, height, resolvedTheme]);

  return (
    <div className={`flex items-center justify-center p-1 ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Skeletal structure for ${smiles}`}
        className="w-full h-full max-w-full max-h-full overflow-visible"
      />
    </div>
  );
};
