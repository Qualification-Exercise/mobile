import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { ScreenContainer } from '@shared/ui';
import { RevealRecoveryPhrase } from '@features/reveal-recovery-phrase';

export function RecoveryPhraseScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <ScreenContainer>
      <RevealRecoveryPhrase
        onConfirm={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: 'BiometricUnlock', params: { autoPrompt: true } }],
          })
        }
      />
    </ScreenContainer>
  );
}
