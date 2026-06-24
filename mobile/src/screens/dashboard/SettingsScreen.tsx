import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, applyThemePreference, type ThemePreference } from '../../theme';
import { useAppStore } from '../../store/app';
import { signOut } from '../../api/supabase';
import LogoMark from '../../components/LogoMark';

const THEME_STORAGE_KEY = 'theme_preference';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, workflows, approvals, connections, themePreference, setThemePreference } = useAppStore();

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Leave the mobile owner console?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    applyThemePreference(nextTheme);
    setThemePreference(nextTheme);
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, nextTheme);
    Alert.alert('Theme saved', 'The new appearance will apply the next time the mobile app opens.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <LogoMark size={48} topFill={1} />
        <Text style={styles.title}>Owner control</Text>
        <Text style={styles.subtitle}>{user?.email || 'Signed in workspace'}</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{workflows.length || 4}</Text>
          <Text style={styles.summaryLabel}>Systems</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{approvals.length || 2}</Text>
          <Text style={styles.summaryLabel}>Escalations</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{connections.length || 6}</Text>
          <Text style={styles.summaryLabel}>Connections</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workspace</Text>
        {[
          ['Business memory', 'What Dobly has learned about your operation', 'library'],
          ['Trust settings', 'Control approvals, autonomy, and escalation thresholds', 'shield-checkmark'],
          ['Connected tools', 'Review the systems and channels Dobly can act through', 'link'],
        ].map(([title, body, icon]) => (
          <TouchableOpacity key={title} style={styles.row}>
            <Ionicons name={icon as any} size={20} color={COLORS.primary} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowText}>{body}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        {([
          ['system', 'Match device', 'Follow your phone appearance'],
          ['light', 'Light', 'Warm parchment mode'],
          ['dark', 'Dark', 'Night cockpit mode'],
        ] as Array<[ThemePreference, string, string]>).map(([value, title, body]) => (
          <TouchableOpacity key={value} style={styles.row} onPress={() => handleThemeChange(value)}>
            <Ionicons
              name={themePreference === value ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={themePreference === value ? COLORS.primary : COLORS.textMuted}
            />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowText}>{body}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product thesis</Text>
        <View style={styles.thesisCard}>
          <Text style={styles.thesisText}>
            Dobly exists to separate decision-making from operational labor so a small-business owner can stop being
            the bottleneck and start steering the business instead of carrying it.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 58 : 34, paddingBottom: 110 },
  hero: {
    alignItems: 'flex-start',
  },
  title: {
    marginTop: 16,
    color: COLORS.text,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.3,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
  },
  summary: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
  },
  summaryLabel: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  rowText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  thesisCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thesisText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 24,
  },
  signOut: {
    marginTop: 24,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  signOutText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
});
