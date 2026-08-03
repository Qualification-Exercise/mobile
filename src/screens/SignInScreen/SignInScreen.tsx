import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { reaction } from 'mobx';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { ScreenContainer } from '@shared/ui';
import { useStore } from '@shared/store';
import { SsoSignIn } from '@features/sso-sign-in';

export function SignInScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { authStore } = useStore();

  useEffect(() => {
    const dispose = reaction(
      () => authStore.isAuthenticated,
      isAuthenticated => {
        if (isAuthenticated) {
          navigation.navigate('RecoveryPhrase');
        }
      },
    );
    return dispose;
  }, [authStore, navigation]);

  return (
    <ScreenContainer>
      <SsoSignIn onRestore={() => navigation.navigate('RestoreWallet')} />
    </ScreenContainer>
  );
}
