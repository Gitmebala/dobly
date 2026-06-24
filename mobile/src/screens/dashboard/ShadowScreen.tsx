import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { getSupabase } from '../../api/supabase';
import DrawerNavigation from '../../components/DrawerNavigation';
import VoiceButton from '../../components/VoiceButton';

export default function ShadowScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { coworkerId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [shadowRuns, setShadowRuns] = useState<any[]>([]);
  const [coworker, setCoworker] = useState<any>(null);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [feedback, setFeedback] = useState('');

  const fetchShadowRuns = async () => {
    const supabase = getSupabase();
    
    const [shadowRunsResult, coworkerResult] = await Promise.all([
      supabase
        .from('shadow_mode_runs')
        .select('*')
        .eq('coworker_id', coworkerId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('coworkers')
        .select('*')
        .eq('id', coworkerId)
        .single(),
    ]);

    if (shadowRunsResult.error) {
      console.error('Shadow runs fetch error:', shadowRunsResult.error);
    }
    if (coworkerResult.error) {
      console.error('Coworker fetch error:', coworkerResult.error);
    }

    setShadowRuns(shadowRunsResult.data || []);
    setCoworker(coworkerResult.data);
  };

  useEffect(() => {
    fetchShadowRuns();
  }, [coworkerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchShadowRuns();
    } finally {
      setRefreshing(false);
    }
  };

  const submitFeedback = async () => {
    if (!selectedRun || !feedback.trim()) {
      Alert.alert('Error', 'Please select a run and provide feedback');
      return;
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('shadow_mode_runs')
      .update({
        owner_feedback: feedback,
        owner_approval: feedback.toLowerCase().includes('approve') ? 'approved' : 'rejected',
        learning_signal_extracted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedRun.id);

    if (error) {
      Alert.alert('Error', 'Failed to submit feedback');
      console.error(error);
    } else {
      Alert.alert('Success', 'Feedback submitted');
      setFeedback('');
      setSelectedRun(null);
      await fetchShadowRuns();
    }
  };

  const getReadinessColor = (readiness: string) => {
    const colors: Record<string, string> = {
      ready: COLORS.success,
      needs_review: COLORS.warning,
      not_ready: COLORS.error,
      learning: COLORS.primary,
    };
    return colors[readiness] || COLORS.textMuted;
  };

  const getReadinessLabel = (readiness: string) => {
    const labels: Record<string, string> = {
      ready: 'Ready for live',
      needs_review: 'Needs review',
      not_ready: 'Not ready',
      learning: 'Learning',
    };
    return labels[readiness] || readiness;
  };

  if (!coworker) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Coworker not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Shadow Mode</Text>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
      <View style={styles.header}>
        <Text style={styles.kicker}>Shadow mode</Text>
        <Text style={styles.title}>{coworker.name}</Text>
        <Text style={styles.subtitle}>Review coworker proposals before they execute</Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Shadow mode lets your coworker propose actions without executing them. Review and approve to build trust.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shadow runs</Text>
          <Text style={styles.countText}>{shadowRuns.length}</Text>
        </View>
        
        {shadowRuns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="eye" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No shadow runs yet</Text>
            <Text style={styles.emptySub}>Shadow mode proposals will appear here</Text>
          </View>
        ) : (
          shadowRuns.slice(0, 10).map((run) => (
            <TouchableOpacity
              key={run.id}
              style={[
                styles.runCard,
                selectedRun?.id === run.id && styles.runCardSelected,
              ]}
              onPress={() => setSelectedRun(run)}
            >
              <View style={styles.runHead}>
                <View style={[styles.readinessBadge, { backgroundColor: getReadinessColor(run.execution_readiness) + '20' }]}>
                  <Text style={[styles.readinessText, { color: getReadinessColor(run.execution_readiness) }]}>
                    {getReadinessLabel(run.execution_readiness)}
                  </Text>
                </View>
                <Text style={styles.runDate}>{new Date(run.created_at).toLocaleString()}</Text>
              </View>
              
              <Text style={styles.runTitle}>{run.event_type || 'Event'}</Text>
              
              {run.proposed_action && (
                <View style={styles.proposedSection}>
                  <Text style={styles.proposedLabel}>Proposed action:</Text>
                  <Text style={styles.proposedText}>{run.proposed_action}</Text>
                </View>
              )}

              {run.context_snapshot && (
                <View style={styles.contextSection}>
                  <Text style={styles.contextLabel}>Context:</Text>
                  <Text style={styles.contextText}>
                    {typeof run.context_snapshot === 'string' 
                      ? run.context_snapshot 
                      : JSON.stringify(run.context_snapshot).substring(0, 200)}
                  </Text>
                </View>
              )}

              {run.owner_feedback && (
                <View style={styles.feedbackSection}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.feedbackText}>Feedback provided</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {selectedRun && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provide feedback</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Describe your feedback on this proposal..."
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
            placeholderTextColor={COLORS.textMuted}
          />
          <TouchableOpacity style={styles.submitButton} onPress={submitFeedback}>
            <Ionicons name="send" size={18} color={COLORS.text} />
            <Text style={styles.submitButtonText}>Submit feedback</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shadow mode stats</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Total runs"
            value={shadowRuns.length}
            icon="list"
          />
          <StatCard
            label="Approved"
            value={shadowRuns.filter(r => r.owner_approval === 'approved').length}
            icon="checkmark"
          />
          <StatCard
            label="Rejected"
            value={shadowRuns.filter(r => r.owner_approval === 'rejected').length}
            icon="close"
          />
          <StatCard
            label="Learning signals"
            value={shadowRuns.filter(r => r.learning_signal_extracted).length}
            icon="bulb"
          />
        </View>
      </View>
      </ScrollView>

      <VoiceButton />
      <DrawerNavigation visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={20} color={COLORS.textSecondary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 58 : 34,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    marginLeft: 12,
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 110 },
  header: { marginBottom: 24 },
  kicker: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.3,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  countText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  emptySub: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
  },
  runCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  runCardSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: COLORS.primary,
  },
  runHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readinessBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readinessText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  runDate: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
  },
  runTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    marginBottom: 8,
  },
  proposedSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  proposedLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  proposedText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  contextSection: {
    marginTop: 8,
  },
  contextLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  contextText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  feedbackSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  feedbackText: {
    color: COLORS.success,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  feedbackInput: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    marginTop: 12,
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statValue: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    marginTop: 40,
  },
});
