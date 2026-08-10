import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  useRefreshBalance,
  type TransactionResult,
} from '@tetherto/wdk-react-native-core';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import type { CreateTransactionDTO } from '@shared/api';
import {
  getAssetConfig,
  getChainKind,
  getFeeToken,
  getNativeAsset,
  getNetworkLabel,
  getSrcChainId,
  type SupportedAssetConfig,
} from '@shared/config';
import { describeFeeError, fromBaseUnits } from '@shared/lib';
import { useAssetTransfer, type GasMode } from '@shared/lib/hooks/wallet';
import { useStore, TypedRequest } from '@shared/store';
import type { BiometryOutcome } from '@shared/store/domains';
import { shortenAddress } from '@shared/store/models/transaction';
import { colors, radii, spacing } from '@shared/ui';

const BIOMETRY_ALERTS: Record<
  Exclude<BiometryOutcome, 'unlocked'>,
  [string, string]
> = {
  unavailable: [
    'Biometrics unavailable',
    'This device has no biometrics set up. Enrol Face ID or Touch ID in system settings — or use a device that has them — then try again.',
  ],
  'permission-denied': [
    'Biometrics not allowed',
    'This app is not allowed to use biometrics. Enable it for the app in system settings, then try again.',
  ],
  failed: [
    'Not verified',
    'The scan did not match and the transaction was not signed. Try again.',
  ],
};

export const ApproveTransactionScreen = observer(
  function ApproveTransactionScreenView() {
    const { assetId, amountBaseUnits, destination, gasMode } =
      useRoute<RouteProp<RootStackParamList, 'ApproveTransaction'>>().params;
    const config = getAssetConfig(assetId);

    if (!config) {
      // Unknown asset id (e.g. a legacy id from a screen not yet migrated to
      // the registry). Nothing to sign — render nothing rather than drive the
      // transfer hooks with an unknown asset.
      return null;
    }

    return (
      <ApproveSheet
        config={config}
        amountBaseUnits={amountBaseUnits}
        destination={destination}
        quotedGasMode={gasMode}
      />
    );
  },
);

const ApproveSheet = observer(function ApproveSheetView({
  config,
  amountBaseUnits,
  destination,
  quotedGasMode,
}: {
  config: SupportedAssetConfig;
  amountBaseUnits: string;
  destination: string;
  quotedGasMode?: GasMode;
}) {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore, biometryStore } = useStore();
  const { address, send, estimateFee } = useAssetTransfer(config.id);
  const refreshBalance = useRefreshBalance();

  const [gasMode, setGasMode] = useState<GasMode>(quotedGasMode ?? 'token');
  // Both gas modes are attempted when quoting, so a failure means neither
  // token could pay — the message has to name both.
  const feeSymbols = useMemo(() => {
    const native = getNativeAsset(config.network);
    const viaPaymaster = getFeeToken(config, 'token').symbol;
    return native && native.symbol !== viaPaymaster
      ? [native.symbol, viaPaymaster]
      : [viaPaymaster];
  }, [config]);
  const feeToken = useMemo(
    () => getFeeToken(config, gasMode),
    [config, gasMode],
  );
  const amountDisplay = fromBaseUnits(amountBaseUnits, config.decimals);

  const [sendError, setSendError] = useState<string | null>(null);
  const [feeText, setFeeText] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);

  // `send` identity can change across renders; keep the TypedRequest stable by
  // calling the latest `send` through a ref rather than recreating it.
  const sendRef = useRef(send);
  sendRef.current = send;
  const request = useMemo(
    () =>
      new TypedRequest<TransactionResult | null>(
        (to: string, amount: string, mode: GasMode) =>
          sendRef.current(to, amount, mode),
        {
          initialData: null,
          defaultError: 'Transaction failed. Please try again.',
          loadingMessage: 'Broadcasting…',
        },
      ),
    [],
  );

  // One-shot fee estimate for the confirmation summary (the inputs are fixed
  // on this screen, so no debounce is needed). Best-effort: a failure just
  // leaves the fee blank and never blocks signing.
  useEffect(() => {
    let cancelled = false;
    estimateFee(destination, amountBaseUnits)
      .then(result => {
        if (cancelled) {
          return;
        }
        if (result.success) {
          // Re-quoting can land on a different mode than the send screen did
          // (a balance moved, the paymaster changed its mind), so the sheet
          // follows the quote it actually got.
          setGasMode(result.gasMode);
          setFeeText(
            fromBaseUnits(
              result.fee,
              getFeeToken(config, result.gasMode).decimals,
            ),
          );
        } else {
          setFeeError(describeFeeError(result.error, feeSymbols));
        }
      })
      .catch(thrown => {
        if (!cancelled) {
          setFeeError(
            describeFeeError(
              thrown instanceof Error ? thrown.message : null,
              feeSymbols,
            ),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [estimateFee, destination, amountBaseUnits, config, feeSymbols]);

  async function verifyTransaction() {
    if (request.loading) {
      return;
    }
    setSendError(null);

    const outcome = await biometryStore.verify('Confirm transaction');
    if (outcome !== 'unlocked') {
      // The three failures need different actions from the user, so they get
      // different words: nothing to prompt with, a revoked permission, or a
      // scan that simply did not match.
      const [title, body] = BIOMETRY_ALERTS[outcome];
      Alert.alert(title, body);
      return;
    }

    const result = await request.fetch(destination, amountBaseUnits, gasMode);

    // A thrown error (WDK not ready, network failure) is captured by the
    // TypedRequest; a soft failure comes back as `success: false`.
    if (request.error) {
      setSendError(request.error);
      return;
    }
    if (!result || !result.success) {
      setSendError(result?.error ?? 'Transaction failed. Please try again.');
      return;
    }

    // Success: the money has moved. Record real history first so it survives
    // even if the follow-up best-effort steps fail. This row is local until
    // the backend lists the same hash.
    walletStore.recordSentTransaction({
      id: result.hash,
      direction: 'out',
      counterparty: shortenAddress(destination),
      amountBaseUnits,
      decimals: config.decimals,
      symbol: config.symbol,
      date: 'Today',
      assetId: config.id,
      hash: result.hash,
      status: 'pending',
      confirmations: null,
      requiredConfirmations: 0,
    });

    // Best-effort balance refresh; a failure must not block the success UX.
    //
    // Wallet-level, not token-level: the screens read one aggregated query
    // keyed `[...byWallet(walletId, 0), 'all']`, and TanStack matches keys by
    // prefix — a `byToken` key is longer than that, so invalidating it leaves
    // the aggregate untouched and every screen stale. The gas coin moved too
    // when the fee was paid natively, so the whole wallet is refetched anyway.
    refreshBalance.mutate(
      { accountIndex: 0, type: 'wallet' },
      { onError: () => {} },
    );

    // Report the broadcast to the backend for confirmation tracking. Fire and
    // forget: best-effort, so it never blocks or undoes the on-chain send.
    const report: CreateTransactionDTO = {
      // The backend groups networks by family; `srcChainId` is what separates
      // one EVM chain from another.
      chain: getChainKind(config.network),
      srcChainId: getSrcChainId(config.network),
      txHash: result.hash,
      type: 'transfer',
      direction: 'out',
      token: config.symbol,
      amount: amountBaseUnits,
      from: address ?? '',
      to: destination,
      fee: result.fee
        ? { token: feeToken.symbol, amount: result.fee }
        : undefined,
      broadcastAt: new Date().toISOString(),
    };
    walletStore.reportSend(report).catch(() => {});

    navigation.navigate('PaymentSuccess', {
      assetSymbol: config.symbol,
      amount: amountDisplay,
      hash: result.hash,
      status: 'pending',
    });
  }

  const feeDisplay = feeText ? `≈ ${feeText} ${feeToken.symbol}` : '—';

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Confirm transaction</Text>
        <View style={styles.summary}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Send</Text>
            <Text style={styles.rowValueStrong}>
              {amountDisplay} {config.symbol}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>To</Text>
            <Text style={styles.rowValueMono}>{destination}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Network</Text>
            <Text style={styles.rowValue}>
              {getNetworkLabel(config.network)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Fee</Text>
            <Text style={styles.rowValue}>{feeDisplay}</Text>
          </View>
        </View>
        <View style={styles.biometricRow}>
          <View style={styles.biometricFrame}>
            <View style={styles.biometricInner} />
          </View>
          <Text style={styles.biometricLabel}>
            Confirm with Face ID to sign
          </Text>
        </View>
        {feeError && !sendError ? (
          <Text style={styles.error}>{feeError}</Text>
        ) : null}
        {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            request.loading && styles.confirmButtonBusy,
          ]}
          onPress={verifyTransaction}
          activeOpacity={0.85}
          disabled={request.loading}
        >
          <Text style={styles.confirmLabel}>
            {request.loading ? 'Broadcasting…' : 'Verify'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,5,7,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.xl,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  summary: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowLabel: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowValueStrong: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rowValueMono: {
    fontFamily: 'Menlo',
    fontSize: 13,
    color: colors.textPrimary,
  },
  biometricRow: {
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  biometricFrame: {
    width: 66,
    height: 66,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.accentBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricInner: {
    width: 28,
    height: 28,
    borderRadius: radii.xs - 4,
    borderWidth: 2,
    borderColor: colors.accentBright,
  },
  biometricLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.positive,
  },
  error: {
    fontSize: 13,
    color: colors.negative,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmButton: {
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonBusy: {
    opacity: 0.6,
  },
  confirmLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
});
