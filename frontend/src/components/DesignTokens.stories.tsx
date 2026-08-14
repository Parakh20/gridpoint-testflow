import type { Meta, StoryObj } from "@storybook/react";

function TokenSwatch() {
  const sizes: Array<[string, string]> = [
    ["display", "text-display"],
    ["page-title", "text-page-title"],
    ["section-title", "text-section-title"],
    ["card-title", "text-card-title"],
    ["body", "text-body"],
    ["metadata", "text-metadata"],
    ["micro-label", "text-micro-label"],
  ];
  return (
    <div className="space-y-3 bg-background p-6">
      {sizes.map(([name, cls]) => (
        <p key={name} className={cls}>
          {name} — The quick brown fox
        </p>
      ))}
      <div className="mt-6 h-16 w-48 rounded-lg bg-surface-elevated border border-border" />
    </div>
  );
}

const meta: Meta<typeof TokenSwatch> = { title: "Design System/Tokens", component: TokenSwatch };
export default meta;
type Story = StoryObj<typeof TokenSwatch>;
export const Typography: Story = {};
