import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { useAppStore } from '../../store/app';
import { fetchWorkspaceSnapshot } from '../../api/supabase';

export default function WorkflowsScreen() {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const { snapshot } = useAppStore();

  useEffect(() => {
    fetchWorkspaceSnapshot().catch(() => undefined);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchWorkspaceSnapshot();
    } finally {
      setRefreshing(false);
    }
  };

  const roomFeed = useMemo(() => {
    const rooms = snapshot?.departments || [];
    if (rooms.length === 0) {
      return [
        {
          id: 'sample-reception',
          title: 'Reception is ready',
          description: 'Inbound channels, routing, and first-response quality will appear here once connected.',
          meta: 'Room preview',
          status: 'quiet',
        },
        {
          id: 'sample-finance',
          title: 'Finance wants deeper visibility',
          description: 'Connect payment rails and invoices so Dobly can follow cash in real time.',
          meta: 'Suggested next room',
          status: 'attention',
        },
      ];
    }

    return rooms.map((room) => ({
      id: room.id,
      title: room.name,
      description: room.latestEvent || `${room.activeWorkers} coworkers and ${room.openTasks} open tasks`,
      meta: `${room.activeWorkers} coworkers · ${room.openTasks} open tasks`,
      status: room.status === 'needs_attention' ? 'attention' : room.status,
    }));
  }, [snapshot?.departments]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={roomFeed}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.kicker}>Rooms</Text>
          <Text style={styles.title}>Walk the office room by room.</Text>
          <Text style={styles.subtitle}>
            See where work is moving, where pressure is building, and which parts of the business are quiet.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Briefing')}>
          <View style={styles.cardTop}>
            <View style={[styles.statusPill, item.status === 'attention' ? styles.attentionPill : item.status === 'active' ? styles.livePill : styles.quietPill]}>
              <Text style={styles.statusText}>
                {item.status === 'attention' ? 'Needs attention' : item.status === 'active' ? 'Active' : 'Quiet'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.description}</Text>
          <Text style={styles.cardMeta}>{item.meta}</Text>
        </TouchableOpacity>
      )}
      ListFooterComponent={
        <TouchableOpacity style={styles.buildMore} onPress={() => navigation.navigate('Build')}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.buildMoreText}>Hire another coworker or open a new room</Text>
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 58 : 34, paddingBottom: 110 },
  header: { marginBottom: 18 },
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
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 24,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  livePill: {
    backgroundColor: 'rgba(16,185,129,0.16)',
  },
  attentionPill: {
    backgroundColor: 'rgba(245,158,11,0.16)',
  },
  quietPill: {
    backgroundColor: 'rgba(148,163,184,0.16)',
  },
  statusText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  cardTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    lineHeight: 24,
  },
  cardBody: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 23,
  },
  cardMeta: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  buildMore: {
    marginTop: 6,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  buildMoreText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});
