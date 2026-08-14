import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Active Projects" value={12} />);
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders a delta with direction-based styling', () => {
    render(<MetricCard label="Overdue" value={2} delta={{ value: '+1', direction: 'up' }} />);
    const delta = screen.getByText('+1');
    expect(delta).toHaveClass('text-destructive');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MetricCard label="Pending Review" value={6} tone="warning" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
