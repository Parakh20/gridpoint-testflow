import type { Meta, StoryObj } from '@storybook/react';
import { AlertTriangle } from 'lucide-react';
import { MetricCard } from './MetricCard';

const meta: Meta<typeof MetricCard> = { title: 'Design System/MetricCard', component: MetricCard };
export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Default: Story = { args: { label: 'Active Projects', value: 12 } };
export const WithDelta: Story = {
  args: { label: 'Overdue', value: 2, tone: 'danger', delta: { value: '+1 this week', direction: 'up' } },
};
export const WithIcon: Story = {
  args: { label: 'Pending Review', value: 6, tone: 'warning', icon: <AlertTriangle size={18} /> },
};
