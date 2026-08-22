import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as toHaveNoViolations from 'vitest-axe/matchers';
import { ReworkBanner } from './ReworkBanner';

expect.extend(toHaveNoViolations);

describe('ReworkBanner', () => {
  it('renders the rework reason text', () => {
    render(<ReworkBanner reason="Retake IR test — reading out of range." />);
    expect(screen.getByText('Retake IR test — reading out of range.')).toBeInTheDocument();
    expect(screen.getByText(/rework required/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ReworkBanner reason="Fix the CT ratio entry." />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
