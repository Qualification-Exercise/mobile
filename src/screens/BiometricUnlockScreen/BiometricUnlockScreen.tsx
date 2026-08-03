import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { ScreenContainer } from '@shared/ui';
import { UnlockBiometric } from '@features/unlock-biometric';

export function BiometricUnlockScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <ScreenContainer>
      <UnlockBiometric
        // TODO: Decide where to navigate depends on seed phrase
        onUnlocked={() =>
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
        }
      />
    </ScreenContainer>
  );
}
