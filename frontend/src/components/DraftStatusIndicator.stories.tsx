import type { Meta, StoryObj } from '@storybook/react';
import { DraftStatusIndicator } from './DraftStatusIndicator';

const meta: Meta<typeof DraftStatusIndicator> = { title: 'Engineer/DraftStatusIndicator', component: DraftStatusIndicator };
export default meta;
type Story = StoryObj<typeof DraftStatusIndicator>;

export const UnsavedDraft: Story = { args: { status: 'draft' } };
export const Clean: Story = { args: { status: 'clean' } };
