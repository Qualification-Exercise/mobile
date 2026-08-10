import { useCallback, useMemo } from 'react';
import {
  useAccount,
  type TransactionResult,
} from '@tetherto/wdk-react-native-core';
import { AccountService } from '@wdk-internal/services/accountService';
import type { NetworkName } from '../../../../../.wdk';
import {
  getAssetConfig,
  getChainKind,
  getNativeAsset,
  getNativeMaxTransferFee,
  type SupportedAssetConfig,
} from '@shared/config';
import { useAssetBalances } from './useAssetBalances';
import { useEnsureWdkReady, useIsWdkReady } from './useEnsureWdkReady';

// Who pays the gas.
//
// `native` spends the chain's own coin, the way any ordinary wallet does.
// `token` routes the operation through the ERC-4337 paymaster, which fronts
// the coin and bills the account in USDt — the account needs no gas coin at
// all, but it must hold enough USDt to cover the transfer *and* the fee.
export type GasMode = 'native' | 'token';

// Passed to the account method as its `config` override. Only ERC-4337 EVM
// accounts take one; on the other chains the fee always comes out of the coin
// being moved, so they are called exactly as before.
//
// `transferMaxFee` has to be restated: the configured one is denominated in
// the paymaster token (USDt, 6 decimals), and native fees are in wei, so
// leaving it in place rejects every native transfer as "Exceeded maximum fee
// cost". The quote path does not check the cap, so a stale one only shows up
// at send time.
// The published overload of `callAccountMethod` only models the arguments
// `useAccount` happens to pass. The implementation forwards every extra
// argument to the worklet untouched, which is how the `config` override
// reaches the account method — so the call is made through the untyped shape.
const callAccountMethod = AccountService.callAccountMethod as (
  network: string,
  accountIndex: number,
  methodName: string,
  ...args: unknown[]
) => Promise<unknown>;

function gasOverride(network: NetworkName, mode: GasMode) {
  if (getChainKind(network) !== 'evm' || mode === 'token') {
    return undefined;
  }

  const maxFee = getNativeMaxTransferFee(network);
  return {
    useNativeCoins: true,
    // Serialised to the worklet as JSON, so the cap crosses as a decimal
    // string rather than a bigint.
    transferMaxFee: maxFee?.toString(),
  };
}

// Fee estimate for a transfer (a send result without the broadcast hash),
// plus the gas mode the estimate was made under — the fee is denominated in
// that mode's token, and the send has to use the same one.
export type FeeEstimate = Omit<TransactionResult, 'hash'> & {
  gasMode: GasMode;
};

export interface UseAssetTransferResult {
  // The account's receive/sender address for this asset's network.
  address: string | null;
  isLoading: boolean;
  error: Error | null;
  // Whether the WDK is in a state that can service a transfer. Read-only,
  // best-effort callers (e.g. fee estimation) should gate on this rather than
  // calling `estimateFee`/`send` blindly, since it never surfaces an alert.
  isReady: boolean;
  // Estimate the network fee for sending `amountBaseUnits` to `to`.
  estimateFee: (to: string, amountBaseUnits: string) => Promise<FeeEstimate>;
  // Sign and broadcast a transfer of `amountBaseUnits` to `to`. Pass the
  // `gasMode` the fee was quoted under so the user pays what they were shown.
  send: (
    to: string,
    amountBaseUnits: string,
    gasMode?: GasMode,
  ) => Promise<TransactionResult & { gasMode: GasMode }>;
}

// One transfer call against the worklet. Mirrors what `useAccount` does, with
// the gas-mode override appended — `callAccountMethod` forwards extra
// arguments to the account method untouched, and every ERC-4337 transfer entry
// point takes `config` as its second parameter.
async function callTransfer(
  config: SupportedAssetConfig,
  accountIndex: number,
  action: 'quote' | 'send',
  to: string,
  amountBaseUnits: string,
  mode: GasMode,
): Promise<{ fee: string; hash?: string }> {
  const override = gasOverride(config.network, mode);

  if (config.isNative) {
    const method =
      action === 'quote' ? 'quoteSendTransaction' : 'sendTransaction';
    return (await callAccountMethod(
      config.network,
      accountIndex,
      method,
      { to, value: amountBaseUnits },
      override,
    )) as { fee: string; hash?: string };
  }

  if (!config.address) {
    throw new Error(`Asset "${config.id}" has no contract address`);
  }

  const method = action === 'quote' ? 'quoteTransfer' : 'transfer';
  return (await callAccountMethod(
    config.network,
    accountIndex,
    method,
    { recipient: to, amount: amountBaseUnits, token: config.address },
    override,
  )) as { fee: string; hash?: string };
}

// Transfer surface for a single registered asset. Resolves the asset's config
// from the registry, binds a WDK account on its network, and exposes send/fee
// estimation in base units. Both writes are gated on WDK readiness.
export function useAssetTransfer(assetId: string): UseAssetTransferResult {
  const config = getAssetConfig(assetId);

  if (!config) {
    throw new Error(`useAssetTransfer: unknown asset id "${assetId}"`);
  }

  const ensureWdkReady = useEnsureWdkReady();
  const isReady = useIsWdkReady();
  const account = useAccount<object>({
    accountIndex: 0,
    network: config.network,
  });

  const { balances } = useAssetBalances();

  // Gas is paid in the chain's own coin whenever the account holds any, and
  // falls back to the USDt paymaster when it holds none. Trying native first
  // is what makes a funded account behave like an ordinary wallet; the
  // paymaster is the safety net for an account with no gas coin at all.
  const nativeAsset = getNativeAsset(config.network);
  const hasNativeGas =
    getChainKind(config.network) !== 'evm' ||
    (nativeAsset != null && BigInt(balances.get(nativeAsset.id) ?? '0') > 0n);

  // Modes to try when quoting, best first. The second is only reached when the
  // first is refused — typically the paymaster rejecting an account that
  // cannot cover the fee in USDt, or a gas coin balance too small for the
  // operation.
  const modes = useMemo<GasMode[]>(
    () => (hasNativeGas ? ['native', 'token'] : ['token', 'native']),
    [hasNativeGas],
  );

  const run = useCallback(
    async (
      action: 'quote' | 'send',
      to: string,
      amountBaseUnits: string,
      forced?: GasMode,
    ) => {
      // Only the send path alerts. A quote is read-only and best-effort, so it
      // must stay silent even when readiness flips between render and call —
      // callers gate on `isReady` and treat a throw as a blank fee.
      if (action === 'send') {
        ensureWdkReady();
      }

      const attempts = forced ? [forced] : modes;
      let lastError: unknown;

      for (const mode of attempts) {
        try {
          const result = await callTransfer(
            config,
            0,
            action,
            to,
            amountBaseUnits,
            mode,
          );
          return { ...result, gasMode: mode };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error('Transfer failed');
    },
    [ensureWdkReady, config, modes],
  );

  // Fee estimation is a read-only, best-effort path: it must never alert. So
  // it does not call the alerting `ensureWdkReady` guard — callers gate on
  // `isReady` and treat any throw here as a soft failure (blank fee).
  const estimateFee = useCallback(
    async (to: string, amountBaseUnits: string): Promise<FeeEstimate> => {
      const { fee, gasMode } = await run('quote', to, amountBaseUnits);
      return { success: true, fee, gasMode };
    },
    [run],
  );

  // A send is never retried in the other mode. A broadcast that failed late
  // may still have reached the bundler, and a second attempt would be a second
  // payment; the user also agreed to a fee in one specific token. The caller
  // passes the mode its quote came back with.
  const send = useCallback(
    async (to: string, amountBaseUnits: string, gasMode?: GasMode) => {
      const result = await run(
        'send',
        to,
        amountBaseUnits,
        gasMode ?? modes[0],
      );
      return {
        success: true,
        hash: result.hash ?? '',
        fee: result.fee,
        gasMode: result.gasMode,
      };
    },
    [run, modes],
  );

  return useMemo(
    () => ({
      address: account.address,
      isLoading: account.isLoading,
      error: account.error,
      isReady,
      estimateFee,
      send,
    }),
    [
      account.address,
      account.isLoading,
      account.error,
      isReady,
      estimateFee,
      send,
    ],
  );
}
