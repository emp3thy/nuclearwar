import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { HoldButton } from '../../src/ui/components/comic';

describe('<HoldButton>', () => {
  it('fires onComplete after the hold duration', async () => {
    const onComplete = vi.fn();
    const { getByRole } = render(
      <HoldButton onComplete={onComplete} duration={50}>SEAL</HoldButton>,
    );
    fireEvent.mouseDown(getByRole('button'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it('does not fire when released early', async () => {
    const onComplete = vi.fn();
    const { getByRole } = render(
      <HoldButton onComplete={onComplete} duration={200}>SEAL</HoldButton>,
    );
    const btn = getByRole('button');
    fireEvent.mouseDown(btn);
    fireEvent.mouseUp(btn);
    await new Promise((r) => setTimeout(r, 300));
    expect(onComplete).not.toHaveBeenCalled();
  });
});
