import { describe, expect, it } from 'vitest';
import { recommend, scaleLossText } from '../../src/lib/adjustments';
import { rotationForWeek } from '../../src/lib/mealPrep';
import { mealTotals, scaleMeal } from '../../src/lib/nutrition';
import { phasesForWeeks } from '../../src/lib/phases';
import {
  bmrKcal,
  computeTargets,
  goalWaistRange,
  portionScaleFor,
  sessionWithExercises,
  settingsFromAnswers,
  suggestWeeks,
  type SetupAnswers,
} from '../../src/lib/setup';
import { settingsFromSeed } from '../../src/data/seedSync';
import type { Session } from '../../src/types';
import { fixtureSeed } from '../helpers';

const seed = fixtureSeed();

const layout = (weeks: number) =>
  phasesForWeeks(seed.phases, weeks).map((p) => `${p.name} ${p.weeks[0]}–${p.weeks[1]}`);

describe('faser for planer med annen lengde', () => {
  it('12 uker er planen slik den står', () => {
    expect(phasesForWeeks(seed.phases, 12)).toBe(seed.phases);
  });

  it('16 uker: tre bygg-blokker med lett uke imellom', () => {
    expect(layout(16)).toEqual([
      'Oppstart 1–2',
      'Bygg 1 3–6',
      'Lett uke (deload) 7–7',
      'Bygg 2 8–11',
      'Lett uke (deload) 12–12',
      'Bygg 3 13–15',
      'Test 16–16',
    ]);
  });

  it('korte planer: én oppstartsuke, én bygg-blokk og test', () => {
    expect(layout(8)).toEqual(['Oppstart 1–2', 'Bygg 3–7', 'Test 8–8']);
    expect(layout(4)).toEqual(['Oppstart 1–1', 'Bygg 2–3', 'Test 4–4']);
  });

  it('alle uker er dekket, uten hull, for 4–24 uker', () => {
    for (let weeks = 4; weeks <= 24; weeks++) {
      const phases = phasesForWeeks(seed.phases, weeks);
      let next = 1;
      for (const p of phases) {
        expect(p.weeks[0]).toBe(next);
        expect(p.weeks[1]).toBeGreaterThanOrEqual(p.weeks[0]);
        next = p.weeks[1] + 1;
      }
      expect(next - 1).toBe(weeks);
      // Bygg-blokkene beholder settene fra planen, deload halverer.
      expect(phases.filter((p) => p.name.startsWith('Bygg')).every((p) => !p.setsFactor)).toBe(
        true,
      );
    }
  });
});

describe('utregning av mål', () => {
  const kari = { sex: 'kvinne' as const, age: 30, heightCm: 168, weightKg: 70 };

  it('hvileforbrenning (Mifflin-St Jeor) stemmer med planen for Simen', () => {
    expect(Math.round(bmrKcal({ sex: 'mann', age: 22, heightCm: 185, weightKg: 80.2 }))).toBe(
      seed.settings.bmrKcal,
    );
    expect(Math.round(bmrKcal(kari))).toBe(1439);
  });

  it('kcal, gulv, protein, fett og karbo', () => {
    const t = computeTargets({ person: kari, activity: 'middels', goalKg: 64, pacePerWeek: 0.5 });
    expect(t).toMatchObject({
      maintenanceEstimateKcal: 2250,
      kcalTarget: 1700,
      kcalFloor: 1450,
      proteinTargetG: [130, 145],
      fatTargetG: [50, 65],
    });
    expect(t.carbTargetG[0]).toBeGreaterThan(100);
  });

  it('kalorimålet går aldri under gulvet, men et eget mål respekteres', () => {
    const fast = computeTargets({ person: kari, activity: 'lav', goalKg: 55, pacePerWeek: 0.75 });
    expect(fast.kcalTarget).toBeGreaterThanOrEqual(fast.kcalFloor);
    const own = computeTargets({
      person: kari,
      activity: 'middels',
      goalKg: 64,
      pacePerWeek: 0.5,
      kcalOverride: 1300,
    });
    expect(own.kcalTarget).toBe(1300);
    expect(own.kcalFloor).toBeLessThanOrEqual(1300);
  });

  it('forslag til lengde, porsjoner og livvidde', () => {
    expect(suggestWeeks(70, 64, 0.5)).toBe(12);
    expect(suggestWeeks(70, 69, 0.5)).toBe(4);
    expect(suggestWeeks(120, 80, 0.5)).toBe(24);
    expect(portionScaleFor(1700, 2400)).toBe(0.7);
    expect(portionScaleFor(5000, 2400)).toBe(1.4);
    expect(goalWaistRange(82, 70, 64)).toEqual([74, 76]);
  });
});

describe('innstillinger og økter fra oppsettet', () => {
  const answers: SetupAnswers = {
    name: ' Kari ',
    sex: 'kvinne',
    age: 30,
    heightCm: 168,
    weightKg: 70,
    waistCm: 82,
    goalKg: 64,
    pace: 0.5,
    weeks: 16,
    activity: 'middels',
    steps: 9000,
    schedule: { '1': 'okt1', '2': null, '3': 'okt2', '4': null, '5': 'okt3', '6': null, '7': null },
    backCare: false,
    dislikedFoods: ['sopp'],
    kcalOverride: null,
  };

  it('alt fra oppsettet havner i innstillingene', () => {
    const s = settingsFromAnswers(settingsFromSeed(seed), answers, seed.settings.kcalTarget);
    expect(s).toMatchObject({
      person: { name: 'Kari', age: 30, heightCm: 168, sex: 'kvinne' },
      startWeightKg: 70,
      goalWeightRangeKg: [63.5, 64.5],
      weeks: 16,
      plannedLossKgPerWeek: 0.5,
      kcalTarget: 1700,
      currentKcalTarget: 1700,
      steps: [{ weeks: [1, 16], daily: 9000, wednesday: 9000 }],
      weeklySchedule: { '1': 'okt1', '2': 'hvile', '3': 'okt2', '5': 'okt3', '7': 'hvile' },
      backCare: false,
      portionScale: 0.7,
      onboarded: true,
      userModified: true,
    });
  });

  it('øvelser fjernes og legges til, de som står igjen beholder oppsettet', () => {
    const session = { ...seed.sessions[0], source: 'seed', userModified: false, active: true };
    const next = sessionWithExercises(session as Session, ['benkpress', 'beinpress'], (id) =>
      id === 'beinpress' ? 'maskin_underkropp' : '',
    );
    expect(next.exercises.map((p) => p.exerciseId)).toEqual(['benkpress', 'beinpress']);
    expect(next.exercises[0]).toEqual(seed.sessions[0].exercises[0]);
    expect(next.exercises[1]).toMatchObject({ sets: 3, repMin: 8, repMax: 12, restSec: 120 });
  });
});

describe('mat og justeringer for andre planer', () => {
  it('porsjonene skaleres, og kcal følger med', () => {
    const ingredients = new Map(seed.ingredients.map((i) => [i.id, i]));
    const meal = seed.meals[0];
    const full = mealTotals(meal, ingredients).kcal;
    const scaled = mealTotals(scaleMeal(meal, 0.7), ingredients).kcal;
    expect(scaled / full).toBeCloseTo(0.7, 1);
    expect(scaleMeal(meal, 1)).toBe(meal);
  });

  it('meal prep-rotasjonen fortsetter etter uke 12', () => {
    const rotation = seed.mealPrepRotation;
    expect(rotationForWeek(rotation, 13)).toBe(rotationForWeek(rotation, 1));
    expect(rotationForWeek(rotation, 16)).toBe(rotationForWeek(rotation, 4));
    expect(rotationForWeek(rotation, 0)).toBeUndefined();
  });

  it('justeringsreglene følger tempoet man har valgt', () => {
    const input = {
      week: 4,
      today: '2026-11-06',
      rules: seed.adjustmentRules,
      // 0,6 kg/uke ned fra uke 2 til uke 4
      weightAverages: new Map([
        [2, 80],
        [4, 78.8],
      ]),
      waist: new Map<number, number>(),
      startWaistCm: 92,
      currentKcalTarget: 2400,
      kcalFloor: 2100,
      acceptedAdjustments: [],
    };
    // Med Simens tempo (0,4) er 0,6 kg/uke i rute …
    const simen = recommend(input);
    expect(simen.kind === 'rule' && simen.rule.id).toBe('i_rute');
    // … men med 0,25 kg/uke som mål går det for fort.
    const slow = recommend({ ...input, paceFactor: 0.4 / 0.25 });
    expect(slow.kind === 'rule' && slow.rule.id).toBe('for_raskt');
    expect(scaleLossText('Ned 0,3–0,7 kg/uke', 0.4 / 0.6)).toBe('Ned 0,45–1,05 kg/uke');
    expect(scaleLossText('Ned 0,3–0,7 kg/uke', 1)).toBe('Ned 0,3–0,7 kg/uke');
  });
});
