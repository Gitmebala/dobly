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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { getSupabase } from '../../api/supabase';
import DrawerNavigation from '../../components/DrawerNavigation';
import PrimaryFAB from '../../components/PrimaryFAB';
import VoiceButton from '../../components/VoiceButton';

export default function CoworkerDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { coworkerId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [coworker, setCoworker] = useState<any>(null);
  const [standards, setStandards] = useState<any[]>([]);

  const fetchCoworkerData = async () => {
    const supabase = getSupabase();
    
    const [coworkerResult, standardsResult] = await Promise.all([
      supabase
        .from('coworkers')
        .select('*')
        .eq('id', coworkerId)
        .single(),
      supabase
        .from('standards')
        .select('*')
        .eq('coworker_id', coworkerId)
        .eq('is_active', true),
    ]);

    if (coworkerResult.error) {
      console.error('Coworker fetch error:', coworkerResult.error);
    }
    if (standardsResult.error) {
      console.error('Standards fetch error:', standardsResult.error);
    }

    setCoworker(coworkerResult.data);
    setStandards(standardsResult.data || []);
  };

  useEffect(() => {
    fetchCoworkerData();
  }, [coworkerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCoworkerData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeploy = async () => {
    Alert.alert(
      'Deploy coworker',
      'This will deploy the coworker to the next stage. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deploy',
          onPress: async () => {
            const supabase = getSupabase();
            const deploymentStages = ['draft', 'simulated', 'shadow', 'guarded_live', 'delegated_live'];
            const currentIndex = deploymentStages.indexOf(coworker.deployment_state);
            if (currentIndex < deploymentStages.length - 1) {
              const nextStage = deploymentStages[currentIndex + 1];
              const { error } = await supabase
                .from('coworkers')
                .update({ 
                  deployment_state: nextStage,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', coworkerId);
              
              if (error) {
                Alert.alert('Error', 'Failed to deploy coworker');
              } else {
                await fetchCoworkerData();
                Alert.alert('Success', `Deployed to ${nextStage.replace('_', ' ')}`);
              }
            }
          },
        },
      ]
    );
  };

  const handlePause = async () => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('coworkers')
      .update({ 
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', coworkerId);
    
    if (error) {
      Alert.alert('Error', 'Failed to pause coworker');
    } else {
      await fetchCoworkerData();
    }
  };

  const handleResume = async () => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('coworkers')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', coworkerId);
    
    if (error) {
      Alert.alert('Error', 'Failed to resume coworker');
    } else {
      await fetchCoworkerData();
    }
  };

  if (!coworker) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Coworker not found</Text>
      </View>
    );
  }

  const getDeploymentColor = (state: string) => {
    const colors: Record<string, string> = {
      draft: COLORS.textMuted,
      simulated: COLORS.primary,
      shadow: COLORS.warning,
      guarded_live: COLORS.success,
      delegated_live: COLORS.success,
    };
    return colors[state] || COLORS.textMuted;
  };

  const getDeploymentLabel = (state: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      simulated: 'Simulated',
      shadow: 'Shadow Mode',
      guarded_live: 'Guarded Live',
      delegated_live: 'Delegated Live',
    };
    return labels[state] || state;
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Coworker</Text>
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
        <View style={styles.headerTop}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-circle" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{coworker.name}</Text>
            <Text style={styles.role}>{coworker.role.replace('_', ' ')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: coworker.status === 'active' ? COLORS.success + '20' : COLORS.textMuted + '20' }]}>
            <Text style={[styles.statusText, { color: coworker.status === 'active' ? COLORS.success : COLORS.textMuted }]}>
              {coworker.status}
            </Text>
          </View>
        </View>
        
        <View style={[styles.deploymentBadge, { backgroundColor: getDeploymentColor(coworker.deployment_state) + '20' }]}>
          <Ionicons name="rocket" size={16} color={getDeploymentColor(coworker.deployment_state)} />
          <Text style={[styles.deploymentText, { color: getDeploymentColor(coworker.deployment_state) }]}>
            {getDeploymentLabel(coworker.deployment_state)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mission</Text>
        <Text style={styles.missionText}>{coworker.mission}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.configGrid}>
          <ConfigItem label="Desk" value={coworker.desk.replace('_', ' ')} icon="construct" />
          <ConfigItem label="Tone" value={coworker.tone || 'Professional'} icon="chatbubbles" />
          <ConfigItem label="Autonomy" value={coworker.autonomy_level || 'medium'} icon="person" />
          <ConfigItem label="Tools" value={`${coworker.tools?.length || 0} connected`} icon="apps" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.scoresRow}>
          <ScoreCard label="Health" value={coworker.health_score} icon="heart" />
          <ScoreCard label="Trust" value={coworker.trust_score} icon="shield-checkmark" />
          <ScoreCard label="Value" value={coworker.value_score} icon="trending-up" />
        </View>
      </View>

      {standards.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Standards ({standards.length})</Text>
          {standards.slice(0, 3).map((standard) => (
            <View key={standard.id} style={styles.standardItem}>
              <View style={styles.standardIcon}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              </View>
              <View style={styles.standardContent}>
                <Text style={styles.standardName}>{standard.name}</Text>
                <Text style={styles.standardPromise}>{standard.promise}</Text>
              </View>
            </View>
          ))}
          {standards.length > 3 && (
            <Text style={styles.moreText}>+{standards.length - 3} more standards</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('CoworkerHealth', { coworkerId })}>
            <Ionicons name="pulse" size={24} color={COLORS.primary} />
            <Text style={styles.actionLabel}>View Health</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Simulate', { coworkerId })}>
            <Ionicons name="flask" size={24} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Simulate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Shadow', { coworkerId })}>
            <Ionicons name="eye" size={24} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Shadow Mode</Text>
          </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('QuickBuild')}>
            <Ionicons name="create" size={24} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        {coworker.status === 'active' ? (
          <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
            <Ionicons name="pause" size={18} color={COLORS.text} />
            <Text style={styles.pauseButtonText}>Pause coworker</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
            <Ionicons name="play" size={18} color={COLORS.text} />
            <Text style={styles.resumeButtonText}>Resume coworker</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.deployButton} onPress={handleDeploy}>
          <Ionicons name="rocket" size={18} color={COLORS.text} />
          <Text style={styles.deployButtonText}>Deploy to next stage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <DetailRow label="Created" value={new Date(coworker.created_at).toLocaleDateString()} />
        <DetailRow label="Last updated" value={new Date(coworker.updated_at).toLocaleDateString()} />
        {coworker.description && <DetailRow label="Description" value={coworker.description} />}
      </View>
      </ScrollView>

      <PrimaryFAB icon="create" onPress={() => navigation.navigate('Shadow', { coworkerId })} />
      <VoiceButton />
      <DrawerNavigation visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

function ConfigItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.configItem}>
      <Ionicons name={icon as any} size={18} color={COLORS.textSecondary} />
      <Text style={styles.configLabel}>{label}</Text>
      <Text style={styles.configValue}>{value}</Text>
    </View>
  );
}

function ScoreCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  const percentage = Math.round(value * 100);
  const color = value > 0.7 ? COLORS.success : value > 0.4 ? COLORS.warning : COLORS.error;
  
  return (
    <View style={styles.scoreCard}>
      <Ionicons name={icon as any} size={20} color={COLORS.textSecondary} />
      <Text style={[styles.scoreValue, { color }]}>{percentage}%</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  role: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deploymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  deploymentText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
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
  missionText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 24,
  },
  configGrid: {
    gap: 12,
  },
  configItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  configLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  configValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  scoreValue: {
    marginTop: 8,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  scoreLabel: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
  },
  standardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  standardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standardContent: {
    flex: 1,
  },
  standardName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  standardPromise: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  moreText: {
    marginTop: 8,
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  actionLabel: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.warning,
    marginBottom: 10,
  },
  pauseButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.success,
    marginBottom: 10,
  },
  resumeButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  deployButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  deployButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    marginTop: 40,
  },
});
