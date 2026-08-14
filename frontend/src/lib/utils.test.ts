import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('keeps a custom fontSize token alongside a text-color class', () => {
    const classes = cn('text-page-title', 'text-foreground').split(' ');
    expect(classes).toContain('text-page-title');
    expect(classes).toContain('text-foreground');
  });

  it('keeps another custom fontSize token (text-metadata) alongside a text-color class', () => {
    const classes = cn('text-metadata', 'text-destructive').split(' ');
    expect(classes).toContain('text-metadata');
    expect(classes).toContain('text-destructive');
  });

  it('still dedupes conflicting real Tailwind text-size classes', () => {
    const classes = cn('text-sm', 'text-lg').split(' ');
    expect(classes).not.toContain('text-sm');
    expect(classes).toContain('text-lg');
  });

  it('still dedupes conflicting text-color classes', () => {
    const classes = cn('text-foreground', 'text-destructive').split(' ');
    expect(classes).not.toContain('text-foreground');
    expect(classes).toContain('text-destructive');
  });
});
