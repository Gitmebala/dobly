import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../theme';
import { useAppStore } from '../../store/app';
import { decideOfficeTask, fetchWorkspaceSnapshot } from '../../api/supabase';
import DrawerNavigation from '../../components/DrawerNavigation';
import VoiceButton from '../../components/VoiceButton';

export default function ApprovalsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
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

  const items = useMemo(() => {
    return (snapshot?.needsDecision as any[]) || [];
  }, [snapshot?.needsDecision]);

  const handleDecision = async (id: string, decision: 'approved' | 'rejected' | 'cancelled') => {
    try {
      await decideOfficeTask(id, decision);
      await fetchWorkspaceSnapshot();
    } catch (error) {
      Alert.alert('Decision not saved', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title || 'Decision needed'}</Text>
          <Text style={styles.cardMeta}>
            {(item.worker_key || item.coworker || 'System').replaceAll('_', ' ')}
          </Text>
          <Text style={styles.cardMeta}>{item.risk_level || item.riskLevel || 'medium'} risk</Text>
        </View>
      </View>

      <Text style={styles.cardBody}>{item.summary || item.reason || 'Dobly wants your judgment before acting.'}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.approve} onPress={() => handleDecision(item.id, 'approved')}>
          <Ionicons name="checkmark" size={18} color={COLORS.text} />
          <Text style={styles.actionText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modify} onPress={() => handleDecision(item.id, 'cancelled')}>
          <Ionicons name="pause" size={18} color={COLORS.text} />
          <Text style={styles.actionText}>Hold</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reject} onPress={() => handleDecision(item.id, 'rejected')}>
          <Ionicons name="close" size={18} color={COLORS.error} />
          <Text style={[styles.actionText, { color: COLORS.error }]}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approvals</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No pending approvals</Text>
          </View>
        }
      />

      <VoiceButton />
      <DrawerNavigation visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
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
  list: { flex: 1 },
  listContent: { padding: SPACING.lg, paddingBottom: 110 },
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
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.24)',
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
    backgroundColor: 'rgba(245,158,11,0.18)',
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
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  approve: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modify: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reject: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
