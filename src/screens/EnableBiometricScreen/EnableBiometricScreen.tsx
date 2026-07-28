import { ScreenContainer } from '@shared/ui';
import { EnableBiometric } from '@features/enable-biometric';

type EnableBiometricScreenProps = {
  onContinue: () => void;
};

export function EnableBiometricScreen({
  onContinue,
}: EnableBiometricScreenProps) {
  return (
    <ScreenContainer>
      <EnableBiometric onContinue={onContinue} />
    </ScreenContainer>
  );
}
