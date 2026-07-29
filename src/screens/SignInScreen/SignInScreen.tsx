import { ScreenContainer } from '@shared/ui';
import { SsoSignIn } from '@features/sso-sign-in';

type SignInScreenProps = {
  onContinue: () => void;
  onRestore: () => void;
};

export function SignInScreen({ onContinue, onRestore }: SignInScreenProps) {
  return (
    <ScreenContainer>
      <SsoSignIn onContinue={onContinue} onRestore={onRestore} />
    </ScreenContainer>
  );
}
