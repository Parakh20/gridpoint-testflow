import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DraftStatusIndicator } from './DraftStatusIndicator';

describe('DraftStatusIndicator', () => {
  it('renders the unsaved-draft chip for status "draft"', () => {
    render(<DraftStatusIndicator status="draft" />);
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });

  it('renders nothing for status "clean"', () => {
    const { container } = render(<DraftStatusIndicator status="clean" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for status "submitted"', () => {
    const { container } = render(<DraftStatusIndicator status="submitted" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for status "approved"', () => {
    const { container } = render(<DraftStatusIndicator status="approved" />);
    expect(container).toBeEmptyDOMElement();
  });
});
