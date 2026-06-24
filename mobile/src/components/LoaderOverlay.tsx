import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../theme';
import LogoMark from './LogoMark';

export default function LoaderOverlay({
  progress,
  label = 'Preparing your operating system',
}: {
  progress: number;
  label?: string;
}) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <LogoMark size={56} topFill={progress} />
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.title}>Dobly</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: 'rgba(18,18,16,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(28,28,26,0.96)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(196,80,26,0.18)',
    overflow: 'hidden',
    marginTop: 22,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  title: {
    marginTop: 16,
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  label: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
