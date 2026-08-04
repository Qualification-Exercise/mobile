import { makeAutoObservable, runInAction } from 'mobx';
import type { UseWalletManagerResult } from '@tetherto/wdk-react-native-core';
import { validateMnemonic } from '@tetherto/wdk-react-native-core';
import { TypedRequest } from '@shared/store/typedRequest';
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

type DeleteWalletOptions = {
  emitDeletedSignal?: boolean;
  walletId?: string;
};

function splitMnemonic(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

export class WalletSeedPhraseStore {
  /** Mnemonic shown on recovery-phrase screen before persist (memory only). */
  previewMnemonic: string[] = [];

  /** Result of async worklet validation for restore flow. */
  isWorkletValid: boolean | null = null;

  isValidating = false;

  /** Mnemonic revealed from secure storage (settings only, cleared on leave). */
  revealedMnemonic: string[] = [];

  /** Bumped after delete so navigation can react. */
  walletDeletedSignal = 0;

  generateMnemonicRequest: TypedRequest<string>;

  restoreWalletRequest: TypedRequest<void>;

  unlockWalletRequest: TypedRequest<void>;

  deleteWalletRequest: TypedRequest<void>;

  revealMnemonicRequest: TypedRequest<string>;

  api: WalletManagerApi | null = null;

  private validationSeq = 0;

  constructor() {
    this.generateMnemonicRequest = new TypedRequest(
      async () => this.requireApi().generateMnemonic(MNEMONIC_WORD_COUNT),
      {
        initialData: '',
        defaultError: 'Could not generate recovery phrase',
        loadingMessage: 'Generating recovery phrase…',
      },
    );

    this.restoreWalletRequest = new TypedRequest(
      async (mnemonic: string, walletId: string = DEFAULT_WALLET_ID) => {
        await this.requireApi().restoreWallet(mnemonic, walletId);
      },
      {
        initialData: undefined as void,
        defaultError: 'Could not save wallet',
        loadingMessage: 'Saving wallet…',
      },
    );

    this.unlockWalletRequest = new TypedRequest(
      async (walletId: string = DEFAULT_WALLET_ID) => {
        await this.requireApi().unlock(walletId);
      },
      {
        initialData: undefined as void,
        defaultError: 'Could not unlock wallet',
        loadingMessage: 'Unlocking wallet…',
      },
    );

    this.deleteWalletRequest = new TypedRequest(
      async (walletId: string = DEFAULT_WALLET_ID) => {
        await this.requireApi().deleteWallet(walletId);
      },
      {
        initialData: undefined as void,
        defaultError: 'Could not delete wallet',
        loadingMessage: 'Deleting wallet…',
      },
    );

    this.revealMnemonicRequest = new TypedRequest(
      async (walletId: string = DEFAULT_WALLET_ID) => {
        const mnemonic = await this.requireApi().getMnemonic(walletId);
        if (!mnemonic) {
          throw new Error('Could not read recovery phrase');
        }
        return mnemonic;
      },
      {
        initialData: '',
        defaultError: 'Could not reveal recovery phrase',
        loadingMessage: 'Authenticating…',
      },
    );

    makeAutoObservable(this);
  }

  bind(api: WalletManagerApi) {
    this.api = api;
  }

  unbind() {
    this.api = null;
  }

  async ensurePreviewMnemonic(): Promise<void> {
    if (this.previewMnemonic.length === MNEMONIC_WORD_COUNT) {
      return;
    }

    await this.generateMnemonicRequest.fetch();
    if (
      this.generateMnemonicRequest.error ||
      !this.generateMnemonicRequest.data
    ) {
      return;
    }

    runInAction(() => {
      this.previewMnemonic = splitMnemonic(this.generateMnemonicRequest.data);
    });
  }

  async persistWallet(): Promise<void> {
    if (this.previewMnemonic.length !== MNEMONIC_WORD_COUNT) {
      runInAction(() => {
        this.restoreWalletRequest.error = 'Recovery phrase is not ready';
      });
      return;
    }

    const mnemonic = this.previewMnemonic.join(' ');
    await this.restoreWalletRequest.fetch(mnemonic);
  }

  async restoreWallet(words: string[]): Promise<void> {
    const mnemonic = words.join(' ').trim();
    await this.restoreWalletRequest.fetch(mnemonic);
    if (this.restoreWalletRequest.error) {
      return;
    }

    this.clearPreviewMnemonic();
  }

  async unlockWallet(walletId: string = DEFAULT_WALLET_ID): Promise<void> {
    await this.unlockWalletRequest.fetch(walletId);
  }

  async deleteWallet(options?: DeleteWalletOptions): Promise<void> {
    const walletId = options?.walletId ?? DEFAULT_WALLET_ID;

    runInAction(() => {
      this.unlockWalletRequest.loading = false;
      this.unlockWalletRequest.error = '';
    });

    await this.deleteWalletRequest.fetch(walletId);
    if (this.deleteWalletRequest.error) {
      return;
    }

    runInAction(() => {
      this.clearPreviewMnemonic();
      this.revealedMnemonic = [];
      if (options?.emitDeletedSignal !== false) {
        this.walletDeletedSignal += 1;
      }
    });
  }

  async revealMnemonic(walletId: string = DEFAULT_WALLET_ID): Promise<void> {
    await this.revealMnemonicRequest.fetch(walletId);
    if (this.revealMnemonicRequest.error || !this.revealMnemonicRequest.data) {
      return;
    }

    runInAction(() => {
      this.revealedMnemonic = splitMnemonic(this.revealMnemonicRequest.data);
    });
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
    this.revealMnemonicRequest.data = '';
    this.revealMnemonicRequest.error = '';
  }

  /** Wipe onboarding preview words from memory after persist or restore. */
  clearPreviewMnemonic() {
    this.previewMnemonic = [];
    this.generateMnemonicRequest.data = '';
    this.generateMnemonicRequest.error = '';
    this.restoreWalletRequest.error = '';
  }

  async openExistingWallet(): Promise<void> {
    this.restoreWalletRequest.error = '';
    this.unlockWalletRequest.error = '';
    await this.unlockWallet();
  }

  private requireApi(): WalletManagerApi {
    if (!this.api) {
      throw new Error('Wallet runtime is not ready');
    }
    return this.api;
  }
}
