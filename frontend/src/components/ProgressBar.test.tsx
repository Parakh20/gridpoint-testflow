import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders the label and percentage', () => {
    render(<ProgressBar value={72} label="Tests complete" />);
    expect(screen.getByText('Tests complete')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('hides the percentage when showPercentage is false', () => {
    render(<ProgressBar value={40} label="Equipment" showPercentage={false} />);
    expect(screen.queryByText('40%')).not.toBeInTheDocument();
  });

  it('clamps out-of-range values into 0-100', () => {
    render(<ProgressBar value={140} label="Overshoot" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
