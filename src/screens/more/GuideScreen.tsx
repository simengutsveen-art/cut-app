import { Card, Page, PageHeader } from '../../components/ui';
import { guideLabel } from '../../lib/labels';
import { useAppData } from '../../state/appData';
import type { GuideValue } from '../../types';

function GuideBody({ value }: { value: GuideValue }) {
  if (typeof value === 'string') return <p>{value}</p>;
  if (Array.isArray(value)) {
    return (
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        {value.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    );
  }
  return (
    <dl className="flex flex-col gap-2">
      {Object.entries(value).map(([k, v]) => (
        <div key={k}>
          <dt className="font-semibold">{guideLabel(k)}</dt>
          <dd className="text-muted">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GuideScreen() {
  const { plan } = useAppData();
  return (
    <Page>
      <PageHeader title="Guide" back="/mer" />
      <div className="flex flex-col gap-3">
        {Object.entries(plan.guides).map(([key, value]) => (
          <Card key={key}>
            <h2 className="mb-2 text-lg font-bold">{guideLabel(key)}</h2>
            <GuideBody value={value} />
          </Card>
        ))}
      </div>
    </Page>
  );
}
