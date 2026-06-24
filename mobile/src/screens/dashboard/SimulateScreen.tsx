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
import { apiRequest } from '../../api/server';
import DrawerNavigation from '../../components/DrawerNavigation';
import PrimaryFAB from '../../components/PrimaryFAB';
import VoiceButton from '../../components/VoiceButton';

export default function SimulateScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { coworkerId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [coworker, setCoworker] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const scenarios = [
    { id: 'common', name: 'Common enquiry', description: 'Standard customer enquiry', icon: 'chatbubbles' },
    { id: 'payment', name: 'Payment reminder', description: 'Overdue invoice follow-up', icon: 'card' },
    { id: 'complaint', name: 'Customer complaint', description: 'Angry customer escalation', icon: 'warning' },
    { id: 'complex', name: 'Complex request', description: 'Multi-part customer request', icon: 'layers' },
    { id: 'custom', name: 'Custom scenario', description: 'Enter your own scenario', icon: 'create' },
  ];

  const fetchSimulations = async () => {
    const supabase = getSupabase();
    
    const [simulationsResult, coworkerResult] = await Promise.all([
      supabase
        .from('simulations')
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

    if (simulationsResult.error) {
      console.error('Simulations fetch error:', simulationsResult.error);
    }
    if (coworkerResult.error) {
      console.error('Coworker fetch error:', coworkerResult.error);
    }

    setSimulations(simulationsResult.data || []);
    setCoworker(coworkerResult.data);
  };

  useEffect(() => {
    fetchSimulations();
  }, [coworkerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSimulations();
    } finally {
      setRefreshing(false);
    }
  };

  const runSimulation = async () => {
    if (!selectedScenario) {
      Alert.alert('Select a scenario', 'Please select a scenario to run');
      return;
    }

    if (selectedScenario === 'custom' && !customInput.trim()) {
      Alert.alert('Enter scenario', 'Please describe your custom scenario');
      return;
    }

    setIsRunning(true);
    try {
      const scenarioInput = selectedScenario === 'custom' 
        ? { description: customInput }
        : getScenarioInput(selectedScenario);

      await apiRequest(`/api/coworkers/${encodeURIComponent(coworkerId)}/simulate`, {
        method: 'POST',
        body: {
          scenario_name: selectedScenario,
          scenario_type: selectedScenario,
          scenario_input: scenarioInput,
        },
      });
      
      Alert.alert('Simulation started', 'The simulation is running in the background');
      await fetchSimulations();
      setSelectedScenario(null);
      setCustomInput('');
    } catch (error) {
      Alert.alert('Error', 'Failed to start simulation');
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const runScenarioSuite = async () => {
    Alert.alert(
      'Run scenario suite',
      'This will run all predefined scenarios. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            setIsRunning(true);
            try {
              for (const scenario of scenarios.filter(s => s.id !== 'custom')) {
                const scenarioInput = getScenarioInput(scenario.id);
                
                await apiRequest(`/api/coworkers/${encodeURIComponent(coworkerId)}/simulate`, {
                  method: 'POST',
                  body: {
                    scenario_name: scenario.name,
                    scenario_type: scenario.id,
                    scenario_input: scenarioInput,
                  },
                });
              }

              Alert.alert('Success', 'Scenario suite started');
              await fetchSimulations();
            } catch (error) {
              Alert.alert('Error', 'Failed to run scenario suite');
              console.error(error);
            } finally {
              setIsRunning(false);
            }
          },
        },
      ]
    );
  };

  const getScenarioInput = (scenarioId: string) => {
    const inputs: Record<string, any> = {
      common: {
        event_type: 'inbound_message',
        message: 'Hi, I\'m interested in your services. Can you send me more info?',
        customer_type: 'new_lead',
        urgency: 'normal',
      },
      payment: {
        event_type: 'payment_reminder',
        invoice_age_days: 30,
        amount: 50000,
        previous_reminders: 2,
        customer_history: 'usually_pays_on_time',
      },
      complaint: {
        event_type: 'inbound_message',
        message: 'This is unacceptable! I want a refund immediately or I\'ll report you!',
        customer_type: 'vip_customer',
        urgency: 'critical',
        sentiment: 'angry',
      },
      complex: {
        event_type: 'complex_request',
        message: 'I need X, Y, and Z, but only if you can also do A and B, and the price should be under C.',
        customer_type: 'enterprise',
        urgency: 'medium',
        conflicting_requirements: true,
      },
    };
    return inputs[scenarioId] || {};
  };

  const getOutcomeColor = (outcome: string) => {
    const colors: Record<string, string> = {
      success: COLORS.success,
      failure: COLORS.error,
      uncertain: COLORS.warning,
      escalation: COLORS.warning,
    };
    return colors[outcome] || COLORS.textMuted;
  };

  const getRiskColor = (risk: string | null) => {
    if (!risk) return COLORS.textMuted;
    const colors: Record<string, string> = {
      low: COLORS.success,
      medium: COLORS.warning,
      high: COLORS.error,
      critical: COLORS.error,
    };
    return colors[risk] || COLORS.textMuted;
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
        <Text style={styles.topBarTitle}>Simulate</Text>
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
        <Text style={styles.kicker}>Scenario lab</Text>
        <Text style={styles.title}>{coworker.name}</Text>
        <Text style={styles.subtitle}>Test how your coworker handles different scenarios</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select scenario</Text>
        <View style={styles.scenariosGrid}>
          {scenarios.map((scenario) => (
            <TouchableOpacity
              key={scenario.id}
              style={[
                styles.scenarioCard,
                selectedScenario === scenario.id && styles.scenarioCardSelected,
              ]}
              onPress={() => setSelectedScenario(scenario.id)}
            >
              <Ionicons 
                name={scenario.icon as any} 
                size={24} 
                color={selectedScenario === scenario.id ? COLORS.text : COLORS.textSecondary} 
              />
              <Text style={[
                styles.scenarioName,
                selectedScenario === scenario.id && styles.scenarioNameSelected,
              ]}>
                {scenario.name}
              </Text>
              <Text style={styles.scenarioDescription}>{scenario.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedScenario === 'custom' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom scenario</Text>
          <TextInput
            style={styles.customInput}
            placeholder="Describe your custom scenario..."
            value={customInput}
            onChangeText={setCustomInput}
            multiline
            numberOfLines={4}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.runButton, !selectedScenario && styles.runButtonDisabled]}
            onPress={runSimulation}
            disabled={!selectedScenario || isRunning}
          >
            <Ionicons name="play" size={18} color={COLORS.text} />
            <Text style={styles.runButtonText}>
              {isRunning ? 'Running...' : 'Run simulation'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.suiteButton}
            onPress={runScenarioSuite}
            disabled={isRunning}
          >
            <Ionicons name="flask" size={18} color={COLORS.text} />
            <Text style={styles.suiteButtonText}>Run suite</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent simulations</Text>
          <Text style={styles.countText}>{simulations.length}</Text>
        </View>
        
        {simulations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flask" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No simulations yet</Text>
            <Text style={styles.emptySub}>Run a scenario to see results here</Text>
          </View>
        ) : (
          simulations.slice(0, 10).map((simulation) => (
            <TouchableOpacity key={simulation.id} style={styles.simulationCard}>
              <View style={styles.simulationHead}>
                <View style={[styles.outcomeBadge, { backgroundColor: getOutcomeColor(simulation.outcome) + '20' }]}>
                  <Text style={[styles.outcomeText, { color: getOutcomeColor(simulation.outcome) }]}>
                    {simulation.outcome}
                  </Text>
                </View>
                {simulation.risk_level && (
                  <View style={[styles.riskBadge, { backgroundColor: getRiskColor(simulation.risk_level) + '20' }]}>
                    <Text style={[styles.riskText, { color: getRiskColor(simulation.risk_level) }]}>
                      {simulation.risk_level}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.simulationName}>{simulation.scenario_name}</Text>
              <View style={styles.simulationMeta}>
                <Text style={styles.simulationDate}>
                  {new Date(simulation.created_at).toLocaleString()}
                </Text>
                <Text style={styles.simulationConfidence}>
                  {Math.round(simulation.confidence * 100)}% confidence
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
      </ScrollView>

      <PrimaryFAB icon="play" onPress={runScenarioSuite} />
      <VoiceButton />
      <DrawerNavigation visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  scenariosGrid: {
    gap: 12,
  },
  scenarioCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scenarioCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scenarioName: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  scenarioNameSelected: {
    color: COLORS.text,
  },
  scenarioDescription: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  customInput: {
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  runButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  runButtonDisabled: {
    opacity: 0.5,
  },
  runButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  suiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suiteButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
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
  simulationCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  simulationHead: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  outcomeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  simulationName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  simulationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  simulationDate: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  simulationConfidence: {
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
