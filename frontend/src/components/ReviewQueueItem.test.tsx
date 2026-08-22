import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as toHaveNoViolations from 'vitest-axe/matchers';
import { ReviewQueueItem } from './ReviewQueueItem';

expect.extend(toHaveNoViolations);

const baseProps = {
  testName: 'Insulation Resistance',
  testCode: 'IR-01',
  equipmentLabel: 'PTR-001',
  equipmentType: 'POWER_TRANSFORMER',
  projectNumber: 'TF-1042',
  selected: false,
  reviewing: false,
  onToggleSelect: vi.fn(),
  onOpenProject: vi.fn(),
  onRework: vi.fn(),
  onApprove: vi.fn(),
};

describe('ReviewQueueItem', () => {
  it('renders test, equipment, and project details', () => {
    render(<ReviewQueueItem {...baseProps} />);
    expect(screen.getByText('Insulation Resistance')).toBeInTheDocument();
    expect(screen.getByText('IR-01')).toBeInTheDocument();
    expect(screen.getByText('PTR-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TF-1042' })).toBeInTheDocument();
  });

  it('fires onApprove and onRework from their respective buttons', () => {
    const onApprove = vi.fn();
    const onRework = vi.fn();
    render(<ReviewQueueItem {...baseProps} onApprove={onApprove} onRework={onRework} />);
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    fireEvent.click(screen.getByRole('button', { name: /rework/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onRework).toHaveBeenCalledTimes(1);
  });

  it('disables action buttons while reviewing', () => {
    render(<ReviewQueueItem {...baseProps} reviewing />);
    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /rework/i })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ReviewQueueItem {...baseProps} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
