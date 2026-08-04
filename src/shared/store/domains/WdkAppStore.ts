import { makeAutoObservable } from 'mobx';
import type { WdkAppState } from '@tetherto/wdk-react-native-core';

const INITIAL_STATE: WdkAppState = { status: 'INITIALIZING' };

export class WdkAppStore {
  state: WdkAppState = INITIAL_STATE;

  constructor() {
    makeAutoObservable(this);
  }

  setState(state: WdkAppState) {
    this.state = state;
  }

  get status(): WdkAppState['status'] {
    return this.state.status;
  }

  get isReady(): boolean {
    return this.state.status === 'READY';
  }

  get isLocked(): boolean {
    return this.state.status === 'LOCKED';
  }

  get hasWallet(): boolean {
    return this.state.status !== 'NO_WALLET';
  }

  get walletId(): string | null {
    return 'walletId' in this.state ? this.state.walletId : null;
  }
}
