import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import qrcode from 'qrcode-generator';
import { radii } from './tokens';

const ERROR_CORRECTION = 'M';
const AUTO_TYPE_NUMBER = 0;

type QrCodeProps = {
  value: string;
  size?: number;
};

type Run = { start: number; length: number };

function darkRuns(
  isDark: (row: number, col: number) => boolean,
  count: number,
) {
  const rows: Run[][] = [];
  for (let row = 0; row < count; row++) {
    const runs: Run[] = [];
    let start = -1;
    for (let col = 0; col <= count; col++) {
      const dark = col < count && isDark(row, col);
      if (dark && start === -1) {
        start = col;
      } else if (!dark && start !== -1) {
        runs.push({ start, length: col - start });
        start = -1;
      }
    }
    rows.push(runs);
  }
  return rows;
}

export function QrCode({ value, size = 236 }: QrCodeProps) {
  const { rows, moduleCount } = useMemo(() => {
    const qr = qrcode(AUTO_TYPE_NUMBER, ERROR_CORRECTION);
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    return {
      rows: darkRuns((row, col) => qr.isDark(row, col), count),
      moduleCount: count,
    };
  }, [value]);

  const padding = 16;
  const module = Math.floor((size - padding * 2) / moduleCount);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={{ width: module * moduleCount }}>
        {rows.map((runs, row) => (
          <View key={row} style={{ height: module }}>
            {runs.map(run => (
              <View
                key={run.start}
                style={[
                  styles.module,
                  {
                    left: run.start * module,
                    width: run.length * module,
                    height: module,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  module: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#0B0E11',
  },
});
