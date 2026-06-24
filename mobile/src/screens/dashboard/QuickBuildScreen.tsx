import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { getSupabase } from '../../api/supabase';
import DrawerNavigation from '../../components/DrawerNavigation';
import PrimaryFAB from '../../components/PrimaryFAB';

const ROLES = [
  { id: 'customer_support', name: 'Customer Support', icon: 'chatbubbles', description: 'Handle customer enquiries and support' },
  { id: 'sales', name: 'Sales', icon: 'trending-up', description: 'Manage leads and close deals' },
  { id: 'finance', name: 'Finance', icon: 'card', description: 'Handle payments and collections' },
  { id: 'operations', name: 'Operations', icon: 'construct', description: 'Coordinate internal processes' },
  { id: 'growth', name: 'Growth', icon: 'rocket', description: 'Identify opportunities and expand' },
];

const AUTONOMY_LEVELS = [
  { id: 'low', name: 'Low', description: 'Requires approval for most actions' },
  { id: 'medium', name: 'Medium', description: 'Can handle routine tasks independently' },
  { id: 'high', name: 'High', description: 'Acts autonomously within defined bounds' },
];

export default function QuickBuildScreen() {
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedAutonomy, setSelectedAutonomy] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mission, setMission] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleNext = () => {
    if (step === 1 && !selectedRole) {
      Alert.alert('Select a role', 'Please select a role for your coworker');
      return;
    }
    if (step === 2 && !selectedAutonomy) {
      Alert.alert('Select autonomy', 'Please select an autonomy level');
      return;
    }
    if (step === 3 && !name.trim()) {
      Alert.alert('Enter name', 'Please enter a name for your coworker');
      return;
    }
    if (step === 3 && !mission.trim()) {
      Alert.alert('Enter mission', 'Please describe the mission');
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreate = async () => {
    if (!selectedRole || !selectedAutonomy || !name.trim() || !mission.trim()) {
      Alert.alert('Complete all steps', 'Please complete all steps before creating');
      return;
    }

    setIsCreating(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const roleData = ROLES.find(r => r.id === selectedRole);
      const desk = roleData?.id || 'general';

      const { data, error } = await supabase
        .from('coworkers')
        .insert({
          user_id: user.id,
          role: selectedRole,
          name: name.trim(),
          mission: mission.trim(),
          desk: desk,
          tone: 'professional',
          autonomy_level: selectedAutonomy,
          status: 'draft',
          deployment_state: 'draft',
          health_score: 0.5,
          trust_score: 0.5,
          value_score: 0.5,
          tools: [],
          memory: [],
          permissions: [],
          escalation_rules: [],
          success_metrics: [],
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Coworker created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create coworker');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What will this coworker do?</Text>
      <Text style={styles.stepSubtitle}>Select a role to get started with a pre-configured template.</Text>
      
      <View style={styles.optionsGrid}>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[
              styles.optionCard,
              selectedRole === role.id && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedRole(role.id)}
          >
            <Ionicons
              name={role.icon as any}
              size={28}
              color={selectedRole === role.id ? COLORS.text : COLORS.textSecondary}
            />
            <Text style={[
              styles.optionName,
              selectedRole === role.id && styles.optionNameSelected,
            ]}>
              {role.name}
            </Text>
            <Text style={styles.optionDescription}>{role.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>How autonomous should it be?</Text>
      <Text style={styles.stepSubtitle}>Choose how much decision-making authority to grant.</Text>
      
      <View style={styles.optionsList}>
        {AUTONOMY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.id}
            style={[
              styles.optionRow,
              selectedAutonomy === level.id && styles.optionRowSelected,
            ]}
            onPress={() => setSelectedAutonomy(level.id)}
          >
            <View style={[
              styles.radioButton,
              selectedAutonomy === level.id && styles.radioButtonSelected,
            ]}>
              {selectedAutonomy === level.id && (
                <Ionicons name="checkmark" size={16} color={COLORS.text} />
              )}
            </View>
            <View style={styles.optionRowContent}>
              <Text style={[
                styles.optionRowName,
                selectedAutonomy === level.id && styles.optionRowNameSelected,
              ]}>
                {level.name}
              </Text>
              <Text style={styles.optionRowDescription}>{level.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Give it a name and mission</Text>
      <Text style={styles.stepSubtitle}>Personalize your coworker with a clear purpose.</Text>
      
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Name</Text>
        <TextInput
          style={styles.formInput}
          placeholder="e.g., Customer Desk"
          value={name}
          onChangeText={setName}
          placeholderTextColor={COLORS.textMuted}
        />
        
        <Text style={[styles.formLabel, styles.formLabelMargin]}>Mission</Text>
        <TextInput
          style={[styles.formInput, styles.formInputMultiline]}
          placeholder="Describe what this coworker should accomplish..."
          value={mission}
          onChangeText={setMission}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review and create</Text>
      <Text style={styles.stepSubtitle}>Confirm your coworker configuration.</Text>
      
      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Role</Text>
          <Text style={styles.reviewValue}>
            {ROLES.find(r => r.id === selectedRole)?.name}
          </Text>
        </View>
        
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Autonomy</Text>
          <Text style={styles.reviewValue}>
            {AUTONOMY_LEVELS.find(l => l.id === selectedAutonomy)?.name}
          </Text>
        </View>
        
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Name</Text>
          <Text style={styles.reviewValue}>{name}</Text>
        </View>
        
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Mission</Text>
          <Text style={[styles.reviewValue, styles.reviewValueMultiline]}>{mission}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Your coworker will start in draft mode. You can configure standards, tools, and deployment settings before going live.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Quick Build</Text>
        <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                step >= i && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <ScrollView style={styles.scrollContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>

        <View style={styles.footer}>
          {step < 4 ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Ionicons name="hourglass" size={18} color={COLORS.text} />
                  <Text style={styles.createButtonText}>Creating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={COLORS.text} />
                  <Text style={styles.createButtonText}>Create coworker</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DrawerNavigation visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  content: {
    flex: 1,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  stepContent: {
    paddingBottom: 24,
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 24,
    marginBottom: 24,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionName: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  optionNameSelected: {
    color: COLORS.text,
  },
  optionDescription: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: COLORS.primary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionRowContent: {
    flex: 1,
  },
  optionRowName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  optionRowNameSelected: {
    color: COLORS.primary,
  },
  optionRowDescription: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  formSection: {
    gap: 16,
  },
  formLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  formLabelMargin: {
    marginTop: 8,
  },
  formInput: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
  },
  formInputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  reviewCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  reviewValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  reviewValueMultiline: {
    textAlign: 'right',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  infoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  footer: {
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  nextButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.success,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
});
