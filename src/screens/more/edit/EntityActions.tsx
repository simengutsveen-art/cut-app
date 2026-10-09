import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, InlineConfirm } from '../../../components/ui';
import { canDelete, deleteEntity, setActive, usageOf } from '../../../data/editOps';
import { hasSeedVersion, resetToSeed } from '../../../data/seedSync';
import { db } from '../../../db';
import { TABLE_LABELS } from '../../../lib/labels';
import { useAppData } from '../../../state/appData';
import type { Editable, EntityTableName } from '../../../types';

/** Felles handlinger nederst i redigeringsskjemaene. */
export function EntityActions({
  table,
  id,
  entity,
  onReset,
}: {
  table: EntityTableName;
  id: string;
  entity: Editable;
  onReset: () => void;
}) {
  const { seed, plan } = useAppData();
  const navigate = useNavigate();
  const usage = useLiveQuery(() => usageOf(db, table, id, plan), [table, id, plan]);
  const [message, setMessage] = useState<string | null>(null);
  const labels = TABLE_LABELS[table];
  const deletable = usage ? canDelete(entity.source, usage) : false;

  return (
    <Card className="mt-6 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Badge>{entity.source === 'seed' ? 'Fra planen' : 'Egen'}</Badge>
        {entity.userModified && <Badge tone="accent">Endret av deg</Badge>}
        {!entity.active && <Badge tone="warn">Deaktivert</Badge>}
      </div>
      {usage && (usage.inLogs > 0 || usage.references.length > 0) && (
        <p className="text-sm text-muted">
          Brukes {usage.inLogs > 0 && `i ${usage.inLogs} logger`}
          {usage.inLogs > 0 && usage.references.length > 0 && ' og '}
          {usage.references.length > 0 && `av ${usage.references.join(', ')}`}.
        </p>
      )}

      {entity.source === 'seed' && entity.userModified && hasSeedVersion(seed, table, id) && (
        <Button
          variant="secondary"
          block
          onClick={async () => {
            await resetToSeed(db, seed, table, id);
            onReset();
            setMessage('Tilbakestilt til standard.');
          }}
        >
          Tilbakestill til standard
        </Button>
      )}

      <Button
        variant="secondary"
        block
        onClick={async () => {
          await setActive(db, table, id, !entity.active);
          setMessage(
            entity.active ? `Deaktivert. Den vises ikke lenger i valglister.` : 'Aktivert.',
          );
        }}
      >
        {entity.active ? 'Deaktiver' : 'Aktiver'}
      </Button>

      {deletable ? (
        <InlineConfirm
          label={`Slett ${labels.singular}`}
          message="Dette kan ikke angres."
          confirmLabel="Slett"
          onConfirm={async () => {
            if (await deleteEntity(db, table, id, plan))
              navigate(`/mer/data/${labels.slug}`, { replace: true });
          }}
        />
      ) : (
        <p className="text-xs text-muted">
          {entity.source === 'seed'
            ? 'Elementer fra planen kan ikke slettes, bare deaktiveres.'
            : 'Kan ikke slettes fordi den er i bruk. Deaktiver i stedet.'}
        </p>
      )}
      {message && (
        <p className="text-sm text-good" role="status">
          {message}
        </p>
      )}
    </Card>
  );
}
