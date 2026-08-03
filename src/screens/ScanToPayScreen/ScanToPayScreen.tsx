import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { ScreenContainer } from '@shared/ui';
import { ScanToPay } from '@features/scan-to-pay';

export function ScanToPayScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <ScreenContainer>
      <ScanToPay
        onClose={() => navigation.goBack()}
        onPaid={() => navigation.navigate('PaymentSuccess')}
      />
    </ScreenContainer>
  );
}
