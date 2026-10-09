import { Page, PageHeader } from '../../components/ui';
import { useToday } from '../../hooks/useToday';
import { formatWeekdayLong, planStatus, planStatusLabel } from '../../lib/dates';
import { useAppData } from '../../state/appData';

export function TodayScreen() {
  const { settings, plan } = useAppData();
  const today = useToday();
  const status = planStatus(today, settings.startDate, settings.weeks);
  const phase = plan.phases.find((p) => status.week >= p.weeks[0] && status.week <= p.weeks[1]);
  const label = planStatusLabel(status, settings.weeks);
  return (
    <Page>
      <PageHeader
        title={status.kind === 'active' && phase ? `${label} · ${phase.name}` : label}
        subtitle={formatWeekdayLong(today)}
      />
    </Page>
  );
}
