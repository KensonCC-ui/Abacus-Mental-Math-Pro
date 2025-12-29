
export enum Difficulty {
  UNIT = 'UNIT',
  TENS = 'TENS',
  HUNDREDS = 'HUNDREDS',
  THOUSANDS = 'THOUSANDS',
  MIXED = 'MIXED'
}

export interface BeadState {
  top: boolean;
  bottom: boolean[]; // 4 beads
}

export interface ColumnData {
  id: number;
  value: number;
  state: BeadState;
}

export interface AbacusStep {
  message: string;
  speak: string;
  snapshot: ColumnData[];
  activeCol?: number;
  formula?: string;
}

export interface Question {
  n1: number;
  n2: number;
  op: '+' | '-';
  target: number;
}
