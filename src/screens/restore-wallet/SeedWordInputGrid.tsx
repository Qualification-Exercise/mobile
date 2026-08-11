import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing } from '@shared/ui';

type SeedWordInputGridProps = {
  words: string[];
  onChangeWord: (index: number, value: string) => void;
};

export function SeedWordInputGrid({
  words,
  onChangeWord,
}: SeedWordInputGridProps) {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  function handleChangeText(index: number, text: string) {
    if (text.includes(' ')) {
      const [word = ''] = text.trim().split(/\s+/);
      onChangeWord(index, word);
      inputRefs.current[index + 1]?.focus();
      return;
    }
    onChangeWord(index, text);
  }

  return (
    <View style={styles.grid}>
      {words.map((word, index) => (
        <View
          key={index}
          style={[styles.cell, focusedIndex === index && styles.cellFocused]}
        >
          <Text style={styles.index}>{index + 1}</Text>
          <TextInput
            ref={ref => {
              inputRefs.current[index] = ref;
            }}
            style={styles.input}
            value={word}
            onChangeText={text => handleChangeText(index, text)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() =>
              setFocusedIndex(current => (current === index ? null : current))
            }
            onSubmitEditing={() => inputRefs.current[index + 1]?.focus()}
            returnKeyType={index === words.length - 1 ? 'done' : 'next'}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.textTertiary}
          />
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
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  cellFocused: {
    borderColor: colors.accentBright,
  },
  index: {
    fontSize: 12,
    color: colors.textTertiary,
    width: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 11,
  },
});
