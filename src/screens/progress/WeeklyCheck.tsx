import { IconCheck, IconWarning } from '../../components/icons';
import { Badge, Button, Card } from '../../components/ui';
import { acceptAdjustment, dismissCheck, undismissCheck } from '../../data/progressOps';
import { db } from '../../db';
import { formatDate } from '../../lib/dates';
import { fmtSigned, formatNumber } from '../../lib/format';
import { hasActionableChange, type Recommendation } from '../../lib/adjustments';
import { useAppData } from '../../state/appData';
import type { Adjustment } from '../../types';

export function WeeklyCheck({
  rec,
  today,
  isSunday,
  accepted,
  dismissed,
}: {
  rec: Recommendation;
  today: string;
  isSunday: boolean;
  accepted: Adjustment | undefined;
  dismissed: boolean;
}) {
  const { settings, plan } = useAppData();
  const notes = plan.adjustmentRules.notes;

  return (
    <Card tone={isSunday ? 'accent' : undefined} aria-label="Ukessjekk">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Ukessjekk · uke {rec.week}</h2>
          <p className="text-sm text-muted">
            {isSunday ? 'Søndag – tid for ukessjekk' : 'Gjøres på søndag'} · nå{' '}
            {formatNumber(settings.currentKcalTarget)} kcal
            {settings.stepsBonus > 0 && ` · +${formatNumber(settings.stepsBonus)} skritt`}
          </p>
        </div>
        {accepted && (
          <Badge tone="good">
            <IconCheck size={14} /> Godtatt
          </Badge>
        )}
      </div>

      {rec.kind === 'too-early' && (
        <div className="mt-3 text-sm">
          <p>Første ukessjekk er i uke {rec.startFromWeek}.</p>
          {notes[0] && <p className="mt-1 text-muted">{notes[0]}</p>}
        </div>
      )}

      {rec.kind === 'no-data' && (
        <p className="mt-3 text-sm">
          Trenger vekt i både uke {rec.week - 2} og uke {rec.week} for å regne ut tapet. Registrer
          morgenvekta under «I dag».
        </p>
      )}

      {rec.kind === 'rule' && (
        <>
          <dl className="tabular mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-surface-2 p-2">
              <dt className="text-muted">Tap per uke</dt>
              <dd className="text-xl font-bold">{formatNumber(rec.lossPerWeek, 2)} kg</dd>
              <dd className="text-xs text-muted">
                snitt {formatNumber(rec.avgBefore, 1, 1)} → {formatNumber(rec.avgNow, 1, 1)} (uke{' '}
                {rec.week - 2} → {rec.week})
              </dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-2">
              <dt className="text-muted">Livvidde</dt>
              <dd className="text-xl font-bold">
                {rec.waistDrop > 0 ? '−' : rec.waistDrop < 0 ? '+' : '±'}
                {formatNumber(Math.abs(rec.waistDrop), 1)} cm
              </dd>
              <dd className="text-xs text-muted">
                {formatNumber(rec.waistBefore.value, 1)} → {formatNumber(rec.waistNow.value, 1)} cm
                {!rec.waistNow.measured && ' (ikke målt denne uka)'}
              </dd>
            </div>
          </dl>
          <div className="mt-3 rounded-xl border border-line p-3">
            <p className="text-sm text-muted">{rec.rule.when}</p>
            <p className="mt-1 font-semibold">{rec.rule.action}</p>
            {rec.blockedByFloor ? (
              <p className="mt-2 flex gap-2 text-sm text-bad" role="alert">
                <IconWarning size={18} className="shrink-0" />
                <span>
                  Forslaget ({fmtSigned(rec.kcalDelta)} kcal) ville tatt målet under gulvet på{' '}
                  {formatNumber(settings.kcalFloor)} kcal. Ikke gå lavere uten å se på planen på
                  nytt.
                </span>
              </p>
            ) : hasActionableChange(rec) ? (
              <p className="mt-2 text-lg font-bold text-accent">
                Forslag:{' '}
                {rec.kcalDelta !== 0 &&
                  `${fmtSigned(rec.kcalDelta)} kcal (nytt mål ${formatNumber(rec.newKcalTarget)})`}
                {rec.stepsDelta !== 0 && `${fmtSigned(rec.stepsDelta)} skritt per dag`}
              </p>
            ) : (
              <p className="mt-2 font-semibold text-good">Ingen endring nødvendig.</p>
            )}
            {rec.escalatedToKcal && (
              <p className="mt-1 text-sm text-muted">
                Skrittene ble allerede økt de siste {plan.adjustmentRules.windowWeeks} ukene, så nå
                foreslås kcal.
              </p>
            )}
          </div>

          {accepted ? (
            <p className="mt-3 text-sm text-muted">
              Godtatt {formatDate(accepted.date)}:{' '}
              {[
                accepted.kcalDelta !== 0 && `${fmtSigned(accepted.kcalDelta)} kcal`,
                accepted.stepsDelta !== 0 && `${fmtSigned(accepted.stepsDelta)} skritt`,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          ) : hasActionableChange(rec) ? (
            dismissed ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm text-muted">Utsatt denne uka.</span>
                <Button size="sm" variant="ghost" onClick={() => void undismissCheck(db, rec.week)}>
                  Vis forslaget igjen
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => void dismissCheck(db, rec.week)}
                >
                  Ikke nå
                </Button>
                <Button
                  className="flex-1"
                  onClick={() =>
                    void acceptAdjustment(db, {
                      date: today,
                      week: rec.week,
                      ruleId: rec.rule.id,
                      kcalDelta: rec.kcalDelta,
                      stepsDelta: rec.stepsDelta,
                    })
                  }
                >
                  Godta
                </Button>
              </div>
            )
          ) : null}
        </>
      )}
    </Card>
  );
}
