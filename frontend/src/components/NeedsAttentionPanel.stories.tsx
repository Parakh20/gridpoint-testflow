import type { Meta, StoryObj } from '@storybook/react';
import { NeedsAttentionPanel } from './NeedsAttentionPanel';

const meta: Meta<typeof NeedsAttentionPanel> = { title: 'Design System/NeedsAttentionPanel', component: NeedsAttentionPanel };
export default meta;
type Story = StoryObj<typeof NeedsAttentionPanel>;

export const WithFlaggedProjects: Story = {
  args: {
    projects: [
      { id: 'p1', project_number: 'TF-1001', site_name: 'Substation Alpha', status: 'ACTIVE', end_date: '2020-01-01', assigned_to: 'sup-1' },
      { id: 'p2', project_number: 'TF-1002', site_name: 'Substation Beta', status: 'APPROVED', end_date: null, assigned_to: null },
    ],
    onSelect: () => {},
  },
};
export const AllCaughtUp: Story = { args: { projects: [], onSelect: () => {} } };
