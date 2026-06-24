import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../theme';
import { useAppStore } from '../../store/app';
import { createBoardroomReport, createGeneralManagerBriefing, fetchWorkspaceSnapshot } from '../../api/supabase';
import DrawerNavigation from '../../components/DrawerNavigation';
import PrimaryFAB from '../../components/PrimaryFAB';
import VoiceButton from '../../components/VoiceButton';
import ContextMenu from '../../components/ContextMenu';

const fallbackFeed = [
  'Customer Desk answered 14 enquiries and booked 3 appointments before 9:40 AM.',
  'Finance Desk recovered one overdue payment and queued one discount decision for review.',
  'Growth Desk noticed repeat demand for a service you do not currently sell.',
];

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedCoworkerId, setSelectedCoworkerId] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { snapshot, coworkers, escalations, signals } = useAppStore();

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

  const handleCreateBriefing = async () => {
    try {
      await createGeneralManagerBriefing();
      Alert.alert('Briefing created', 'The General Manager added a fresh briefing to the office log.');
    } catch (error: any) {
      Alert.alert('Could not create briefing', error?.message || 'Please try again.');
    }
  };

  const handleCreateBoardReport = async () => {
    try {
      await createBoardroomReport();
      Alert.alert('Boardroom report created', 'The Board added a strategic report to the office log.');
    } catch (error: any) {
      Alert.alert('Could not create report', error?.message || 'Please try again.');
    }
  };

  const topNeeds = snapshot?.whatNeedsAttention?.length ? snapshot.whatNeedsAttention : fallbackFeed;
  const businessStatus = snapshot?.businessStatus || 'Business is okay';
  const rooms = snapshot?.departments?.slice(0, 6) || [];

  const deskStats = useMemo(
    () => [
      { label: 'Desks live', value: String(coworkers?.length || 0), tone: COLORS.text },
      { label: 'Awaiting you', value: String(escalations?.length || 0), tone: COLORS.warning },
      { label: 'Signals', value: String(signals?.length || 0), tone: COLORS.primary },
    ],
    [coworkers, escalations, signals],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Homebase</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>General Manager briefing</Text>
          <Text style={styles.title}>{businessStatus}</Text>
          <Text style={styles.subtitle}>
            {snapshot?.focusReason ||
              'Dobly is holding the line on customer replies, payment follow-up, and internal coordination.'}
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroActionPrimary} onPress={handleCreateBriefing}>
              <Ionicons name="pulse" size={17} color={COLORS.text} />
              <Text style={styles.heroActionText}>Ask GM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroActionSecondary} onPress={handleCreateBoardReport}>
              <Ionicons name="people" size={17} color={COLORS.text} />
              <Text style={styles.heroActionText}>Run Board</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statRow}>
          {deskStats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: item.tone }]}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rooms of the office</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
              <Text style={styles.linkText}>Open rooms</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.roomGrid}>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <TouchableOpacity key={room.id} style={styles.roomCard} onPress={() => navigation.navigate('Feed')}>
                  <View style={styles.roomTop}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <View
                      style={[
                        styles.roomStatus,
                        room.status === 'needs_attention'
                          ? styles.roomStatusWarn
                          : room.status === 'active'
                            ? styles.roomStatusLive
                            : styles.roomStatusQuiet,
                      ]}
                    />
                  </View>
                  <Text style={styles.roomMeta}>
                    {room.activeWorkers} coworkers · {room.openTasks} open tasks
                  </Text>
                  <Text style={styles.roomEvent} numberOfLines={2}>
                    {room.latestEvent || 'Room is ready.'}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyRoomCard}>
                <Text style={styles.emptyRoomText}>
                  Your rooms will appear here as Dobly starts staffing the office.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What Dobly noticed</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
              <Text style={styles.linkText}>Open feed</Text>
            </TouchableOpacity>
          </View>
          {topNeeds.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.feedItem}>
              <View style={styles.feedDot} />
              <Text style={styles.feedText}>{item}</Text>
            </View>
          ))}
        </View>

        {snapshot?.needsDecision && snapshot.needsDecision.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Needs your decision</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Approvals')}>
                <Text style={styles.linkText}>View all</Text>
              </TouchableOpacity>
            </View>
            {snapshot.needsDecision.slice(0, 2).map((item: any, index: number) => (
              <TouchableOpacity key={index} style={styles.decisionItem} onPress={() => navigation.navigate('Approvals')}>
                <View style={styles.decisionIcon}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
                </View>
                <View style={styles.decisionContent}>
                  <Text style={styles.decisionTitle}>{item.title || item.reason || item.type || 'Decision needed'}</Text>
                  <Text style={styles.decisionMeta}>{item.worker_key || item.coworker || 'System'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operational floor</Text>
          <View style={styles.deskGrid}>
            {coworkers?.slice(0, 4).map((coworker) => (
              <TouchableOpacity
                key={coworker.id}
                style={styles.deskCard}
                onPress={() => navigation.navigate('Feed')}
                onLongPress={(event) => {
                  const { pageX, pageY } = event.nativeEvent;
                  setContextMenuPosition({ x: pageX, y: pageY });
                  setSelectedCoworkerId(coworker.id);
                  setContextMenuVisible(true);
                }}
              >
                <Ionicons name="person-circle" size={22} color={COLORS.primary} />
                <Text style={styles.deskTitle}>{coworker.name}</Text>
                <Text style={styles.deskMeta}>{coworker.desk.replace('_', ' ')}</Text>
                <View
                  style={[
                    styles.healthIndicator,
                    {
                      backgroundColor:
                        coworker.health_score > 0.7
                          ? COLORS.success
                          : coworker.health_score > 0.4
                            ? COLORS.warning
                            : COLORS.error,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <PrimaryFAB onPress={() => navigation.navigate('Build')} />
      <VoiceButton />
      <DrawerNavigation visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      <ContextMenu
        visible={contextMenuVisible}
        onClose={() => setContextMenuVisible(false)}
        anchorPosition={contextMenuPosition}
        items={[
          {
            label: 'View details',
            icon: 'eye-outline',
            onPress: () => {
              if (selectedCoworkerId) {
                navigation.navigate('CoworkerDetail', { coworkerId: selectedCoworkerId });
              }
            },
          },
          {
            label: 'View health',
            icon: 'pulse-outline',
            onPress: () => {
              if (selectedCoworkerId) {
                navigation.navigate('CoworkerHealth', { coworkerId: selectedCoworkerId });
              }
            },
          },
          {
            label: 'Run simulation',
            icon: 'play-circle-outline',
            onPress: () => {
              if (selectedCoworkerId) {
                navigation.navigate('Simulate', { coworkerId: selectedCoworkerId });
              }
            },
          },
          {
            label: 'Shadow mode',
            icon: 'layers-outline',
            onPress: () => {
              if (selectedCoworkerId) {
                navigation.navigate('Shadow', { coworkerId: selectedCoworkerId });
              }
            },
          },
        ]}
      />
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
  scrollContent: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 110 },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
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
  heroActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  heroActionPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroActionSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroActionText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  statRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
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
  linkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  roomGrid: {
    gap: 10,
  },
  roomCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  roomStatus: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  roomStatusLive: {
    backgroundColor: COLORS.success,
  },
  roomStatusWarn: {
    backgroundColor: COLORS.warning,
  },
  roomStatusQuiet: {
    backgroundColor: COLORS.textMuted,
  },
  roomMeta: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  roomEvent: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  emptyRoomCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyRoomText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  feedItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  feedDot: {
    marginTop: 7,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
  },
  feedText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 23,
  },
  deskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  deskCard: {
    width: '48.5%',
    borderRadius: 22,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deskTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  deskMeta: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  healthIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  decisionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  decisionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionContent: {
    flex: 1,
  },
  decisionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  decisionMeta: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
});
