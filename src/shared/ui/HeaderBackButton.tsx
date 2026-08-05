import { StyleSheet, TouchableOpacity } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from './tokens';

type HeaderBackButtonProps = {
  onPress: () => void;
};

export function HeaderBackButton({ onPress }: HeaderBackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.button}
    >
      <AppIcon name="chevron-back" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 24,
    alignItems: 'flex-start',
  },
});
