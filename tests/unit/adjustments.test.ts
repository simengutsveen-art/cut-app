import { describe, expect, it } from 'vitest';
import { evaluateCondition, hasActionableChange, recommend } from '../../src/lib/adjustments';
import type { Adjustment } from '../../src/types';
import { fixtureSeed } from '../helpers';

const seed = fixtureSeed();
const rules = seed.adjustmentRules;

/** Lager ukesnitt der tapet per uke (n−2 → n) blir `loss`. */
function scenario(
  loss: number,
  waistNow: number,
  opts: Partial<Parameters<typeof recommend>[0]> = {},
) {
  const week = 5;
  const weightAverages = new Map<number, number>([
    [3, 80],
    [4, 80 - loss],
    [5, 80 - loss * 2],
  ]);
  const waist = new Map<number, number>([
    [3, 90],
    [5, waistNow],
  ]);
  return recommend({
    week,
    today: '2026-11-15',
    rules,
    weightAverages,
    waist,
    startWaistCm: 92,
    currentKcalTarget: 2400,
    kcalFloor: 2100,
    acceptedAdjustments: [],
    ...opts,
  });
}

function ruleId(rec: ReturnType<typeof recommend>) {
  return rec.kind === 'rule' ? rec.rule.id : rec.kind;
}

describe('condition-tolkeren', () => {
  it('støtter sammenkjedede sammenligninger og &&', () => {
    expect(evaluateCondition('0.3 <= lossPerWeek <= 0.7', { lossPerWeek: 0.5 })).toBe(true);
    expect(evaluateCondition('0.3 <= lossPerWeek <= 0.7', { lossPerWeek: 0.71 })).toBe(false);
    expect(
      evaluateCondition('0.1 <= lossPerWeek < 0.3 && waistDrop > 0', {
        lossPerWeek: 0.2,
        waistDrop: 1,
      }),
    ).toBe(true);
    expect(() => evaluateCondition('lossPerWeek > x', { lossPerWeek: 1 })).toThrow(
      /Ukjent variabel/,
    );
    expect(() => evaluateCondition('lossPerWeek; alert(1)', { lossPerWeek: 1 })).toThrow();
  });

  it('alle betingelser i seed-fila kan tolkes', () => {
    for (const r of rules.rules) {
      expect(() =>
        evaluateCondition(r.condition, { lossPerWeek: 0.2, waistDrop: 0 }),
      ).not.toThrow();
    }
  });
});

describe('justeringsregler (én test per regel)', () => {
  it('for_raskt: > 0,7 kg/uke → +150 kcal', () => {
    const rec = scenario(0.8, 89);
    expect(ruleId(rec)).toBe('for_raskt');
    expect(rec.kind === 'rule' && rec.kcalDelta).toBe(150);
    expect(hasActionableChange(rec)).toBe(true);
  });

  it('i_rute: 0,3–0,7 kg/uke → ingenting', () => {
    const rec = scenario(0.5, 89);
    expect(ruleId(rec)).toBe('i_rute');
    expect(rec.kind === 'rule' && rec.kcalDelta).toBe(0);
    expect(hasActionableChange(rec)).toBe(false);
  });

  it('i_rute: nøyaktig 0,7 og 0,3 er innenfor', () => {
    expect(ruleId(scenario(0.7, 90))).toBe('i_rute');
    expect(ruleId(scenario(0.3, 90))).toBe('i_rute');
  });

  it('recomp: 0,1–0,3 kg/uke og livvidden går ned', () => {
    expect(ruleId(scenario(0.2, 89))).toBe('recomp');
  });

  it('folg_med: 0,1–0,3 kg/uke og livvidden står stille', () => {
    expect(ruleId(scenario(0.2, 90))).toBe('folg_med');
  });

  it('stopp: < 0,1 kg/uke og livvidden står stille → først +2 000 skritt', () => {
    const rec = scenario(0.05, 90);
    expect(ruleId(rec)).toBe('stopp');
    expect(rec.kind === 'rule' && rec.stepsDelta).toBe(2000);
    expect(rec.kind === 'rule' && rec.kcalDelta).toBe(0);
  });

  it('recomp_lav: < 0,1 kg/uke men livvidden går ned', () => {
    expect(ruleId(scenario(0.05, 89))).toBe('recomp_lav');
  });

  it('for tidlig før uke 3, og manglende data', () => {
    expect(recommend({ ...baseInput(), week: 2 }).kind).toBe('too-early');
    expect(recommend({ ...baseInput(), weightAverages: new Map([[5, 79]]) }).kind).toBe('no-data');
  });
});

describe('skritt først, så kcal', () => {
  it('foreslår −150 kcal når skritt-justeringen allerede er godtatt de siste 2 ukene', () => {
    const accepted: Adjustment[] = [
      { date: '2026-11-08', week: 4, ruleId: 'stopp', kcalDelta: 0, stepsDelta: 2000 },
    ];
    const rec = scenario(0.05, 90, { acceptedAdjustments: accepted });
    expect(rec.kind === 'rule' && rec.escalatedToKcal).toBe(true);
    expect(rec.kind === 'rule' && rec.kcalDelta).toBe(-150);
    expect(rec.kind === 'rule' && rec.stepsDelta).toBe(0);
    expect(rec.kind === 'rule' && rec.newKcalTarget).toBe(2250);
  });

  it('eldre skritt-justering (mer enn 2 uker siden) gir skritt igjen', () => {
    const accepted: Adjustment[] = [
      { date: '2026-10-25', week: 2, ruleId: 'stopp', kcalDelta: 0, stepsDelta: 2000 },
    ];
    const rec = scenario(0.05, 90, { acceptedAdjustments: accepted });
    expect(rec.kind === 'rule' && rec.stepsDelta).toBe(2000);
  });
});

describe('kcal-gulv', () => {
  it('et forslag kan aldri ta målet under kcalFloor – da vises advarsel', () => {
    const accepted: Adjustment[] = [
      { date: '2026-11-08', week: 4, ruleId: 'stopp', kcalDelta: 0, stepsDelta: 2000 },
    ];
    const rec = scenario(0.05, 90, { acceptedAdjustments: accepted, currentKcalTarget: 2200 });
    expect(rec.kind === 'rule' && rec.blockedByFloor).toBe(true);
    expect(hasActionableChange(rec)).toBe(false);
    const ok = scenario(0.05, 90, { acceptedAdjustments: accepted, currentKcalTarget: 2250 });
    expect(ok.kind === 'rule' && ok.blockedByFloor).toBe(false);
  });
});

function baseInput(): Parameters<typeof recommend>[0] {
  return {
    week: 5,
    today: '2026-11-15',
    rules,
    weightAverages: new Map([
      [3, 80],
      [5, 79],
    ]),
    waist: new Map(),
    startWaistCm: 92,
    currentKcalTarget: 2400,
    kcalFloor: 2100,
    acceptedAdjustments: [],
  };
}
