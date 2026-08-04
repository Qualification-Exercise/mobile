import { makeAutoObservable } from 'mobx';
import { AppState, type AppStateStatus } from 'react-native';

export class AppStateStore {
  prevState: AppStateStatus | null = null;
  state = AppState.currentState;

  constructor() {
    makeAutoObservable(this);
  }

  setStateChange(nextAppState: AppStateStatus) {
    this.prevState = this.state;
    this.state = nextAppState;
  }

  get isForegroundFromBackground(): boolean {
    return Boolean(
      this.prevState?.match(/background/) && this.state === 'active',
    );
  }

  get isForegroundFromInactive(): boolean {
    return Boolean(
      this.prevState?.match(/inactive/) && this.state === 'active',
    );
  }

  get isAppInactive(): boolean {
    return Boolean(
      this.prevState?.match(/active/) && this.state === 'inactive',
    );
  }

  get isAppInBackground(): boolean {
    return Boolean(
      this.prevState?.match(/active|inactive/) && this.state === 'background',
    );
  }

  get isActive(): boolean {
    return this.state === 'active';
  }

  get isInactive(): boolean {
    return this.state === 'inactive';
  }

  get isBackground(): boolean {
    return this.state === 'background';
  }
}
