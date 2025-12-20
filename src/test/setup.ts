import '@testing-library/jest-dom/vitest';
import { afterAll, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn(
      class ResizeObserverMock {
        disconnect = vi.fn();
        unobserve = vi.fn();
        observe = vi.fn();
      }
    )
  );
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(
      class IntersectionObserverMock {
        takeRecords = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
        observe = vi.fn();
      }
    )
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});
