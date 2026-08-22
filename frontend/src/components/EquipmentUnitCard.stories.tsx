import type { Meta, StoryObj } from '@storybook/react';
import { EquipmentUnitCard } from './EquipmentUnitCard';

const meta: Meta<typeof EquipmentUnitCard> = { title: 'Engineer/EquipmentUnitCard', component: EquipmentUnitCard };
export default meta;
type Story = StoryObj<typeof EquipmentUnitCard>;

export const Assigned: Story = {
  args: { label: 'PTR-001', equipmentType: 'POWER_TRANSFORMER', status: 'ASSIGNED', completedCount: 0, totalCount: 5, selected: false, onSelect: () => {} },
};
export const InProgressSelected: Story = {
  args: { label: 'CT-002', equipmentType: 'CT', status: 'IN_PROGRESS', completedCount: 2, totalCount: 5, selected: true, onSelect: () => {} },
};
export const Rework: Story = {
  args: { label: 'CVT-003', equipmentType: 'CVT', status: 'REWORK', completedCount: 3, totalCount: 4, selected: false, onSelect: () => {} },
};
export const Approved: Story = {
  args: { label: 'LA-004', equipmentType: 'LA', status: 'APPROVED', completedCount: 4, totalCount: 4, selected: false, onSelect: () => {} },
};
