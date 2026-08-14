import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No projects yet" description="Create your first project to get started." />);
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first project to get started.')).toBeInTheDocument();
  });

  it('fires the action callback on click', () => {
    const onClick = vi.fn();
    render(<EmptyState title="No projects yet" action={{ label: 'New Project', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits the action button when none is provided', () => {
    render(<EmptyState title="No projects yet" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
