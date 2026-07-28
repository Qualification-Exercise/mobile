import { ScreenContainer } from '@shared/ui';
import { SsoSignIn } from '@features/sso-sign-in';

type SignInScreenProps = {
  onContinue: () => void;
};

export function SignInScreen({ onContinue }: SignInScreenProps) {
  return (
    <ScreenContainer>
      <SsoSignIn onContinue={onContinue} />
    </ScreenContainer>
  );
}
