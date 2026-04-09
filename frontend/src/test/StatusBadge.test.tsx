import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/StatusBadge';

// StatusBadge formats status as title-case: IN_PROGRESS → "In Progress"
function toTitle(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

describe('StatusBadge', () => {
  const statuses = ['DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED', 'UNASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REWORK'] as const;

  statuses.forEach(status => {
    it(`renders label for status "${status}"`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(toTitle(status))).toBeInTheDocument();
    });
  });

  it('applies extra className', () => {
    const { container } = render(<StatusBadge status="DRAFT" className="my-class" />);
    expect(container.querySelector('.my-class')).toBeInTheDocument();
  });

  it('falls back gracefully for unknown status', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    // Underscores replaced with spaces; original casing preserved
    expect(screen.getByText('UNKNOWN STATUS')).toBeInTheDocument();
  });
});
