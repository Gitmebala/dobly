import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { generateWorkflow } from '../../api/supabase';

const prompts = [
  'Handle all new customer enquiries and only escalate when someone sounds upset or high value.',
  'Follow up on overdue invoices every three days and stop when payment lands.',
  'Send me a Monday morning owner briefing with sales, cash flow, and operational risk.',
];

export default function GenerateScreen() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const interpretation = useMemo(() => {
    const lower = prompt.toLowerCase();
    if (!lower.trim()) {
      return {
        desk: 'Dobly will decide the right desk or mix of desks.',
        model: 'Automation, agent, or hybrid depending on the job.',
      };
    }
    const desk = lower.includes('invoice') || lower.includes('payment')
      ? 'Finance Desk'
      : lower.includes('customer') || lower.includes('whatsapp') || lower.includes('enquir')
        ? 'Customer Desk'
        : lower.includes('report') || lower.includes('brief')
          ? 'Owner Briefing Desk'
          : 'Hybrid Desk';
    const model = lower.includes('every') || lower.includes('when') ? 'Hybrid system with live triggers.' : 'Agent-led operating loop.';
    return { desk, model };
  }, [prompt]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const result = await generateWorkflow(prompt);
      Alert.alert('Dobly built the system', `Workflow created${result?.name ? `: ${result.name}` : '.'}`);
      setPrompt('');
    } catch (error: any) {
      Alert.alert('Could not build the system', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Build from plain English</Text>
      <Text style={styles.title}>Describe the work. Dobly handles the architecture.</Text>
      <Text style={styles.subtitle}>
        You should not have to decide whether this is an agent, an automation, or a hybrid. Explain the standard. Dobly will compile the right operating model.
      </Text>

      <View style={styles.promptCard}>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="What do you want Dobly to handle permanently?"
          placeholderTextColor={COLORS.textMuted}
          multiline
          textAlignVertical="top"
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.button, !prompt.trim() && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={!prompt.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <>
              <Text style={styles.buttonText}>Build the system</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.readCard}>
        <Text style={styles.readTitle}>Live interpretation</Text>
        <Text style={styles.readLabel}>Likely owner</Text>
        <Text style={styles.readValue}>{interpretation.desk}</Text>
        <Text style={styles.readLabel}>Execution model</Text>
        <Text style={styles.readValue}>{interpretation.model}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Try one of these</Text>
        {prompts.map((item) => (
          <TouchableOpacity key={item} style={styles.suggestion} onPress={() => setPrompt(item)}>
            <Ionicons name="sparkles" size={18} color={COLORS.primary} />
            <Text style={styles.suggestionText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 58 : 34, paddingBottom: 110 },
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
  promptCard: {
    marginTop: 20,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  input: {
    minHeight: 180,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    lineHeight: 24,
  },
  button: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  readCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  readLabel: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  readValue: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 22,
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
  suggestion: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 23,
  },
});
