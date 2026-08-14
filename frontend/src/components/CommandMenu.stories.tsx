import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandMenu } from './CommandMenu';

const meta: Meta<typeof CommandMenu> = {
  title: 'Design System/CommandMenu',
  component: CommandMenu,
  decorators: [Story => <MemoryRouter><Story /></MemoryRouter>],
};
export default meta;
type Story = StoryObj<typeof CommandMenu>;

export const Default: Story = {
  args: {
    items: [
      { id: 'projects', label: 'Projects', group: 'Navigation', href: '/gm' },
      { id: 'reports', label: 'Reports', group: 'Navigation', href: '/reports' },
      { id: 'profile', label: 'Profile', group: 'Account', href: '/profile' },
    ],
  },
  parameters: {
    docs: {
      description: {
        component: 'Press ⌘K / Ctrl+K to open (Storybook canvas must be focused).',
      },
    },
  },
};
