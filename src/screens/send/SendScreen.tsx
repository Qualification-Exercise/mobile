import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import { getAssetConfig, getFeeToken } from '@shared/config';
import { fromBaseUnits, isValidAddress, toBaseUnits } from '@shared/lib';
import { useAssetBalances, useAssetTransfer } from '@shared/lib/hooks/wallet';
import {
  ScreenContainer,
  HeaderBackButton,
  PrimaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { AmountEntry } from './AmountEntry';

// The registry config type is inferred from `getAssetConfig`; `NonNullable`
// drops the `undefined` returned for unknown asset ids.
type AssetConfig = NonNullable<ReturnType<typeof getAssetConfig>>;

// Keep only digits and a single decimal point so the amount is always a
// parseable human-readable number.
function sanitizeAmount(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) {
    return cleaned;
  }
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, '')
  );
}

// Debounced live state of a network-fee estimate.
type FeeState = {
  loading: boolean;
  text: string | null;
  error: string | null;
};

const FEE_DEBOUNCE_MS = 400;

export const SendScreen = observer(function SendScreenView() {
  const { assetId } = useRoute<RouteProp<RootStackParamList, 'Send'>>().params;
  const config = getAssetConfig(assetId);

  if (!config) {
    // The asset id is not in the registry yet (e.g. a legacy id from a screen
    // not migrated to the registry). Render a graceful fallback instead of
    // driving transfer hooks with an unknown asset.
    return <UnsupportedAsset />;
  }

  return <SendForm config={config} />;
});

const SendForm = observer(function SendFormView({
  config,
}: {
  config: AssetConfig;
}) {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { balances } = useAssetBalances();
  const { estimateFee, isReady } = useAssetTransfer(config.id);

  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [fee, setFee] = useState<FeeState>({
    loading: false,
    text: null,
    error: null,
  });

  const feeToken = useMemo(() => getFeeToken(config), [config]);
  const balanceBaseUnits = balances.get(config.id);

  // Parse the entered amount into base units once; null when empty/malformed.
  const amountBaseUnits = useMemo(() => {
    if (amount.trim() === '') {
      return null;
    }
    try {
      return toBaseUnits(amount, config.decimals);
    } catch {
      return null;
    }
  }, [amount, config.decimals]);

  const amountPositive =
    amountBaseUnits != null && BigInt(amountBaseUnits) > 0n;
  const withinBalance =
    amountBaseUnits != null &&
    balanceBaseUnits != null &&
    BigInt(amountBaseUnits) <= BigInt(balanceBaseUnits);
  const destinationValid = isValidAddress(config.network, destination);
  const canReview = amountPositive && withinBalance && destinationValid;

  // Live, debounced fee estimate. Only runs once the inputs would make a valid
  // send and the WDK is ready, so the estimate reflects a transfer that could
  // actually be signed and never triggers a not-ready alert.
  useEffect(() => {
    if (!canReview || amountBaseUnits == null || !isReady) {
      setFee({ loading: false, text: null, error: null });
      return;
    }

    let cancelled = false;
    const to = destination.trim();
    setFee({ loading: true, text: null, error: null });

    const handle = setTimeout(async () => {
      try {
        const result = await estimateFee(to, amountBaseUnits);
        if (cancelled) {
          return;
        }
        if (result.success) {
          setFee({
            loading: false,
            text: fromBaseUnits(result.fee, feeToken.decimals),
            error: null,
          });
        } else {
          setFee({
            loading: false,
            text: null,
            error: result.error ?? 'Fee unavailable',
          });
        }
      } catch {
        // WDK not ready / network error — surface a soft failure without
        // crashing the screen. The user has already been alerted where needed.
        if (!cancelled) {
          setFee({ loading: false, text: null, error: 'Fee unavailable' });
        }
      }
    }, FEE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [
    canReview,
    amountBaseUnits,
    destination,
    estimateFee,
    feeToken.decimals,
    isReady,
  ]);

  function handleQuickFill(fraction: number) {
    if (balanceBaseUnits == null) {
      return;
    }
    // Scale the balance in base units with integer math to avoid float
    // precision loss on high-decimal tokens.
    const balance = BigInt(balanceBaseUnits);
    const scaled =
      fraction === 1
        ? balance
        : (balance * BigInt(Math.round(fraction * 100))) / 100n;
    setAmount(fromBaseUnits(scaled.toString(), config.decimals));
  }

  const balanceDisplay = fromBaseUnits(
    balanceBaseUnits ?? '0',
    config.decimals,
  );

  let validationMessage: string | null = null;
  if (amountPositive && balanceBaseUnits != null && !withinBalance) {
    validationMessage = 'Insufficient balance';
  } else if (destination.trim() !== '' && !destinationValid) {
    validationMessage = `Enter a valid ${config.network} address`;
  }

  let feeDisplay = '—';
  if (fee.loading) {
    feeDisplay = 'Estimating…';
  } else if (fee.error) {
    feeDisplay = fee.error;
  } else if (fee.text) {
    feeDisplay = `≈ ${fee.text} ${feeToken.symbol}`;
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Send {config.symbol}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.container}>
        <AmountEntry
          amount={amount}
          onChangeAmount={text => setAmount(sanitizeAmount(text))}
          helperText={`Balance ${balanceDisplay} ${config.symbol}`}
          onQuickFill={handleQuickFill}
        />
        <Text style={styles.label}>To</Text>
        <View style={styles.destinationRow}>
          <TextInput
            style={styles.destinationInput}
            value={destination}
            onChangeText={setDestination}
            placeholder="Destination address"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {validationMessage ? (
          <Text style={styles.validation}>{validationMessage}</Text>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Network</Text>
          <Text style={styles.detailValue}>{config.network}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Network fee</Text>
          <Text style={styles.detailValue}>{feeDisplay}</Text>
        </View>
        <View style={styles.spacer} />
        <PrimaryButton
          title="Review send"
          onPress={() =>
            navigation.navigate('ApproveTransaction', {
              assetId: config.id,
              // `canReview` guarantees a parsed, in-range amount.
              amountBaseUnits: amountBaseUnits as string,
              destination: destination.trim(),
            })
          }
          disabled={!canReview}
        />
      </View>
    </ScreenContainer>
  );
});

const UnsupportedAsset = observer(function UnsupportedAssetView() {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Send</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.centered}>
        <Text style={styles.unsupported}>
          This asset can&apos;t be sent yet.
        </Text>
      </View>
    </ScreenContainer>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsupported: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
  },
  destinationInput: {
    flex: 1,
    fontFamily: 'Menlo',
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  validation: {
    fontSize: 12.5,
    color: colors.negative,
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  detailLabel: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  spacer: {
    flex: 1,
  },
});
