import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = { title: 'Design System/EmptyState', component: EmptyState };
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = { args: { title: 'No projects yet' } };
export const WithDescription: Story = {
  args: { title: 'No projects yet', description: 'Create your first project to get started.' },
};
export const WithAction: Story = {
  args: {
    title: 'No projects yet',
    description: 'Create your first project to get started.',
    action: { label: 'New Project', onClick: () => {} },
  },
};
