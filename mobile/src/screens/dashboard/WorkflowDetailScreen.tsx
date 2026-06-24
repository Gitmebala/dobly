import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { useAppStore } from '../../store/app';
import { runWorkflow } from '../../api/supabase';

export default function WorkflowDetailScreen({ route }: { route: { params: { id: string } } }) {
  const { id } = route.params;
  const { workflows, runs } = useAppStore();

  const workflow = workflows.find((item) => item.id === id);

  const relatedRuns = useMemo(() => runs.filter((item) => item.workflow_id === id).slice(0, 6), [id, runs]);

  const handleRun = async () => {
    try {
      await runWorkflow(id);
      Alert.alert('System started', 'Dobly has triggered this system again.');
    } catch (error: any) {
      Alert.alert('Could not run system', error.message || 'Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="flash" size={26} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{workflow?.title || 'System detail'}</Text>
        <Text style={styles.subtitle}>
          {workflow?.description ||
            'This system exists to keep a recurring operational responsibility running without needing you in the loop each time.'}
        </Text>
      </View>

      <TouchableOpacity style={styles.runButton} onPress={handleRun}>
        <Ionicons name="play" size={18} color={COLORS.text} />
        <Text style={styles.runText}>Run now</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operating model</Text>
        {[
          'Owner sets the standard once.',
          'Dobly decides what can run deterministically and where judgment is needed.',
          'Only exceptions and high-stakes moments surface back up to the owner.',
        ].map((item) => (
          <View key={item} style={styles.lineItem}>
            <View style={styles.dot} />
            <Text style={styles.lineText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        {relatedRuns.length ? (
          relatedRuns.map((run) => (
            <View key={run.id} style={styles.runItem}>
              <Text style={styles.runStatus}>{run.status}</Text>
              <Text style={styles.runMeta}>{new Date(run.started_at).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <View style={styles.runItem}>
            <Text style={styles.runStatus}>ready</Text>
            <Text style={styles.runMeta}>No recent runs yet.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 110 },
  header: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    color: COLORS.text,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 23,
  },
  runButton: {
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  runText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: 12,
  },
  lineItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  dot: {
    marginTop: 6,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
  },
  lineText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 22,
  },
  runItem: {
    borderRadius: BORDER_RADIUS.lg,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  runStatus: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  runMeta: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
});
