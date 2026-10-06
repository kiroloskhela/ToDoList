import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { value() { this.setAttribute('open', ''); } });
Object.defineProperty(HTMLDialogElement.prototype, 'close', { value() { this.removeAttribute('open'); } });
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) });
// Node fetch requires absolute URLs; browsers resolve these against their origin.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => nativeFetch(typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input, init);
// jsdom does not implement pointer capture or scrolling used by Radix Select.
Object.defineProperties(HTMLElement.prototype, {
  hasPointerCapture: { value: () => false },
  setPointerCapture: { value() {} },
  releasePointerCapture: { value() {} },
  scrollIntoView: { value() {} },
});
