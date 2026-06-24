import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../theme';
import { useAppStore } from '../../store/app';
import { fetchConnections } from '../../api/supabase';

const PROVIDER_ICONS: Record<string, string> = {
  google: 'logo-google',
  shopify: 'cart',
  stripe: 'card',
  slack: 'chatbubble',
  hubspot: 'people',
  mailchimp: 'mail',
  zendesk: 'headset',
  docusign: 'document',
  whatsapp: 'logo-whatsapp',
};

const AVAILABLE_PROVIDERS = [
  { id: 'google', name: 'Google', description: 'Gmail, Sheets, Calendar, Drive' },
  { id: 'shopify', name: 'Shopify', description: 'Ecommerce & Inventory' },
  { id: 'stripe', name: 'Stripe', description: 'Payments & Invoicing' },
  { id: 'slack', name: 'Slack', description: 'Team messaging' },
  { id: 'hubspot', name: 'HubSpot', description: 'CRM & Marketing' },
  { id: 'mailchimp', name: 'Mailchimp', description: 'Email marketing' },
];

export default function ConnectionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { connections } = useAppStore();
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      await fetchConnections();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const isConnected = (providerId: string) => {
    return connections.some(c => c.provider === providerId && c.status === 'connected');
  };
  
  const handleConnect = async (providerId: string) => {
    // This would open OAuth flow - in production you'd use Linking
    // For now, just show an alert
    console.log('Connect to:', providerId);
  };
  
  const renderConnected = ({ item }: { item: any }) => (
    <View style={styles.connectedCard}>
      <View style={styles.providerAvatar}>
        <Ionicons name={PROVIDER_ICONS[item.provider] as any || 'link'} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.providerInfo}>
        <Text style={styles.providerName}>{item.provider}</Text>
        <Text style={styles.providerStatus}>Connected</Text>
      </View>
      <TouchableOpacity style={styles.configBtn}>
        <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
  
  const renderAvailable = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.availableCard}
      onPress={() => handleConnect(item.id)}
    >
      <View style={styles.providerAvatar}>
        <Ionicons name={PROVIDER_ICONS[item.id] as any || 'link'} size={24} color={COLORS.textMuted} />
      </View>
      <View style={styles.providerInfo}>
        <Text style={styles.providerName}>{item.name}</Text>
        <Text style={styles.providerDesc}>{item.description}</Text>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  const connectedProviders = connections.filter(c => c.status === 'connected');
  
  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        keyExtractor={() => 'empty'}
        renderItem={() => null}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Access</Text>
              <Text style={styles.subtitle}>Connect your tools</Text>
            </View>
            
            {connectedProviders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connected</Text>
                {connectedProviders.map(conn => (
                  <View key={conn.id} style={styles.connectedCard}>
                    <View style={[styles.providerAvatar, { backgroundColor: COLORS.primaryMuted }]}>
                      <Ionicons name={PROVIDER_ICONS[conn.provider] as any || 'link'} size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.providerInfo}>
                      <Text style={styles.providerName}>{conn.provider}</Text>
                      <Text style={[styles.providerStatus, { color: COLORS.success }]}>Connected</Text>
                    </View>
                    <TouchableOpacity style={styles.configBtn}>
                      <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available</Text>
              {AVAILABLE_PROVIDERS.filter(p => !isConnected(p.id)).map(provider => (
                <TouchableOpacity 
                  key={provider.id}
                  style={styles.availableCard}
                  onPress={() => handleConnect(provider.id)}
                >
                  <View style={[styles.providerAvatar, { backgroundColor: COLORS.surface }]}>
                    <Ionicons name={PROVIDER_ICONS[provider.id] as any || 'link'} size={24} color={COLORS.textMuted} />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{provider.name}</Text>
                    <Text style={styles.providerDesc}>{provider.description}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.lg, paddingBottom: 100 },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: FONT_SIZES['3xl'], fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, marginTop: SPACING.xs },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.md },
  connectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.sm },
  availableCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.sm },
  providerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  providerInfo: { flex: 1, marginLeft: SPACING.md },
  providerName: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.text },
  providerStatus: { fontSize: FONT_SIZES.sm, color: COLORS.success, marginTop: 2 },
  providerDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  configBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
});