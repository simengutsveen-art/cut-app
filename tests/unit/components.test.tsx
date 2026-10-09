import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from '../../src/components/Stepper';
import { InlineConfirm, NumberField } from '../../src/components/ui';

function StepperHarness() {
  const [value, setValue] = useState(60);
  return <Stepper label="Kg" value={value} step={2.5} onChange={setValue} />;
}

describe('Stepper', () => {
  it('± endrer verdien og viser desimalkomma', async () => {
    render(<StepperHarness />);
    const input = screen.getByRole('textbox', { name: 'Kg' });
    expect(input).toHaveValue('60');
    await userEvent.click(screen.getByRole('button', { name: 'Kg pluss 2,5' }));
    expect(input).toHaveValue('62,5');
    await userEvent.click(screen.getByRole('button', { name: 'Kg minus 2,5' }));
    await userEvent.click(screen.getByRole('button', { name: 'Kg minus 2,5' }));
    expect(input).toHaveValue('57,5');
  });

  it('kan skrives inn med komma', async () => {
    render(<StepperHarness />);
    const input = screen.getByRole('textbox', { name: 'Kg' });
    await userEvent.clear(input);
    await userEvent.type(input, '61,25');
    fireEvent.blur(input);
    expect(input).toHaveValue('61,25');
  });
});

describe('NumberField', () => {
  it('lagrer desimaltall med komma ved Enter', async () => {
    const onCommit = vi.fn();
    render(<NumberField label="Vekt" value={null} onCommit={onCommit} decimals={1} />);
    const input = screen.getByRole('textbox', { name: 'Vekt' });
    expect(input).toHaveAttribute('inputmode', 'decimal');
    await userEvent.type(input, '80,2{Enter}');
    expect(onCommit).toHaveBeenCalledWith(80.2);
  });

  it('avviser ugyldig input', async () => {
    const onCommit = vi.fn();
    render(<NumberField label="Skritt" integer value={null} onCommit={onCommit} />);
    const input = screen.getByRole('textbox', { name: 'Skritt' });
    await userEvent.type(input, 'mange{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('InlineConfirm', () => {
  it('krever to trykk og bruker ikke confirm()', async () => {
    const onConfirm = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(
      <MemoryRouter>
        <InlineConfirm
          label="Slett"
          confirmLabel="Ja, slett"
          message="Sikker?"
          onConfirm={onConfirm}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Slett' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Sikker?');
    await userEvent.click(screen.getByRole('button', { name: 'Ja, slett' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
