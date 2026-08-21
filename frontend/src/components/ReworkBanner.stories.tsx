import type { Meta, StoryObj } from '@storybook/react';
import { ReworkBanner } from './ReworkBanner';

const meta: Meta<typeof ReworkBanner> = { title: 'Engineer/ReworkBanner', component: ReworkBanner };
export default meta;
type Story = StoryObj<typeof ReworkBanner>;

export const Default: Story = { args: { reason: 'Retake the IR test — the recorded value is out of the expected range for this equipment class.' } };
