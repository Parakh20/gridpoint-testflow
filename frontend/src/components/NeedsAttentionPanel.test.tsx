import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as toHaveNoViolations from 'vitest-axe/matchers';
import { NeedsAttentionPanel, type AttentionProject } from './NeedsAttentionPanel';

expect.extend(toHaveNoViolations);

const overdue: AttentionProject = {
  id: 'p1', project_number: 'TF-1001', site_name: 'Substation A',
  status: 'ACTIVE', end_date: '2020-01-01', assigned_to: 'sup-1',
};
const unassigned: AttentionProject = {
  id: 'p2', project_number: 'TF-1002', site_name: 'Substation B',
  status: 'APPROVED', end_date: null, assigned_to: null,
};

describe('NeedsAttentionPanel', () => {
  it('renders each flagged project with its reason', () => {
    render(<NeedsAttentionPanel projects={[overdue, unassigned]} onSelect={vi.fn()} />);
    expect(screen.getByText('TF-1001')).toBeInTheDocument();
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    expect(screen.getByText('TF-1002')).toBeInTheDocument();
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  it('fires onSelect with the project id when a row is clicked', () => {
    const onSelect = vi.fn();
    render(<NeedsAttentionPanel projects={[overdue]} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('TF-1001'));
    expect(onSelect).toHaveBeenCalledWith('p1');
  });

  it('renders the shared EmptyState when nothing needs attention', () => {
    render(<NeedsAttentionPanel projects={[]} onSelect={vi.fn()} />);
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NeedsAttentionPanel projects={[overdue, unassigned]} onSelect={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
