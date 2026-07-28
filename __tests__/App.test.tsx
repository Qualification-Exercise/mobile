/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...require('react-native-safe-area-context/jest/mock').default,
}));

import App from '@app';

test('boots to the sign-in screen', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const text = JSON.stringify(renderer!.toJSON());
  expect(text).toContain('WDK Wallet');
  expect(text).toContain('Continue with Apple');
});
