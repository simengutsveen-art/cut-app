import type { Adjustment, AdjustmentRule, AdjustmentRules } from '../types';
import { daysBetween } from './dates';
import { lossPerWeek, waistDrop, waistForWeek } from './progress';

// ---------- Liten, trygg tolker for condition-strengene i seed-fila ----------
// Støtter tall, variabler, < <= > >= == !=, sammenkjedede sammenligninger
// («0.3 <= lossPerWeek <= 0.7»), && og ||. Ingen eval.

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: '<' | '<=' | '>' | '>=' | '==' | '!=' }
  | { t: 'and' }
  | { t: 'or' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|==|!=|<|>)|(&&)|(\|\|))/y;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) throw new Error(`Ugyldig betingelse ved «${src.slice(pos)}»`);
    pos = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) tokens.push({ t: 'id', v: m[2] });
    else if (m[3] !== undefined) tokens.push({ t: 'op', v: m[3] as '<' });
    else if (m[4] !== undefined) tokens.push({ t: 'and' });
    else if (m[5] !== undefined) tokens.push({ t: 'or' });
  }
  return tokens;
}

function compare(a: number, op: string, b: number): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '==':
      return a === b;
    case '!=':
      return a !== b;
  }
  throw new Error(`Ukjent operator ${op}`);
}

export function evaluateCondition(condition: string, vars: Record<string, number>): boolean {
  const tokens = tokenize(condition);
  let i = 0;

  const operand = (): number => {
    const tok = tokens[i++];
    if (!tok) throw new Error(`Uventet slutt i «${condition}»`);
    if (tok.t === 'num') return tok.v;
    if (tok.t === 'id') {
      if (!(tok.v in vars)) throw new Error(`Ukjent variabel «${tok.v}» i «${condition}»`);
      return vars[tok.v];
    }
    throw new Error(`Forventet tall eller variabel i «${condition}»`);
  };

  const chain = (): boolean => {
    let left = operand();
    let result = true;
    let count = 0;
    while (tokens[i]?.t === 'op') {
      const op = (tokens[i++] as { v: string }).v;
      const right = operand();
      result = result && compare(left, op, right);
      left = right;
      count++;
    }
    if (count === 0) throw new Error(`Mangler sammenligning i «${condition}»`);
    return result;
  };

  const and = (): boolean => {
    let result = chain();
    while (tokens[i]?.t === 'and') {
      i++;
      result = chain() && result;
    }
    return result;
  };

  const or = (): boolean => {
    let result = and();
    while (tokens[i]?.t === 'or') {
      i++;
      result = and() || result;
    }
    return result;
  };

  const value = or();
  if (i !== tokens.length) throw new Error(`Ugyldig betingelse «${condition}»`);
  return value;
}

// ---------- Anbefaling ----------

export type Recommendation =
  | { kind: 'too-early'; week: number; startFromWeek: number }
  | {
      kind: 'no-data';
      week: number;
      missing: ('weight-now' | 'weight-before')[];
    }
  | {
      kind: 'rule';
      week: number;
      rule: AdjustmentRule;
      lossPerWeek: number;
      waistDrop: number;
      waistNow: { value: number; measured: boolean };
      waistBefore: { value: number; measured: boolean };
      avgNow: number;
      avgBefore: number;
      /** Foreslått endring (0 = ingen endring) */
      kcalDelta: number;
      stepsDelta: number;
      /** «stopp»-regelen: skritt er allerede økt de siste ukene, så nå foreslås kcal */
      escalatedToKcal: boolean;
      /** Forslaget ville tatt kcal-målet under gulvet – vis advarsel i stedet */
      blockedByFloor: boolean;
      newKcalTarget: number;
    };

export interface RecommendInput {
  week: number;
  today: string;
  rules: AdjustmentRules;
  weightAverages: Map<number, number>;
  waist: Map<number, number>;
  startWaistCm: number;
  currentKcalTarget: number;
  kcalFloor: number;
  acceptedAdjustments: Adjustment[];
}

/** Følger adjustmentRules i rekkefølgen de står. Første regel som slår til, gjelder. */
export function recommend(input: RecommendInput): Recommendation {
  const { week, rules } = input;
  if (week < rules.startFromWeek) {
    return { kind: 'too-early', week, startFromWeek: rules.startFromWeek };
  }
  const loss = lossPerWeek(input.weightAverages, week);
  if (loss === null) {
    const missing: ('weight-now' | 'weight-before')[] = [];
    if (!input.weightAverages.has(week)) missing.push('weight-now');
    if (!input.weightAverages.has(week - 2)) missing.push('weight-before');
    return { kind: 'no-data', week, missing };
  }
  const drop = waistDrop(input.waist, week, input.startWaistCm) ?? 0;
  const vars = { lossPerWeek: loss, waistDrop: drop };
  const rule = rules.rules.find((r) => evaluateCondition(r.condition, vars));
  if (!rule) return { kind: 'no-data', week, missing: [] };

  let kcalDelta = rule.kcalDelta;
  let stepsDelta = rule.stepsDelta ?? 0;
  let escalatedToKcal = false;

  if (rule.stepsFirst && stepsDelta !== 0) {
    const windowDays = rules.windowWeeks * 7;
    const recentSteps = input.acceptedAdjustments.some(
      (a) =>
        a.ruleId === rule.id &&
        a.stepsDelta !== 0 &&
        daysBetween(a.date, input.today) >= 0 &&
        daysBetween(a.date, input.today) <= windowDays,
    );
    if (recentSteps) {
      stepsDelta = 0;
      escalatedToKcal = true;
    } else {
      kcalDelta = 0;
    }
  }

  const newKcalTarget = input.currentKcalTarget + kcalDelta;
  const blockedByFloor = kcalDelta < 0 && newKcalTarget < input.kcalFloor;

  return {
    kind: 'rule',
    week,
    rule,
    lossPerWeek: loss,
    waistDrop: drop,
    waistNow: waistForWeek(input.waist, week, input.startWaistCm),
    waistBefore: waistForWeek(input.waist, week - 2, input.startWaistCm),
    avgNow: input.weightAverages.get(week)!,
    avgBefore: input.weightAverages.get(week - 2)!,
    kcalDelta,
    stepsDelta,
    escalatedToKcal,
    blockedByFloor,
    newKcalTarget,
  };
}

/** Har anbefalingen noe å godta? */
export function hasActionableChange(rec: Recommendation): boolean {
  return (
    rec.kind === 'rule' && !rec.blockedByFloor && (rec.kcalDelta !== 0 || rec.stepsDelta !== 0)
  );
}
