import { render } from '@testing-library/react';
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider, Outlet } from '@tanstack/react-router';

// Suppresshidden console errors from TanStack Router in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: Failed to append child to body') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
       args[0].includes('history.replaceState'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

export async function renderRouter(pages, initial = '/') {
  const root = createRootRoute({ component: Outlet });
  const routeTree = root.addChildren(Object.entries(pages).map(([path, component]) => createRoute({ getParentRoute: () => root, path, component })));
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [initial] }) });
  try {
    await router.load();
  } catch (e) {
    // Ignore scroll restoration errors in jsdom
    if (!e.message?.includes('scroll') && !e.message?.includes('appendChild')) {
      throw e;
    }
  }
  return { ...render(<RouterProvider router={router} />), router };
}
