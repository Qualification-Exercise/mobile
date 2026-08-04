import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import type { Request } from '@shared/store';
import { colors, spacing } from './tokens';

export const RequestState = observer(function RequestState({
  request,
  children,
}: PropsWithChildren<{ request: Request<unknown[]> }>) {
  const [isReady, setIsReady] = useState(false);
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dispose = reaction(
      () => ({ loading: request.loading, error: request.error }),
      ({ loading }) => {
        if (loading) {
          setIsReady(false);
          if (timerId.current) {
            clearTimeout(timerId.current);
          }
          // artificial delay for smooth ui
          timerId.current = setTimeout(() => {
            setIsReady(true);
          }, 500);
        }
      },
      {
        fireImmediately: true,
      },
    );

    return () => {
      dispose();
      if (timerId.current) {
        clearTimeout(timerId.current);
      }
    };
  }, [request]);

  if (request.loading || !isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>
          {request.loadingMessage || 'Loading'}
        </Text>
      </View>
    );
  }

  if (request.error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {request.error}</Text>
      </View>
    );
  }

  return children;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textTertiary,
  },
  errorText: {
    fontSize: 16,
    color: colors.negative,
    textAlign: 'center',
  },
});
