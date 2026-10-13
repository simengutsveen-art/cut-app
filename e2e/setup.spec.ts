import { expect, test, type Page } from '@playwright/test';
import { PLAN_START, startApp } from './helpers';

async function fillNumber(page: Page, label: string, value: string) {
  const field = page.getByRole('textbox', { name: label, exact: true });
  await field.fill(value);
  await field.press('Enter');
}

test('oppsett for en ny bruker: egne mål, 16 uker, tre treningsdager og egne øvelser', async ({
  page,
}) => {
  await page.clock.install({ time: PLAN_START });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Velkommen til Cut' })).toBeVisible();
  await page.getByRole('button', { name: 'Sett opp for meg' }).click();

  // Om deg (alt må fylles ut)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Om deg');
  await page.getByRole('button', { name: 'Neste' }).click();
  await expect(page.getByRole('alert')).toContainText('alderen');
  await page.getByLabel('Navn (valgfritt)').fill('Kari');
  await page.getByRole('tab', { name: 'Kvinne' }).click();
  await fillNumber(page, 'Alder', '30');
  await fillNumber(page, 'Høyde', '168');
  await fillNumber(page, 'Vekt nå', '70');
  await fillNumber(page, 'Livvidde', '82');
  await page.getByRole('button', { name: 'Neste' }).click();

  // Mål og tempo: forslaget er 12 uker (6 kg à 0,5 kg), velger 16
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mål og tempo');
  await fillNumber(page, 'Målvekt', '72');
  await page.getByRole('button', { name: 'Neste' }).click();
  await expect(page.getByRole('alert')).toContainText('lavere enn vekta');
  await fillNumber(page, 'Målvekt', '64');
  await expect(page.getByRole('radio', { name: /Moderat/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByRole('textbox', { name: 'Uker' })).toHaveValue('12');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Uker pluss 1' }).click();
  await expect(page.getByRole('textbox', { name: 'Uker' })).toHaveValue('16');
  await expect(page.getByText('Bygg 3')).toBeVisible();
  await page.getByRole('button', { name: 'Neste' }).click();

  // Hverdagen
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hverdagen din');
  await page.getByRole('radio', { name: /Litt aktiv/ }).click();
  await page.getByRole('button', { name: 'Skritt per dag pluss 500' }).click();
  await page.getByRole('button', { name: 'Skritt per dag pluss 500' }).click();
  await expect(page.getByRole('textbox', { name: 'Skritt per dag' })).toHaveValue('9 000');
  await page.getByRole('button', { name: 'Neste' }).click();

  // Trening: mandag, onsdag og fredag
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trening');
  const days = page.getByRole('group', { name: 'Treningsdager' });
  for (const day of ['Tirsdag', 'Torsdag', 'Lørdag'])
    await days.getByRole('button', { name: day }).click();
  await days.getByRole('button', { name: 'Onsdag' }).click();
  await expect(days.getByRole('button', { name: 'Onsdag' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('combobox', { name: 'Onsdag' })).toHaveValue('okt2');
  await page.getByRole('combobox', { name: 'Fredag' }).selectOption({ label: 'Bein' });

  const push = page.getByRole('region', { name: 'Øvelser i Push' });
  await expect(push).toContainText('7 øvelser');
  await push.getByRole('button', { name: 'Endre øvelser i Push' }).click();
  await push.getByRole('button', { name: 'Fjern Pec deck' }).click();
  await expect(push).toContainText('6 øvelser');
  const legs = page.getByRole('region', { name: 'Øvelser i Bein' });
  await legs.getByRole('button', { name: 'Endre øvelser i Bein' }).click();
  await legs.getByLabel('Legg til øvelse i Bein').selectOption({ label: 'Beinpress' });
  await expect(legs).toContainText('9 øvelser');
  await page.getByRole('button', { name: 'Neste' }).click();

  // Rygg og mat
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rygg og mat');
  await expect(page.getByRole('checkbox', { name: /Følg opp ryggen/ })).not.toBeChecked();
  await page.getByLabel('Mat du ikke liker').fill('sopp');
  await page.getByRole('button', { name: 'Neste' }).click();

  // Oppsummering: 1 700 kcal (Mifflin-St Jeor × 1,55 − 550), protein 2,0–2,3 g/kg målvekt
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planen din');
  await expect(page.getByRole('region', { name: 'Kalorier' })).toContainText('1 700');
  await expect(page.getByText('130–145 g')).toBeVisible();
  await expect(page.getByText('70 %')).toBeVisible();
  await expect(page.getByText('16 uker')).toBeVisible();
  await page.getByRole('button', { name: 'Fullfør oppsettet' }).click();

  // I dag: planen venter på «Start nå», uten core og rygg
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Klar til start');
  await expect(page.getByRole('region', { name: 'Start planen' })).toContainText(
    'varer planen i 16 uker',
  );
  await expect(page.getByRole('heading', { name: 'Core og rygg' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start nå' }).click();
  await page.getByRole('button', { name: 'Ja, start planen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uke 1 av 16 · Oppstart');
  await expect(page.getByRole('heading', { name: 'Push', exact: true })).toBeVisible();

  // Kalenderen har 16 uker med tre bygg-faser
  await page.goto('./#/fremgang/kalender');
  await expect(page.getByRole('region', { name: 'Bygg 3' })).toContainText('Uke 13–15');
  await expect(page.getByRole('region', { name: 'Test' })).toContainText('Uke 16');

  // Treningsfanen: Push på mandag med seks øvelser
  await page.goto('./#/trening');
  await expect(page.getByText('6 øvelser · mandag')).toBeVisible();

  // Matplanen er skalert ned (70 %)
  await page.goto('./#/mat');
  await expect(page.getByText('mål 1 700 ± 100')).toBeVisible();

  // Innstillinger viser valgene
  await page.goto('./#/mer/innstillinger');
  await expect(page.getByRole('textbox', { name: 'Navn' })).toHaveValue('Kari');
  await expect(page.getByRole('textbox', { name: 'Varighet i uker' })).toHaveValue('16');
  await expect(page.getByRole('textbox', { name: 'Skrittmål per dag' })).toHaveValue('9 000');
  await expect(page.getByRole('checkbox', { name: /Følg opp ryggen/ })).not.toBeChecked();
});

test('oppsettet kan kjøres på nytt fra Innstillinger, med valgene som står nå', async ({
  page,
}) => {
  await startApp(page);
  await page.goto('./#/mer/innstillinger');
  await page.getByRole('button', { name: 'Kjør oppsettet' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Om deg');
  await expect(page.getByLabel('Navn (valgfritt)')).toHaveValue('Simen');
  await expect(page.getByRole('textbox', { name: 'Vekt nå' })).toHaveValue('80,2');
  await page.getByRole('button', { name: 'Avbryt' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Innstillinger');
});
