export interface ConditionSpec {
  id: string;
  label: string;
  type: 'temperature' | 'pressure' | 'energy' | 'heating' | 'environment' | 'both';
  operator: '=' | '<' | '>' | '<=' | '>=' | 'range';
  value?: string | number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
}

export interface Transition {
  target: string;
  process: string;
  reagents: string[];
  catalysts: string[];
  conditions: ConditionSpec[];
  notes: string;
}

export interface Compound {
  name: string;
  smiles: string;
  formula: string;
  tags: string[]; // Replaces directingEffect to be useful for both modes
  transitions: Transition[];
}

export interface GameConfig {
  title: string;
  startNode: string;
  data: Record<string, Compound>;
  reagents: string[];
  catalysts: string[];
  conditions: ConditionSpec[];
  themeColor: string;
  filters: { label: string; value: string }[];
}