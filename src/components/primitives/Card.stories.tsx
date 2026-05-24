import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Card from "./Card";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card style={{ width: 320 }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Card title</h3>
      <p style={{ margin: 0, color: "var(--ink-soft)" }}>
        Default card styling reads from <code>[data-cards]</code> on
        <code>&lt;html&gt;</code>, which defaults to <code>shadow</code>.
      </p>
    </Card>
  ),
};

export const WithAccent: Story = {
  render: () => (
    <Card accent="var(--flame)" style={{ width: 320 }}>
      <p style={{ margin: 0 }}>
        The <code>accent</code> prop exposes a CSS variable
        <code> --accent </code> for downstream rules to use (gradient borders,
        color-mixed surfaces, etc.).
      </p>
    </Card>
  ),
};

export const Row: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      <Card>Card A</Card>
      <Card>Card B</Card>
      <Card>Card C</Card>
    </div>
  ),
};
