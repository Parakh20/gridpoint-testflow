import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as toHaveNoViolations from 'vitest-axe/matchers';
import { MetricCard } from './MetricCard';

expect.extend(toHaveNoViolations);

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

  it('accepts a ReactNode value, not just string | number', () => {
    render(<MetricCard label="Active Projects" value={<span data-testid="counter">12</span>} />);
    expect(screen.getByTestId('counter')).toBeInTheDocument();
  });
});
