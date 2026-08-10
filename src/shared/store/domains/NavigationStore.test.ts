import { NavigationStore } from './NavigationStore';

// Only the two flags `bootRoute` reads are needed from the root store.
function makeStore(auth: boolean, enrolled: boolean) {
  const root = {
    authStore: { isAuthenticated: auth },
    biometryStore: { isEnrolled: enrolled },
  };
  return new NavigationStore(root as any);
}

function makeRef(overrides: Record<string, unknown> = {}) {
  return {
    isReady: () => true,
    reset: jest.fn(),
    navigate: jest.fn(),
    ...overrides,
  };
}

describe('bootRoute', () => {
  it('routes to sign-in, biometric enrolment, then unlock', () => {
    expect(makeStore(false, false).bootRoute).toBe('SignIn');
    expect(makeStore(true, false).bootRoute).toBe('EnableBiometric');
    expect(makeStore(true, true).bootRoute).toBe('BiometricUnlock');
  });
});

describe('setActiveRouteName', () => {
  it('normalizes undefined to null', () => {
    const store = makeStore(true, true);
    store.setActiveRouteName('DevMenu');
    expect(store.activeRouteName).toBe('DevMenu');
    store.setActiveRouteName(undefined);
    expect(store.activeRouteName).toBeNull();
  });
});

describe('goToBiometricUnlock', () => {
  it('resets the stack when ready and not already there', () => {
    const store = makeStore(true, true);
    const ref = makeRef();
    store.setNavigationRef(ref as any);
    store.goToBiometricUnlock();
    expect(ref.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'BiometricUnlock' }],
    });
  });

  it('does nothing when already on the unlock screen', () => {
    const store = makeStore(true, true);
    const ref = makeRef();
    store.setNavigationRef(ref as any);
    store.setActiveRouteName('BiometricUnlock');
    store.goToBiometricUnlock();
    expect(ref.reset).not.toHaveBeenCalled();
  });

  it('does nothing when the navigator is not ready', () => {
    const store = makeStore(true, true);
    const ref = makeRef({ isReady: () => false });
    store.setNavigationRef(ref as any);
    store.goToBiometricUnlock();
    expect(ref.reset).not.toHaveBeenCalled();
  });
});

describe('goToDevMenu', () => {
  it('navigates to the dev menu when ready', () => {
    const store = makeStore(true, true);
    const ref = makeRef();
    store.setNavigationRef(ref as any);
    store.goToDevMenu();
    expect(ref.navigate).toHaveBeenCalledWith('DevMenu');
  });

  it('does nothing when not ready or already on the dev menu', () => {
    const notReady = makeStore(true, true);
    const ref1 = makeRef({ isReady: () => false });
    notReady.setNavigationRef(ref1 as any);
    notReady.goToDevMenu();
    expect(ref1.navigate).not.toHaveBeenCalled();

    const onMenu = makeStore(true, true);
    const ref2 = makeRef();
    onMenu.setNavigationRef(ref2 as any);
    onMenu.setActiveRouteName('DevMenu');
    onMenu.goToDevMenu();
    expect(ref2.navigate).not.toHaveBeenCalled();
  });
});
