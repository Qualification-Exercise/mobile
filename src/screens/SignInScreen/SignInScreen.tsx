import { useEffect, useRef } from 'react';
import { reaction } from 'mobx';
import { ScreenContainer } from '@shared/ui';
import { useStore } from '@shared/store';
import { SsoSignIn } from '@features/sso-sign-in';

type SignInScreenProps = {
  onContinue: () => void;
  onRestore: () => void;
};

export function SignInScreen({ onContinue, onRestore }: SignInScreenProps) {
  const { authStore } = useStore();
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  // Navigation is a reactive consequence of a successful Google sign-in,
  // not something the button press triggers directly.
  useEffect(() => {
    const dispose = reaction(
      () => authStore.status,
      status => {
        if (status === 'success') {
          onContinueRef.current();
        }
      },
    );
    return dispose;
  }, [authStore]);

  return (
    <ScreenContainer>
      <SsoSignIn onContinue={onContinue} onRestore={onRestore} />
    </ScreenContainer>
  );
}
