import { AppStateStore } from './AppStateStore';

describe('AppStateStore', () => {
  it('tracks the previous and current app state', () => {
    const store = new AppStateStore();
    store.setStateChange('background');
    store.setStateChange('active');
    expect(store.prevState).toBe('background');
    expect(store.state).toBe('active');
  });

  it('detects a return to the foreground from background', () => {
    const store = new AppStateStore();
    store.setStateChange('background');
    store.setStateChange('active');
    expect(store.isForegroundFromBackground).toBe(true);
    expect(store.isActive).toBe(true);
    expect(store.isBackground).toBe(false);
  });

  it('detects going into the background from an active/inactive state', () => {
    const store = new AppStateStore();
    store.setStateChange('active');
    store.setStateChange('background');
    expect(store.isAppInBackground).toBe(true);
    expect(store.isForegroundFromBackground).toBe(false);
  });

  it('detects inactive transitions and current-state flags', () => {
    const store = new AppStateStore();
    store.setStateChange('inactive');
    store.setStateChange('active');
    expect(store.isForegroundFromInactive).toBe(true);
    expect(store.isInactive).toBe(false);

    store.setStateChange('inactive');
    expect(store.isAppInactive).toBe(true);
    expect(store.isInactive).toBe(true);
    expect(store.isActive).toBe(false);
  });
});
