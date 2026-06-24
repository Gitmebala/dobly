import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';

export default function HealthScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Business Health</Text>
        <Text style={styles.subtitle}>Operational metrics</Text>
      </View>
      
      <View style={styles.healthScore}>
        <Text style={styles.scoreLabel}>Overall Score</Text>
        <Text style={styles.scoreValue}>92</Text>
        <View style={styles.trendBadge}>
          <Ionicons name="trending-up" size={16} color={COLORS.success} />
          <Text style={styles.trendText}>Improving</Text>
        </View>
      </View>
      
      <View style={styles.grid}>
        <View style={styles.metricCard}>
          <Ionicons name="pulse" size={24} color={COLORS.success} />
          <Text style={styles.metricValue}>94%</Text>
          <Text style={styles.metricLabel}>Uptime</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="flash" size={24} color={COLORS.primary} />
          <Text style={styles.metricValue}>127</Text>
          <Text style={styles.metricLabel}>Tasks this week</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          <Text style={styles.metricValue}>121</Text>
          <Text style={styles.metricLabel}>Success rate</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="time" size={24} color={COLORS.warning} />
          <Text style={styles.metricValue}>2.3s</Text>
          <Text style={styles.metricLabel}>Avg response</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: FONT_SIZES['3xl'], fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, marginTop: SPACING.xs },
  healthScore: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.xl },
  scoreLabel: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary },
  scoreValue: { fontSize: 72, fontWeight: '800', color: COLORS.text, marginVertical: SPACING.md },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success + '20', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full, gap: SPACING.xs },
  trendText: { color: COLORS.success, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACING.xs },
  metricCard: { width: '46%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, margin: SPACING.xs, alignItems: 'center' },
  metricValue: { fontSize: FONT_SIZES['2xl'], fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm },
  metricLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
});