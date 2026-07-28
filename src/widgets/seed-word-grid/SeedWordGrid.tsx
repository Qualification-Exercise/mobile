import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@shared/ui';

type SeedWordGridProps = {
  words: string[];
};

export function SeedWordGrid({ words }: SeedWordGridProps) {
  return (
    <View style={styles.grid}>
      {words.map((word, index) => (
        <View key={`${index}-${word}`} style={styles.cell}>
          <Text style={styles.index}>{index + 1}</Text>
          <Text style={styles.word}>{word}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  index: {
    fontSize: 12,
    color: colors.textTertiary,
    width: 16,
  },
  word: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
