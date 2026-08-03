import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { ScreenContainer } from '@shared/ui';
import { EnableBiometric } from '@features/enable-biometric';

export function EnableBiometricScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <ScreenContainer>
      <EnableBiometric
        // TODO: Decide where to navigate depends on seed phrase
        onContinue={() =>
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
        }
      />
    </ScreenContainer>
  );
}
