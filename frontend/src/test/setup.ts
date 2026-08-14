import '@testing-library/jest-dom';

// Polyfill ResizeObserver for cmdk tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill scrollIntoView for cmdk tests
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function() {
    // No-op for tests
  };
}
