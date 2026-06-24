import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS } from '../theme';

export default function LogoMark({
  size = 48,
  topFill = 1,
  style,
}: {
  size?: number;
  topFill?: number;
  style?: ViewStyle;
}) {
  const fillWidth = Math.max(0, Math.min(1, topFill)) * (size * 0.625);

  return (
    <View style={[styles.frame, { width: size, height: size }, style]}>
      <View style={[styles.barTrack, { top: size * 0.12, left: size * 0.08, width: size * 0.625, height: size * 0.2 }]} />
      <View
        style={[
          styles.barFill,
          { top: size * 0.12, left: size * 0.08, width: fillWidth, height: size * 0.2 },
        ]}
      />
      <View style={[styles.barMid, { top: size * 0.4, left: size * 0.18, width: size * 0.625, height: size * 0.2 }]} />
      <View style={[styles.barBase, { top: size * 0.68, left: size * 0.29, width: size * 0.585, height: size * 0.17 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
  },
  barTrack: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  barFill: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  barMid: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  barBase: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
});
