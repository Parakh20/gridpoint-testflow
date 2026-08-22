import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as toHaveNoViolations from 'vitest-axe/matchers';
import { EquipmentUnitCard } from './EquipmentUnitCard';

expect.extend(toHaveNoViolations);

describe('EquipmentUnitCard', () => {
  it('renders label, type, and progress', () => {
    render(
      <EquipmentUnitCard
        label="PTR-001"
        equipmentType="POWER_TRANSFORMER"
        status="IN_PROGRESS"
        completedCount={2}
        totalCount={5}
        selected={false}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText('PTR-001')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('fires onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <EquipmentUnitCard
        label="PTR-001"
        equipmentType="POWER_TRANSFORMER"
        status="ASSIGNED"
        completedCount={0}
        totalCount={3}
        selected={false}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /PTR-001/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('reflects selected state via aria-pressed', () => {
    render(
      <EquipmentUnitCard
        label="PTR-001"
        equipmentType="POWER_TRANSFORMER"
        status="ASSIGNED"
        completedCount={0}
        totalCount={3}
        selected
        onSelect={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /PTR-001/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <EquipmentUnitCard
        label="PTR-001"
        equipmentType="POWER_TRANSFORMER"
        status="REWORK"
        completedCount={1}
        totalCount={4}
        selected={false}
        onSelect={() => {}}
      />
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
