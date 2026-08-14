import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandMenu, type CommandMenuItem } from './CommandMenu';

const items: CommandMenuItem[] = [
  { id: 'projects', label: 'Projects', group: 'Navigation', href: '/gm' },
  { id: 'reports', label: 'Reports', group: 'Navigation', href: '/reports' },
];

function setup() {
  return render(
    <MemoryRouter>
      <CommandMenu items={items} />
    </MemoryRouter>
  );
}

describe('CommandMenu', () => {
  it('opens on Ctrl+K and closes on Escape', () => {
    setup();
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByPlaceholderText('Search…');
    expect(input).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument();
  });

  it('filters items by typed query', () => {
    setup();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'report' } });
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
  });
});
