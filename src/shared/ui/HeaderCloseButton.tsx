import { StyleSheet, TouchableOpacity } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from './tokens';

type HeaderCloseButtonProps = {
  onPress: () => void;
};

export function HeaderCloseButton({ onPress }: HeaderCloseButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.button}
    >
      <AppIcon name="close" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 24,
    alignItems: 'flex-start',
  },
});
