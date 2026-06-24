import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { getSupabase } from '../../api/supabase';
import DrawerNavigation from '../../components/DrawerNavigation';
import VoiceButton from '../../components/VoiceButton';

export default function CoworkerHealthScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { coworkerId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [coworker, setCoworker] = useState<any>(null);

  const fetchHealthData = async () => {
    const supabase = getSupabase();
    
    const [healthResult, coworkerResult] = await Promise.all([
      supabase
        .from('coworker_health')
        .select('*')
        .eq('coworker_id', coworkerId)
        .order('period_end', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('coworkers')
        .select('*')
        .eq('id', coworkerId)
        .single(),
    ]);

    if (healthResult.error && healthResult.error.code !== 'PGRST116') {
      console.error('Health fetch error:', healthResult.error);
    }
    if (coworkerResult.error) {
      console.error('Coworker fetch error:', coworkerResult.error);
    }

    setHealthData(healthResult.data);
    setCoworker(coworkerResult.data);
  };

  useEffect(() => {
    fetchHealthData();
  }, [coworkerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchHealthData();
    } finally {
      setRefreshing(false);
    }
  };

  const getHealthStateColor = (state: string) => {
    const colors: Record<string, string> = {
      learning: COLORS.primary,
      reliable: COLORS.success,
      needs_review: COLORS.warning,
      over_escalating: COLORS.warning,
      under_escalating: COLORS.warning,
      underperforming: COLORS.error,
    };
    return colors[state] || COLORS.textMuted;
  };

  const getHealthStateLabel = (state: string) => {
    const labels: Record<string, string> = {
      learning: 'Learning',
      reliable: 'Reliable',
      needs_review: 'Needs Review',
      over_escalating: 'Over-Escalating',
      under_escalating: 'Under-Escalating',
      underperforming: 'Underperforming',
    };
    return labels[state] || state;
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
        <Text style={styles.topBarTitle}>Health</Text>
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
        <Text style={styles.kicker}>Coworker health</Text>
        <Text style={styles.title}>{coworker.name}</Text>
        <Text style={styles.subtitle}>{coworker.desk.replace('_', ' ')}</Text>
      </View>

      {healthData ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current state</Text>
            <View style={[styles.stateCard, { borderColor: getHealthStateColor(healthData.health_state) }]}>
              <View style={[styles.stateIndicator, { backgroundColor: getHealthStateColor(healthData.health_state) }]} />
              <Text style={styles.stateLabel}>{getHealthStateLabel(healthData.health_state)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance scores</Text>
            <View style={styles.scoresGrid}>
              <ScoreCard
                label="Autonomy"
                value={healthData.autonomy_score}
                icon="person"
              />
              <ScoreCard
                label="Trust"
                value={healthData.trust_score}
                icon="shield-checkmark"
              />
              <ScoreCard
                label="Quality"
                value={healthData.quality_score}
                icon="star"
              />
              <ScoreCard
                label="Value"
                value={healthData.value_score}
                icon="trending-up"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key metrics</Text>
            <View style={styles.metricsList}>
              <MetricRow
                label="Response speed"
                value={`${Math.round(healthData.response_speed)}s`}
                icon="time"
              />
              <MetricRow
                label="Resolution rate"
                value={`${Math.round(healthData.resolution_rate * 100)}%`}
                icon="checkmark-circle"
              />
              <MetricRow
                label="Escalation rate"
                value={`${Math.round(healthData.escalation_rate * 100)}%`}
                icon="arrow-up"
              />
              <MetricRow
                label="Override rate"
                value={`${Math.round(healthData.override_rate * 100)}%`}
                icon="refresh"
              />
              <MetricRow
                label="Conversion rate"
                value={`${Math.round(healthData.conversion_rate * 100)}%`}
                icon="swap-horizontal"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business impact</Text>
            <View style={styles.impactGrid}>
              <ImpactCard
                label="Revenue captured"
                value={healthData.revenue_captured}
                icon="cash"
                color={COLORS.success}
              />
              <ImpactCard
                label="Revenue recovered"
                value={healthData.revenue_recovered}
                icon="card"
                color={COLORS.primary}
              />
              <ImpactCard
                label="Time saved"
                value={`${healthData.time_saved_hours}h`}
                icon="hourglass"
                color={COLORS.warning}
              />
            </View>
          </View>

          {healthData.recent_mistakes && healthData.recent_mistakes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent issues</Text>
              {healthData.recent_mistakes.map((mistake: any, index: number) => (
                <View key={index} style={styles.issueItem}>
                  <Ionicons name="warning" size={18} color={COLORS.error} />
                  <Text style={styles.issueText}>{mistake.description || mistake.type}</Text>
                </View>
              ))}
            </View>
          )}

          {healthData.top_improvements && healthData.top_improvements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top improvements</Text>
              {healthData.top_improvements.map((improvement: any, index: number) => (
                <View key={index} style={styles.improvementItem}>
                  <Ionicons name="trending-up" size={18} color={COLORS.success} />
                  <Text style={styles.improvementText}>{improvement.description || improvement.type}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Period</Text>
            <Text style={styles.periodText}>
              {new Date(healthData.period_start).toLocaleDateString()} - {new Date(healthData.period_end).toLocaleDateString()}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="pulse" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No health data available</Text>
          <Text style={styles.emptySub}>Health snapshots will appear after the coworker has been active</Text>
        </View>
      )}
      </ScrollView>

      <VoiceButton />
      <DrawerNavigation visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

function ScoreCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  const percentage = Math.round(value * 100);
  const color = value > 0.7 ? COLORS.success : value > 0.4 ? COLORS.warning : COLORS.error;
  
  return (
    <View style={styles.scoreCard}>
      <Ionicons name={icon as any} size={24} color={COLORS.textSecondary} />
      <Text style={[styles.scoreValue, { color }]}>{percentage}%</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon as any} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ImpactCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <View style={styles.impactCard}>
      <View style={[styles.impactIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.impactValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.impactLabel}>{label}</Text>
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: 12,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
  },
  stateIndicator: {
    width: 12,
    height: 12,
    borderRadius: 99,
  },
  stateLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scoreCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  scoreValue: {
    marginTop: 12,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
  },
  scoreLabel: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  metricsList: {
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  impactGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  impactCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  impactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactValue: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  impactLabel: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 8,
  },
  issueText: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    marginBottom: 8,
  },
  improvementText: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
  },
  periodText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    marginTop: 40,
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
    textAlign: 'center',
  },
});
