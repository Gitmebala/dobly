import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';
import { signOut } from '../api/supabase';

interface DrawerItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  screen: string;
}

const DRAWER_ITEMS: DrawerItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', screen: 'Briefing' },
  { id: 'feed', label: 'Activity', icon: 'pulse', screen: 'ActivityFeed' },
  { id: 'work', label: 'Work', icon: 'list', screen: 'Feed' },
  { id: 'approvals', label: 'Approvals', icon: 'checkmark-circle', screen: 'Approvals' },
  { id: 'briefings', label: 'Briefings', icon: 'document-text', screen: 'Briefing' },
  { id: 'coworkers', label: 'Coworkers', icon: 'people', screen: 'ActivityFeed' },
  { id: 'health', label: 'Health', icon: 'heart', screen: 'Health' },
];

const SETTINGS_ITEMS: DrawerItem[] = [
  { id: 'settings', label: 'Settings', icon: 'settings', screen: 'More' },
  { id: 'profile', label: 'Profile', icon: 'person', screen: 'More' },
  { id: 'help', label: 'Help', icon: 'help-circle', screen: 'More' },
  { id: 'signout', label: 'Sign Out', icon: 'log-out', screen: 'SignOut' },
];

interface DrawerNavigationProps {
  visible: boolean;
  onClose: () => void;
}

export default function DrawerNavigation({ visible, onClose }: DrawerNavigationProps) {
  const navigation = useNavigation();

  const handleNavigate = (screen: string) => {
    onClose();
    // @ts-ignore
    navigation.navigate(screen);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.drawer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.logoSection}>
            <Text style={styles.logo}>Dobly</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              {DRAWER_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.drawerItem}
                  onPress={() => item.id === 'signout' ? handleSignOut() : handleNavigate(item.screen)}
                >
                  <View style={styles.drawerItemLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.drawerItemLabel}>{item.label}</Text>
                  </View>
                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              {SETTINGS_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.drawerItem}
                  onPress={() => item.id === 'signout' ? handleSignOut() : handleNavigate(item.screen)}
                >
                  <View style={styles.drawerItemLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.drawerItemLabel}>{item.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: '80%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'ios' ? 58 : 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  logo: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: SPACING.lg,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  drawerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  drawerItemLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
});
