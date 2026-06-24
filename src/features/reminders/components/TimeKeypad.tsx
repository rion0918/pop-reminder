import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../../../shared/constants/colors';

type TimeKeypadProps = {
  time: string;
  onDigitPress: (digit: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
};

const rows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['delete', '0', 'ok'],
];

export function TimeKeypad({ time, onDigitPress, onDelete, onConfirm }: TimeKeypadProps) {
  return (
    <View>
      <View style={styles.display}>
        <Text style={styles.time}>{time}</Text>
      </View>

      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.join('-')} style={styles.row}>
            {row.map((key) => {
              if (key === 'delete') {
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    onPress={onDelete}
                    style={({ pressed }) => [
                      styles.key,
                      styles.deleteKey,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={styles.deleteText}>削除</Text>
                  </Pressable>
                );
              }

              if (key === 'ok') {
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    onPress={onConfirm}
                    style={({ pressed }) => [styles.key, styles.okKey, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.okText}>OK</Text>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => onDigitPress(key)}
                  style={({ pressed }) => [styles.key, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  display: {
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.cloud,
    borderWidth: 1,
    borderColor: 'rgba(220,233,247,0.9)',
    marginTop: 14,
  },
  time: {
    color: palette.ink,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: 0,
  },
  grid: {
    gap: 8,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: 'rgba(220,233,247,0.72)',
  },
  deleteKey: {
    backgroundColor: '#F4F9FE',
  },
  okKey: {
    backgroundColor: 'rgba(116,189,246,0.16)',
    borderColor: 'rgba(116,189,246,0.38)',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ translateY: 1 }],
  },
  keyText: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  deleteText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  okText: {
    color: palette.skyDeep,
    fontSize: 15,
    fontWeight: '900',
  },
});
