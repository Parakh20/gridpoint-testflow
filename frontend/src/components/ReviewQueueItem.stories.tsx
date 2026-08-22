import type { Meta, StoryObj } from '@storybook/react';
import { ReviewQueueItem } from './ReviewQueueItem';

const meta: Meta<typeof ReviewQueueItem> = { title: 'Supervisor/ReviewQueueItem', component: ReviewQueueItem };
export default meta;
type Story = StoryObj<typeof ReviewQueueItem>;

const base = {
  testName: 'Insulation Resistance',
  testCode: 'IR-01',
  equipmentLabel: 'PTR-001',
  equipmentType: 'POWER_TRANSFORMER',
  projectNumber: 'TF-1042',
  onToggleSelect: () => {},
  onOpenProject: () => {},
  onRework: () => {},
  onApprove: () => {},
};

export const Default: Story = { args: { ...base, selected: false, reviewing: false } };
export const Selected: Story = { args: { ...base, selected: true, reviewing: false } };
export const Reviewing: Story = { args: { ...base, selected: false, reviewing: true } };
