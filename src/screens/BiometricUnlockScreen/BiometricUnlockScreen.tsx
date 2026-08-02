import { ScreenContainer } from '@shared/ui';
import { UnlockBiometric } from '@features/unlock-biometric';

type BiometricUnlockScreenProps = {
  onUnlocked: () => void;
};

export function BiometricUnlockScreen({
  onUnlocked,
}: BiometricUnlockScreenProps) {
  return (
    <ScreenContainer>
      <UnlockBiometric onUnlocked={onUnlocked} />
    </ScreenContainer>
  );
}
