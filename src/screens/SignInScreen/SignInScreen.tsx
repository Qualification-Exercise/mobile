import { useEffect, useRef } from 'react';
import { reaction } from 'mobx';
import { ScreenContainer } from '@shared/ui';
import { useStore } from '@shared/store';
import { SsoSignIn } from '@features/sso-sign-in';

type SignInScreenProps = {
  onContinue: () => void;
  onRestore: () => void;
  onOpenWallet?: () => void;
  openWalletLoading?: boolean;
  openWalletError?: string;
};

export function SignInScreen({
  onContinue,
  onRestore,
  onOpenWallet,
  openWalletLoading,
  openWalletError,
}: SignInScreenProps) {
  const { authStore } = useStore();
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    const dispose = reaction(
      () => authStore.isAuthenticated,
      isAuthenticated => {
        if (isAuthenticated) {
          onContinueRef.current();
        }
      },
    );
    return dispose;
  }, [authStore]);

  return (
    <ScreenContainer>
      <SsoSignIn
        onRestore={onRestore}
        onOpenWallet={onOpenWallet}
        openWalletLoading={openWalletLoading}
        openWalletError={openWalletError}
      />
    </ScreenContainer>
  );
}
