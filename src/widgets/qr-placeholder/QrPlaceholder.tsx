import { StyleSheet, View } from 'react-native';
import { radii } from '@shared/ui';

const GRID_SIZE = 21;

function isFinderModule(row: number, col: number): boolean | null {
  const check = (baseRow: number, baseCol: number) => {
    const r = row - baseRow;
    const c = col - baseCol;
    if (r < 0 || c < 0 || r > 6 || c > 6) {
      return null;
    }
    const edge = r === 0 || r === 6 || c === 0 || c === 6;
    const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
    return edge || inner;
  };
  return check(0, 0) ?? check(0, GRID_SIZE - 7) ?? check(GRID_SIZE - 7, 0);
}

function buildQrModules(): boolean[] {
  const modules: boolean[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const finder = isFinderModule(row, col);
      const on =
        finder !== null
          ? finder
          : (row * 7 + col * 13 + ((row * col) % 5)) % 3 === 0;
      modules.push(on);
    }
  }
  return modules;
}

const QR_MODULES = buildQrModules();

type QrPlaceholderProps = {
  size?: number;
};

export function QrPlaceholder({ size = 236 }: QrPlaceholderProps) {
  const padding = 16;
  const cellSize = (size - padding * 2) / GRID_SIZE;

  return (
    <View style={[styles.container, { width: size, height: size, padding }]}>
      <View style={styles.grid}>
        {QR_MODULES.map((on, index) => (
          <View
            key={index}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: on ? '#0B0E11' : 'transparent',
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
