import { ScreenContainer } from '@shared/ui';
import { RevealRecoveryPhrase } from '@features/reveal-recovery-phrase';

type RecoveryPhraseScreenProps = {
  onConfirm: () => void;
};

export function RecoveryPhraseScreen({ onConfirm }: RecoveryPhraseScreenProps) {
  return (
    <ScreenContainer>
      <RevealRecoveryPhrase onConfirm={onConfirm} />
    </ScreenContainer>
  );
}
