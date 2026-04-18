import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount components after each test so DOM state doesn't leak between tests.
afterEach(() => {
  cleanup();
});
