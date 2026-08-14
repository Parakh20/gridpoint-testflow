import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = { title: 'Design System/ProgressBar', component: ProgressBar };
export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = { args: { value: 72, label: 'Tests complete' } };
export const Warning: Story = { args: { value: 40, label: 'Equipment', tone: 'warning' } };
export const Danger: Story = { args: { value: 15, label: 'Overdue tasks', tone: 'danger' } };
export const NoPercentage: Story = { args: { value: 90, label: 'Approval rate', showPercentage: false } };
