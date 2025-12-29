
import { ColumnData, BeadState, AbacusStep, Question } from '../types';

export const COLUMNS = 9;
export const UNIT_NAMES = ["個", "十", "百", "千", "萬", "十萬", "百萬", "千萬", "億"];

export const valueToState = (val: number): BeadState => {
  const top = val >= 5;
  const bottomCount = val % 5;
  return {
    top,
    bottom: [0, 1, 2, 3].map(i => i < bottomCount)
  };
};

export const stateToValue = (state: BeadState): number => {
  return (state.top ? 5 : 0) + state.bottom.filter(b => b).length;
};

export const getInitialAbacus = (): ColumnData[] => {
  return Array.from({ length: COLUMNS }).map((_, i) => ({
    id: i,
    value: 0,
    state: valueToState(0)
  }));
};

export const calculateTotal = (columns: ColumnData[]): number => {
  let total = 0;
  columns.forEach((col, i) => {
    const power = COLUMNS - 1 - i;
    total += col.value * Math.pow(10, power);
  });
  return total;
};

export const generateSteps = (question: Question): AbacusStep[] => {
  const steps: AbacusStep[] = [];
  let currentAbacus = getInitialAbacus();
  const { n1, n2, op } = question;

  // 第一步：撥入第一數
  steps.push({
    message: `準備撥入第一數：${n1}`,
    speak: `準備撥入${n1}`,
    snapshot: JSON.parse(JSON.stringify(currentAbacus))
  });

  const s1 = n1.toString().padStart(COLUMNS, '0');
  for (let i = 0; i < COLUMNS; i++) {
    const digit = parseInt(s1[i]);
    if (digit > 0) {
      currentAbacus[i].value = digit;
      currentAbacus[i].state = valueToState(digit);
      steps.push({
        message: `${UNIT_NAMES[COLUMNS - 1 - i]}位：撥入 ${digit}`,
        speak: `${UNIT_NAMES[COLUMNS - 1 - i]}位撥入${digit}`,
        snapshot: JSON.parse(JSON.stringify(currentAbacus)),
        activeCol: i
      });
    }
  }

  // 第二步：進行運算
  const actionWord = op === '+' ? '加' : '減';
  steps.push({
    message: `準備${actionWord}第二數：${n2}`,
    speak: `準備${actionWord}${n2}`,
    snapshot: JSON.parse(JSON.stringify(currentAbacus))
  });

  const s2 = n2.toString().padStart(COLUMNS, '0');
  const tempValues = currentAbacus.map(c => c.value);

  for (let i = 0; i < COLUMNS; i++) {
    const val2 = parseInt(s2[i]);
    if (val2 === 0) continue;

    const oldVal = tempValues[i];
    if (op === '+') {
      let formula = "直加";
      let displayMsg = "";
      
      if (oldVal < 5 && (oldVal + val2) >= 5 && (oldVal + val2) < 10) {
        formula = `加 5 減 ${5 - val2}`;
        displayMsg = formula;
      } else if (oldVal + val2 >= 10) {
        formula = `減 ${10 - val2} 加 10`;
        displayMsg = formula;
      } else {
        displayMsg = `直加 ${val2}`;
      }

      tempValues[i] += val2;
      currentAbacus[i].value = tempValues[i] % 10;
      currentAbacus[i].state = valueToState(currentAbacus[i].value);
      
      steps.push({
        message: `${UNIT_NAMES[COLUMNS - 1 - i]}位：${displayMsg}`,
        speak: `${UNIT_NAMES[COLUMNS - 1 - i]}位${displayMsg}`,
        snapshot: JSON.parse(JSON.stringify(currentAbacus)),
        activeCol: i,
        formula: formula !== "直加" ? formula : undefined
      });

      if (tempValues[i] >= 10) {
        tempValues[i] -= 10;
        let j = i - 1;
        while (j >= 0) {
          tempValues[j] += 1;
          currentAbacus[j].value = tempValues[j] % 10;
          currentAbacus[j].state = valueToState(currentAbacus[j].value);
          steps.push({
            message: `${UNIT_NAMES[COLUMNS - 1 - j]}位：進位 加 1`,
            speak: `${UNIT_NAMES[COLUMNS - 1 - j]}位進位加一`,
            snapshot: JSON.parse(JSON.stringify(currentAbacus)),
            activeCol: j
          });
          if (tempValues[j] < 10) break;
          tempValues[j] -= 10;
          j--;
        }
      }
    } else {
      let formula = "直減";
      let displayMsg = "";

      if (oldVal >= 5 && (oldVal - val2) < 5 && (oldVal - val2) >= 0) {
        formula = `減 5 加 ${5 - val2}`;
        displayMsg = formula;
      } else if (oldVal < val2) {
        formula = `減 10 加 ${10 - val2}`;
        displayMsg = formula;
      } else {
        displayMsg = `直減 ${val2}`;
      }

      tempValues[i] -= val2;
      
      if (tempValues[i] < 0) {
        tempValues[i] += 10;
        currentAbacus[i].value = tempValues[i];
        currentAbacus[i].state = valueToState(currentAbacus[i].value);
        steps.push({
          message: `${UNIT_NAMES[COLUMNS - 1 - i]}位：${displayMsg}`,
          speak: `${UNIT_NAMES[COLUMNS - 1 - i]}位${displayMsg}`,
          snapshot: JSON.parse(JSON.stringify(currentAbacus)),
          activeCol: i,
          formula: formula !== "直減" ? formula : undefined
        });

        let j = i - 1;
        while (j >= 0) {
          tempValues[j] -= 1;
          const borrowVal = (tempValues[j] + 10) % 10;
          currentAbacus[j].value = borrowVal;
          currentAbacus[j].state = valueToState(borrowVal);
          steps.push({
            message: `${UNIT_NAMES[COLUMNS - 1 - j]}位：退位 減 1`,
            speak: `${UNIT_NAMES[COLUMNS - 1 - j]}位退位減一`,
            snapshot: JSON.parse(JSON.stringify(currentAbacus)),
            activeCol: j
          });
          if (tempValues[j] >= 0) break;
          tempValues[j] += 10;
          j--;
        }
      } else {
        currentAbacus[i].value = tempValues[i];
        currentAbacus[i].state = valueToState(currentAbacus[i].value);
        steps.push({
          message: `${UNIT_NAMES[COLUMNS - 1 - i]}位：${displayMsg}`,
          speak: `${UNIT_NAMES[COLUMNS - 1 - i]}位${displayMsg}`,
          snapshot: JSON.parse(JSON.stringify(currentAbacus)),
          activeCol: i,
          formula: formula !== "直減" ? formula : undefined
        });
      }
    }
  }

  return steps;
};
