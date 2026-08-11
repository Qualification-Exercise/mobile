import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { makeAutoObservable } from 'mobx';
import { useWalletSessionLock } from '../useWalletSessionLock';
import { lockWdkWalletSession } from '../wdkSessionLock';

const mockGoToBiometricUnlock = jest.fn();

class TestAppStateStore {
  prevState: 'active' | 'inactive' | 'background' | null = null;
  state: 'active' | 'inactive' | 'background' = 'active';

  constructor() {
    makeAutoObservable(this);
  }

  setState(state: 'active' | 'inactive' | 'background') {
    this.prevState = this.state;
    this.state = state;
  }

  get isAppInBackground() {
    return this.state === 'background';
  }

  get isActive() {
    return this.state === 'active';
  }
}

class TestWdkAppStore {
  status: 'READY' | 'LOCKED' | 'NO_WALLET' = 'READY';

  constructor() {
    makeAutoObservable(this);
  }

  get hasWallet() {
    return this.status !== 'NO_WALLET';
  }

  setStatus(status: 'READY' | 'LOCKED' | 'NO_WALLET') {
    this.status = status;
  }
}

const mockStores = {
  appStateStore: new TestAppStateStore(),
  authStore: { isAuthenticated: true },
  biometryStore: { isEnrolled: true },
  navigationStore: { goToBiometricUnlock: mockGoToBiometricUnlock },
  wdkAppStore: new TestWdkAppStore(),
};

jest.mock('@shared/store', () => ({
  useStore: () => mockStores,
}));

jest.mock('../wdkSessionLock', () => ({
  lockWdkWalletSession: jest.fn(() => true),
}));

function TestComponent() {
  useWalletSessionLock();
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStores.appStateStore.prevState = null;
  mockStores.appStateStore.state = 'active';
  mockStores.wdkAppStore.status = 'READY';
});

it('ignores the inactive to active transition caused by Face ID', async () => {
  mockStores.wdkAppStore.status = 'LOCKED';
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<TestComponent />);
  });
  act(() => {
    mockStores.appStateStore.setState('inactive');
    mockStores.appStateStore.setState('active');
  });

  expect(mockGoToBiometricUnlock).not.toHaveBeenCalled();

  act(() => renderer.unmount());
});

it('requests biometric unlock after this hook locks a backgrounded wallet', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<TestComponent />);
  });
  act(() => {
    mockStores.appStateStore.setState('background');
  });

  expect(lockWdkWalletSession).toHaveBeenCalledTimes(1);

  act(() => {
    mockStores.wdkAppStore.setStatus('LOCKED');
    mockStores.appStateStore.setState('inactive');
    mockStores.appStateStore.setState('active');
  });

  expect(mockGoToBiometricUnlock).toHaveBeenCalledTimes(1);

  act(() => renderer.unmount());
});
