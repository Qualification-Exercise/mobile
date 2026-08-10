import { WdkAppStore } from './WdkAppStore';

describe('WdkAppStore', () => {
  it('starts in the initializing state with no wallet id', () => {
    const store = new WdkAppStore();
    expect(store.status).toBe('INITIALIZING');
    expect(store.isStartingRuntime).toBe(true);
    expect(store.isReady).toBe(false);
    expect(store.hasWallet).toBe(true);
    expect(store.walletId).toBeNull();
  });

  it('exposes READY with its wallet id', () => {
    const store = new WdkAppStore();
    store.setState({ status: 'READY', walletId: 'w1' } as any);
    expect(store.isReady).toBe(true);
    expect(store.walletId).toBe('w1');
    expect(store.isStartingRuntime).toBe(false);
  });

  it('reports LOCKED and NO_WALLET', () => {
    const store = new WdkAppStore();
    store.setState({ status: 'LOCKED', walletId: 'w2' } as any);
    expect(store.isLocked).toBe(true);
    expect(store.walletId).toBe('w2');

    store.setState({ status: 'NO_WALLET' } as any);
    expect(store.hasWallet).toBe(false);
    expect(store.walletId).toBeNull();
  });
});
