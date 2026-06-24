import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { useAppStore } from '../../store/app';
import { getSupabase } from '../../api/supabase';
import DrawerNavigation from '../../components/DrawerNavigation';
import PrimaryFAB from '../../components/PrimaryFAB';
import VoiceButton from '../../components/VoiceButton';

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'signals' | 'coworkers'>('all');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { signals, coworkers, snapshot } = useAppStore();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const fetchFeedData = async () => {
    const supabase = getSupabase();
    
    const [signalsData, coworkersData] = await Promise.all([
      supabase
        .from('signals')
        .select('*')
        .in('status', ['new', 'acknowledged', 'in_progress'])
        .order('detected_at', { ascending: false })
        .limit(20),
      supabase
        .from('coworkers')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(20),
    ]);

    if (signalsData.error) throw signalsData.error;
    if (coworkersData.error) throw coworkersData.error;

    useAppStore.getState().setSignals(signalsData.data || []);
    useAppStore.getState().setCoworkers(coworkersData.data || []);
  };

  useEffect(() => {
    fetchFeedData().catch(() => undefined);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchFeedData();
    } finally {
      setRefreshing(false);
    }
  };

  const feedItems = useMemo(() => {
    const items: Array<{ type: 'signal' | 'coworker' | 'event'; data: any; timestamp: string }> = [];

    // Add signals
    signals.forEach(signal => {
      items.push({
        type: 'signal',
        data: signal,
        timestamp: signal.detected_at,
      });
    });

    // Coworker state changes are durable activity alongside signals and events.
    coworkers.forEach(coworker => {
      items.push({
        type: 'coworker',
        data: coworker,
        timestamp: coworker.updated_at,
      });
    });

    // Add events from snapshot
    snapshot?.whatHappened?.forEach((event: any) => {
      items.push({
        type: 'event',
        data: event,
        timestamp: new Date().toISOString(),
      });
    });

    // Sort by timestamp
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter
    if (filter === 'signals') {
      return items.filter(item => item.type === 'signal');
    }
    if (filter === 'coworkers') {
      return items.filter(item => item.type === 'coworker');
    }

    return items;
  }, [signals, coworkers, snapshot, filter]);

  const renderSignalItem = (signal: any) => (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.cardHead}>
        <View style={[styles.iconWrap, { backgroundColor: getSignalColor(signal.signal_type) + '20' }]}>
          <Ionicons name={getSignalIcon(signal.signal_type) as any} size={20} color={getSignalColor(signal.signal_type)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{signal.title}</Text>
          <Text style={styles.cardMeta}>{signal.signal_type.replace('_', ' ')} • {Math.round(signal.confidence * 100)}% confidence</Text>
        </View>
        {signal.impact_level && (
          <View style={[styles.impactBadge, { backgroundColor: getImpactColor(signal.impact_level) }]}>
            <Text style={styles.impactText}>{signal.impact_level}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardBody}>{signal.description}</Text>
      <Text style={styles.cardTime}>{new Date(signal.detected_at).toLocaleString()}</Text>
    </Animated.View>
  );

  const renderCoworkerItem = (coworker: any) => (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.cardHead}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-circle" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{coworker.name}</Text>
          <Text style={styles.cardMeta}>{coworker.desk.replace('_', ' ')} • {coworker.deployment_state.replace('_', ' ')}</Text>
        </View>
        <View style={[styles.healthIndicator, { backgroundColor: coworker.health_score > 0.7 ? COLORS.success : coworker.health_score > 0.4 ? COLORS.warning : COLORS.error }]} />
      </View>
      <Text style={styles.cardBody}>{coworker.mission}</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{Math.round(coworker.health_score * 100)}%</Text>
          <Text style={styles.metricLabel}>Health</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{Math.round(coworker.trust_score * 100)}%</Text>
          <Text style={styles.metricLabel}>Trust</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{Math.round(coworker.value_score * 100)}%</Text>
          <Text style={styles.metricLabel}>Value</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderEventItem = (event: any) => (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.cardHead}>
        <View style={styles.iconWrap}>
          <Ionicons name="flash" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Event</Text>
        </View>
      </View>
      <Text style={styles.cardBody}>{typeof event === 'string' ? event : JSON.stringify(event)}</Text>
    </Animated.View>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'signal') return renderSignalItem(item.data);
    if (item.type === 'coworker') return renderCoworkerItem(item.data);
    return renderEventItem(item.data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'signals' && styles.filterChipActive]}
          onPress={() => setFilter('signals')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, filter === 'signals' && styles.filterChipTextActive]}>Signals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'coworkers' && styles.filterChipActive]}
          onPress={() => setFilter('coworkers')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, filter === 'coworkers' && styles.filterChipTextActive]}>Coworkers</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={feedItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No feed items yet</Text>
          </View>
        }
      />

      <PrimaryFAB onPress={() => navigation.navigate('Build')} />
      <VoiceButton />
      <DrawerNavigation visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

function getSignalIcon(type: string): string {
  const icons: Record<string, string> = {
    churn_risk: 'warning',
    demand_signal: 'trending-up',
    supplier_issue: 'construct',
    quality_issue: 'alert-circle',
    collections_gap: 'card',
    unusual_pattern: 'analytics',
    growth_opportunity: 'rocket',
  };
  return icons[type] || 'information-circle';
}

function getSignalColor(type: string): string {
  const colors: Record<string, string> = {
    churn_risk: COLORS.error,
    demand_signal: COLORS.success,
    supplier_issue: COLORS.warning,
    quality_issue: COLORS.error,
    collections_gap: COLORS.warning,
    unusual_pattern: COLORS.primary,
    growth_opportunity: COLORS.success,
  };
  return colors[type] || COLORS.primary;
}

function getImpactColor(level: string): string {
  const colors: Record<string, string> = {
    low: COLORS.textMuted,
    medium: COLORS.warning,
    high: COLORS.error,
    critical: COLORS.error,
  };
  return colors[level] || COLORS.textMuted;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 58 : 34,
    paddingBottom: SPACING.md,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.text,
  },
  list: { flex: 1 },
  listContent: { padding: SPACING.lg, paddingBottom: 110 },
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardHead: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  cardBody: {
    marginTop: 14,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 23,
  },
  cardTime: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  impactBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  healthIndicator: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  metricsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 16,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
  },
  empty: {
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
});
