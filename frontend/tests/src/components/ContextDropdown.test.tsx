import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContextDropdown from '../../../src/components/ContextDropdown';
import '@testing-library/jest-dom';

// Mock the API and other hooks
jest.mock('../../../src/lib/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({
      data: {
        'other-wds-context': ['context1', 'context2'],
      },
    }),
  },
}));

jest.mock('../../../src/stores/themeStore', () => () => ({
  theme: 'dark',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock WebSocket hook
jest.mock('../../../src/hooks/useWebSocket', () => ({
  useContextCreationWebSocket: () => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: true,
  }),
}));

describe('ContextDropdown Keyboard Navigation', () => {
  const mockOnContextFilter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to and selects "Create Context" using keyboard', async () => {
    const user = userEvent.setup();
    render(
      <ContextDropdown
        onContextFilter={mockOnContextFilter}
        resourceCounts={{ context1: 5, context2: 0 }}
        totalResourceCount={5}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('contexts.allContexts')).toBeInTheDocument();
    });

    // 1. Find the trigger button
    const trigger = screen.getByRole('button', { name: /contexts.allContexts/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    expect(trigger).not.toHaveAttribute('aria-expanded'); // Initially closed

    // 2. Open menu with Enter (or click, but testing keyboard)
    trigger.focus();
    await user.keyboard('{Enter}');

    // 3. Verify menu is open
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = await screen.findByRole('menu');
    expect(menu).toBeVisible();

    // Verify items are rendered
    await screen.findByText('context1');
    await screen.findByText('context2');

    // 4. Navigate items
    // Order: "All Contexts" (focused) -> "context1" -> "context2" -> "Create Context"
    // Validated: Initial focus is on "All Contexts".
    // 1 Down -> context1
    // 2 Downs -> context2
    // 3 Downs -> Create Context
    
    await user.keyboard('{ArrowDown}'); // context1
    await user.keyboard('{ArrowDown}'); // context2
    await user.keyboard('{ArrowDown}'); // Create Context
    
    await user.keyboard('{Enter}');

    // 5. Verify Create Dialog (title)
    expect(await screen.findByText('contexts.createNewContext')).toBeVisible();

    // Verify function NOT called
    expect(mockOnContextFilter).not.toHaveBeenCalledWith('__create__');
  });

  it('selects a standard context using keyboard', async () => {
    const user = userEvent.setup();
    render(
      <ContextDropdown
        onContextFilter={mockOnContextFilter}
        resourceCounts={{ context1: 5, context2: 0 }}
        totalResourceCount={5}
      />
    );

     await waitFor(() => {
      expect(screen.getByText('contexts.allContexts')).toBeInTheDocument();
    });

     const trigger = screen.getByRole('button', { name: /contexts.allContexts/i });
     await user.click(trigger);

     const menu = await screen.findByRole('menu');
     expect(menu).toBeVisible();

     // Navigate to context1 (Item 1)
     // Start: All (Item 0)
     // 1 Down -> context1
     await user.keyboard('{ArrowDown}'); // Focus context1
     await user.keyboard('{Enter}');

     expect(mockOnContextFilter).toHaveBeenCalledWith('context1');
     // Menu should close
     await waitFor(() => {
         const hasExpanded = trigger.hasAttribute('aria-expanded');
         if (hasExpanded) {
             expect(trigger).toHaveAttribute('aria-expanded', 'false');
         } else {
             expect(trigger).not.toHaveAttribute('aria-expanded');
         }
     });
  });
});
