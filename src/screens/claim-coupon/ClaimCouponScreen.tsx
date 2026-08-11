import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import type { ClaimDTO } from '@shared/api';
import { getAssetConfig, getNetworkLabel } from '@shared/config';
import { useClaimCoupon } from '@shared/lib/hooks/wallet';
import { getCouponAmount } from '@shared/store/models/coupon';
import { useStore } from '@shared/store';
import {
  ScreenContainer,
  HeaderBackButton,
  PrimaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';

// Where the UTL is minted. Shown before signing so the user can see which
// contract, on which chain, will pay them out — the payout is on a testnet
// while the payments that earned it are on mainnet.
const UTL_ASSET = getAssetConfig('utl-ethereum');
const UTL_CONTRACT = UTL_ASSET?.address ?? '';
const UTL_NETWORK_LABEL = UTL_ASSET ? getNetworkLabel(UTL_ASSET.network) : '';

function shortenContract(address: string): string {
  return address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

// The status the backend reports right after accepting a claim, in the words
// the claim screen uses.
const STATUS_MESSAGES: Record<string, string> = {
  PENDING_ATTESTATION: 'Claim submitted — verifying your payment.',
  ATTESTED: 'Verified. Sending your UTL.',
  CLAIM_SUBMITTED: 'Payout transaction sent.',
  CLAIMED: 'Claimed. The UTL is in your wallet.',
};

export const ClaimCouponScreen = observer(function ClaimCouponScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClaimCoupon'>>();

  const { walletStore } = useStore();
  const { claim } = useClaimCoupon();

  const [code, setCode] = useState(params?.couponCode ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimDTO | null>(null);

  // Match against the loaded coupons so the amount can be shown before
  // claiming. An unmatched code is still submittable: the backend is the
  // authority on whether it is claimable.
  const normalized = code.trim().toUpperCase();
  const coupon = walletStore.coupons.find(c => c.code === normalized);
  const canClaim = normalized !== '' && !busy && !result;

  async function handleClaim() {
    setBusy(true);
    setError(null);
    try {
      const claimed = await claim(normalized);
      setResult(claimed);
      // The claimed coupon has left `ISSUED`, so the rewards list is stale.
      walletStore.loadCoupons();
    } catch (thrown) {
      setError(
        thrown instanceof Error
          ? thrown.message
          : 'Could not claim this coupon.',
      );
    } finally {
      setBusy(false);
    }
  }

  let buttonTitle = 'Claim UTL';
  if (busy) {
    buttonTitle = 'Signing…';
  } else if (result) {
    buttonTitle = 'Done';
  } else if (coupon) {
    buttonTitle = `Claim ${getCouponAmount(coupon)} UTL`;
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Claim UTL</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.container}>
        <Text style={styles.description}>
          Redeem your cashback coupon for UTL, sent straight to your wallet.
          You&apos;ll sign a message proving the payout address is yours — it
          moves no funds.
        </Text>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={value => setCode(value.toUpperCase())}
          placeholder="COUPON CODE"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy && !result}
        />
        <View style={styles.detailCard}>
          <View style={[styles.detailRow, styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>You&apos;ll receive</Text>
            <Text style={styles.detailValueStrong}>
              {coupon ? getCouponAmount(coupon) : '—'} UTL
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contract</Text>
            <Text style={styles.detailValueMono}>
              {shortenContract(UTL_CONTRACT)} · {UTL_NETWORK_LABEL}
            </Text>
          </View>
        </View>
        {result ? (
          <Text style={styles.status}>
            {STATUS_MESSAGES[result.status] ?? result.status}
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.spacer} />
        <PrimaryButton
          title={buttonTitle}
          onPress={result ? () => navigation.goBack() : handleClaim}
          disabled={!canClaim && !result}
        />
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
  description: {
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  codeInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
    fontFamily: 'Menlo',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailLabel: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  detailValueStrong: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailValueMono: {
    fontFamily: 'Menlo',
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  status: {
    fontSize: 13,
    color: colors.positive,
    marginTop: spacing.lg,
  },
  error: {
    fontSize: 13,
    color: colors.negative,
    marginTop: spacing.lg,
  },
  spacer: {
    flex: 1,
  },
});
