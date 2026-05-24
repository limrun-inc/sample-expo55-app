import { Canvas, Circle, Group, LinearGradient, useClock, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

const SIZE = 120;
const RADIUS = 50;
const CENTER = SIZE / 2;

export function SkiaDemo() {
  const theme = useTheme();
  const clock = useClock();

  const innerRadius = useDerivedValue(() => RADIUS - 28 + 5 * Math.sin(clock.value / 700));

  const transform = useDerivedValue(() => [{ rotate: (clock.value / 5000) * 2 * Math.PI }]);

  return (
    <Canvas style={styles.canvas}>
      <Group origin={vec(CENTER, CENTER)} transform={transform}>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS}>
          <LinearGradient start={vec(0, 0)} end={vec(SIZE, SIZE)} colors={['#3C9FFE', '#0274DF']} />
        </Circle>
      </Group>
      <Circle cx={CENTER} cy={CENTER} r={RADIUS - 12} color={theme.backgroundElement} />
      <Circle cx={CENTER} cy={CENTER} r={innerRadius} color="#0274DF" />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: SIZE,
    height: SIZE,
  },
});
