import { makeAutoObservable } from 'mobx';
import type { WdkAppState } from '@tetherto/wdk-react-native-core';

const INITIAL_STATE: WdkAppState = { status: 'INITIALIZING' };

// 'INITIALIZING' Worklet is starting or wallet is loading
// 'NO_WALLET'	Worklet is ready, no wallet has been created
// 'LOCKED'	walletId: string	A wallet exists but is locked (requires biometric unlock)
// 'READY'	walletId: string	Wallet is unlocked and ready for operations
// 'ERROR'	error: Error	Initialization failed
export class WdkAppStore {
  state: WdkAppState = INITIAL_STATE;

  constructor() {
    makeAutoObservable(this);
  }

  get isStartingRuntime() {
    return (
      this.state.status === 'INITIALIZING' ||
      this.state.status === 'REINITIALIZING'
    );
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
