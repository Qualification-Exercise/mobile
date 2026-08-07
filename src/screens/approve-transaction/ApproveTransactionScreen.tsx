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
import {
  getAssetConfig,
  getFeeToken,
  type SupportedAssetConfig,
} from '@shared/config';
import { fromBaseUnits } from '@shared/lib';
import { useAssetTransfer } from '@shared/lib/hooks/wallet';
import { useStore, TypedRequest } from '@shared/store';
import { colors, radii, spacing } from '@shared/ui';

export const ApproveTransactionScreen = observer(
  function ApproveTransactionScreenView() {
    const { assetId, amountBaseUnits, destination } =
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
      />
    );
  },
);

const ApproveSheet = observer(function ApproveSheetView({
  config,
  amountBaseUnits,
  destination,
}: {
  config: SupportedAssetConfig;
  amountBaseUnits: string;
  destination: string;
}) {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore, biometryStore } = useStore();
  const { send, estimateFee } = useAssetTransfer(config.id);
  const refreshBalance = useRefreshBalance();

  const feeToken = useMemo(() => getFeeToken(config), [config]);
  const amountDisplay = fromBaseUnits(amountBaseUnits, config.decimals);

  const [sendError, setSendError] = useState<string | null>(null);
  const [feeText, setFeeText] = useState<string | null>(null);

  // `send` identity can change across renders; keep the TypedRequest stable by
  // calling the latest `send` through a ref rather than recreating it.
  const sendRef = useRef(send);
  sendRef.current = send;
  const request = useMemo(
    () =>
      new TypedRequest<TransactionResult | null>(
        (to: string, amount: string) => sendRef.current(to, amount),
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
        if (!cancelled && result.success) {
          setFeeText(fromBaseUnits(result.fee, feeToken.decimals));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [estimateFee, destination, amountBaseUnits, feeToken.decimals]);

  async function verifyTransaction() {
    if (request.loading) {
      return;
    }
    setSendError(null);

    const outcome = await biometryStore.verify('Confirm transaction');
    if (outcome !== 'unlocked') {
      Alert.alert(
        'Face ID unavailable',
        'We could not verify your biometrics. Make sure Face ID is set up on this device, then try again.',
      );
      return;
    }

    const result = await request.fetch(destination, amountBaseUnits);

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
    // even if the follow-up best-effort steps fail.
    walletStore.recordSentTransaction({
      assetId: config.id,
      amount: Number(amountDisplay),
      destination,
      hash: result.hash,
      feeBaseUnits: result.fee,
      network: config.network,
      timestamp: Date.now(),
    });

    // Best-effort balance refresh; a failure must not block the success UX.
    refreshBalance.mutate(
      {
        accountIndex: 0,
        type: 'token',
        network: config.network,
        assetId: config.id,
      },
      { onError: () => {} },
    );

    // TODO (step 10): report the broadcast to POST /api/transactions
    // (Idempotency-Key = txHash, best-effort). A failed report never blocks or
    // undoes the on-chain send.

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
            <Text style={styles.rowValue}>{config.network}</Text>
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
        {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            request.loading && styles.confirmButtonBusy,
          ]}
          onLongPress={verifyTransaction}
          delayLongPress={600}
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
