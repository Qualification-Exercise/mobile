import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { parsePaymentRequest } from '@shared/lib';
import {
  HeaderCloseButton,
  PrimaryButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
} from '@shared/ui';

// The asset a bare address is assumed to be for: the wallet's primary payment
// token. A QR that names its own token or chain overrides this.
const DEFAULT_ASSET_ID = 'usdt-arbitrum';

export function ScanToPayScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);

  // The camera keeps firing while the navigation animation runs, so the first
  // accepted code latches this and every later frame is ignored.
  const handled = useRef(false);

  const handleScan = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (handled.current) {
        return;
      }

      const request = parsePaymentRequest(data, DEFAULT_ASSET_ID);
      if (!request) {
        setError('That QR is not a payment this wallet can pay.');
        return;
      }

      handled.current = true;
      setError(null);

      // With an amount the QR is a complete payment request and goes straight
      // to the signing sheet; without one the user still has to enter it.
      if (request.amountBaseUnits) {
        navigation.replace('ApproveTransaction', {
          assetId: request.assetId,
          amountBaseUnits: request.amountBaseUnits,
          destination: request.destination,
        });
      } else {
        navigation.replace('Send', {
          assetId: request.assetId,
          destination: request.destination,
        });
      }
    },
    [navigation],
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <HeaderCloseButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Scan to pay</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.viewfinderWrapper}>
          {permission?.granted ? (
            <>
              <Text style={styles.hint}>
                Point at a merchant&apos;s payment QR
              </Text>
              <View style={styles.viewfinder}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleScan}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          ) : (
            <View style={styles.permission}>
              <Text style={styles.hint}>
                {permission?.canAskAgain === false
                  ? 'Camera access is off for this app. Enable it in Settings to scan payment QR codes.'
                  : 'Scanning a payment QR needs access to the camera.'}
              </Text>
              <PrimaryButton
                title="Allow camera"
                onPress={() => {
                  requestPermission().catch(() => {});
                }}
                disabled={permission?.canAskAgain === false}
              />
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  viewfinderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  hint: {
    color: colors.textPrimary,
    fontSize: 13.5,
    textAlign: 'center',
  },
  viewfinder: {
    width: 260,
    height: 260,
    borderWidth: 4,
    borderColor: colors.accentBright,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  permission: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  error: {
    fontSize: 13,
    color: colors.negative,
    textAlign: 'center',
  },
});
