import { makeAutoObservable, runInAction } from 'mobx';
import type { UseWalletManagerResult } from '@tetherto/wdk-react-native-core';
import { validateMnemonic } from '@tetherto/wdk-react-native-core';
import { Request } from '@shared/store/request';
import { DEFAULT_WALLET_ID, MNEMONIC_WORD_COUNT } from './constants';
import { lockWdkWalletSession } from './wdkSessionLock';

type WalletManagerApi = Pick<
  UseWalletManagerResult,
  | 'generateMnemonic'
  | 'restoreWallet'
  | 'unlock'
  | 'deleteWallet'
  | 'getMnemonic'
  | 'getSeedAndEntropyFromMnemonic'
>;

function splitMnemonic(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

export class WalletSeedPhraseStore {
  isBridgeReady = false;

  /** Mnemonic shown on recovery-phrase screen before persist (memory only). */
  previewMnemonic: string[] = [];

  /** Result of async worklet validation for restore flow. */
  isWorkletValid: boolean | null = null;

  isValidating = false;

  /** Mnemonic revealed from secure storage (settings only, cleared on leave). */
  revealedMnemonic: string[] = [];

  /** Bumped after delete so navigation can react. */
  walletDeletedSignal = 0;

  generateMnemonicRequest: Request<string[]>;

  persistWalletRequest: Request<string[]>;

  restoreWalletRequest: Request<string[]>;

  unlockWalletRequest: Request<string[]>;

  deleteWalletRequest: Request<string[]>;

  revealMnemonicRequest: Request<string[]>;

  private api: WalletManagerApi | null = null;

  private validationSeq = 0;

  constructor() {
    this.generateMnemonicRequest = new Request(
      async () => {
        const mnemonic = await this.requireApi().generateMnemonic(
          MNEMONIC_WORD_COUNT,
        );
        const words = splitMnemonic(mnemonic);
        runInAction(() => {
          this.previewMnemonic = words;
        });
        return words;
      },
      {
        initialData: [] as string[],
        defaultError: 'Could not generate recovery phrase',
        loadingMessage: 'Generating recovery phrase…',
      },
    );

    this.persistWalletRequest = new Request(
      async () => {
        const mnemonic = this.previewMnemonic.join(' ');
        if (this.previewMnemonic.length !== MNEMONIC_WORD_COUNT) {
          throw new Error('Recovery phrase is not ready');
        }
        await this.requireApi().restoreWallet(mnemonic, DEFAULT_WALLET_ID);
        return this.previewMnemonic;
      },
      {
        initialData: [] as string[],
        defaultError: 'Could not save wallet',
        loadingMessage: 'Saving wallet…',
      },
    );

    this.restoreWalletRequest = new Request(
      async (words: string[]) => {
        const mnemonic = words.join(' ').trim();
        await this.requireApi().restoreWallet(mnemonic, DEFAULT_WALLET_ID);
        runInAction(() => {
          this.previewMnemonic = words;
        });
        return words;
      },
      {
        initialData: [] as string[],
        defaultError: 'Could not restore wallet',
        loadingMessage: 'Restoring wallet…',
      },
    );

    this.unlockWalletRequest = new Request(
      async (walletId: string = DEFAULT_WALLET_ID) => {
        await this.requireApi().unlock(walletId);
        return [] as string[];
      },
      {
        initialData: [] as string[],
        defaultError: 'Could not unlock wallet',
        loadingMessage: 'Unlocking wallet…',
      },
    );

    this.deleteWalletRequest = new Request(
      async (options?: { emitDeletedSignal?: boolean; walletId?: string }) => {
        const walletId = options?.walletId ?? DEFAULT_WALLET_ID;
        runInAction(() => {
          this.unlockWalletRequest.loading = false;
          this.unlockWalletRequest.error = '';
        });
        await this.requireApi().deleteWallet(walletId);
        runInAction(() => {
          this.previewMnemonic = [];
          this.revealedMnemonic = [];
          if (options?.emitDeletedSignal !== false) {
            this.walletDeletedSignal += 1;
          }
        });
        return [] as string[];
      },
      {
        initialData: [] as string[],
        defaultError: 'Could not delete wallet',
        loadingMessage: 'Deleting wallet…',
      },
    );

    this.revealMnemonicRequest = new Request(
      async (walletId: string = DEFAULT_WALLET_ID) => {
        const mnemonic = await this.requireApi().getMnemonic(walletId);
        if (!mnemonic) {
          throw new Error('Could not read recovery phrase');
        }
        const words = splitMnemonic(mnemonic);
        runInAction(() => {
          this.revealedMnemonic = words;
        });
        return words;
      },
      {
        initialData: [] as string[],
        defaultError: 'Could not reveal recovery phrase',
        loadingMessage: 'Authenticating…',
      },
    );

    makeAutoObservable(this);
  }

  bind(api: WalletManagerApi) {
    this.api = api;
    this.isBridgeReady = true;
  }

  unbind() {
    this.api = null;
    this.isBridgeReady = false;
  }

  isShapeValid(words: string[]): boolean {
    return validateMnemonic(words.join(' ').trim());
  }

  async validateMnemonicPhrase(words: string[]): Promise<boolean> {
    const mnemonic = words.join(' ').trim();
    const seq = ++this.validationSeq;

    if (!validateMnemonic(mnemonic)) {
      runInAction(() => {
        if (seq !== this.validationSeq) {
          return;
        }
        this.isWorkletValid = false;
        this.isValidating = false;
      });
      return false;
    }

    if (!this.api) {
      return false;
    }

    runInAction(() => {
      if (seq !== this.validationSeq) {
        return;
      }
      this.isValidating = true;
      this.isWorkletValid = null;
    });

    try {
      await this.api.getSeedAndEntropyFromMnemonic(mnemonic);
      runInAction(() => {
        if (seq !== this.validationSeq) {
          return;
        }
        this.isWorkletValid = true;
      });
      return seq === this.validationSeq;
    } catch {
      runInAction(() => {
        if (seq !== this.validationSeq) {
          return;
        }
        this.isWorkletValid = false;
      });
      return false;
    } finally {
      runInAction(() => {
        if (seq !== this.validationSeq) {
          return;
        }
        this.isValidating = false;
      });
    }
  }

  resetValidation() {
    this.validationSeq += 1;
    this.isWorkletValid = null;
    this.isValidating = false;
  }

  lockWalletSession() {
    runInAction(() => {
      this.unlockWalletRequest.loading = false;
      this.unlockWalletRequest.error = '';
    });
    lockWdkWalletSession();
  }

  clearRevealedMnemonic() {
    this.revealedMnemonic = [];
    this.revealMnemonicRequest.data = [];
    this.revealMnemonicRequest.error = '';
  }

  async openExistingWallet(): Promise<boolean> {
    this.restoreWalletRequest.error = '';
    this.unlockWalletRequest.error = '';
    await this.unlockWalletRequest.fetch(DEFAULT_WALLET_ID);
    return !this.unlockWalletRequest.error;
  }

  private requireApi(): WalletManagerApi {
    if (!this.api) {
      throw new Error('Wallet runtime is not ready');
    }
    return this.api;
  }
}
