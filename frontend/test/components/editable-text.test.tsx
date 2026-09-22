import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditableText } from '../../src/components/ui';
import { renderWithProviders } from '../utils/render';

function setup(value = 'Whale') {
  const onSave = vi.fn();
  const utils = renderWithProviders(
    <EditableText value={value} placeholder="Add a label" label="Wallet label" onSave={onSave} />,
  );
  return { ...utils, onSave };
}

describe('EditableText', () => {
  it('should show the value in an accessible edit button', () => {
    setup();

    expect(
      screen.getByRole('button', { name: 'Wallet label: Whale. Click to edit' }),
    ).toHaveTextContent('Whale');
  });

  it('should show the placeholder when there is no value', () => {
    setup('');

    expect(
      screen.getByRole('button', { name: 'Wallet label: none. Click to edit' }),
    ).toHaveTextContent('Add a label');
  });

  it('should save the trimmed value on Enter', async () => {
    const { user, onSave } = setup();

    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox', { name: 'Wallet label' });
    await user.clear(input);
    await user.type(input, '  Big fish  {Enter}');

    expect(onSave).toHaveBeenCalledWith('Big fish');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should save when the field loses focus', async () => {
    const { user, onSave } = setup();

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByRole('textbox'), '!');
    await user.tab();

    expect(onSave).toHaveBeenCalledWith('Whale!');
  });

  it('should discard the edit on Escape', async () => {
    const { user, onSave } = setup();

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByRole('textbox'), ' changed{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveTextContent('Whale');
  });

  it('should not save when nothing changed', async () => {
    const { user, onSave } = setup();

    await user.click(screen.getByRole('button'));
    await user.keyboard('{Enter}');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should limit input to 40 characters', async () => {
    const { user } = setup('');

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '40');
  });
});
