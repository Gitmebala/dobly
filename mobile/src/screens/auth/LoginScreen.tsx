import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { signIn } from '../../api/supabase';
import LogoMark from '../../components/LogoMark';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Enter your email and password to open your workspace.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error: any) {
      Alert.alert('Could not sign in', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.glow} />
      <View style={styles.content}>
        <LogoMark size={58} topFill={1} />
        <Text style={styles.kicker}>Dobly Mobile</Text>
        <Text style={styles.title}>Your business runs. You direct it.</Text>
        <Text style={styles.subtitle}>
          Open the owner console for briefings, approvals, live operations, and the desks handling everything in the
          background.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputShell}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputShell}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((value) => !value)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <Text style={styles.buttonText}>Enter workspace</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerCard}>
            <Text style={styles.footerValue}>20h</Text>
            <Text style={styles.footerLabel}>Operating day</Text>
          </View>
          <View style={styles.footerCard}>
            <Text style={styles.footerValue}>2</Text>
            <Text style={styles.footerLabel}>Escalations today</Text>
          </View>
          <View style={styles.footerCard}>
            <Text style={styles.footerValue}>6.7h</Text>
            <Text style={styles.footerLabel}>Time returned</Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  glow: {
    position: 'absolute',
    top: 40,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(196,80,26,0.14)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  kicker: {
    marginTop: 28,
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -1.6,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 14,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.base,
    lineHeight: 25,
  },
  form: {
    marginTop: 28,
    gap: 12,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    paddingVertical: 16,
    marginLeft: 12,
  },
  button: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  footer: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 10,
  },
  footerCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  footerLabel: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
});
