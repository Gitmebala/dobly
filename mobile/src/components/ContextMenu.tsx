import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';

interface ContextMenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

interface ContextMenuProps {
  visible: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  anchorPosition?: { x: number; y: number };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ContextMenu({ visible, onClose, items, anchorPosition }: ContextMenuProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (visible && anchorPosition) {
      const menuWidth = 200;
      const menuHeight = items.length * 50 + 20;
      
      let x = anchorPosition.x;
      let y = anchorPosition.y;

      // Adjust if menu would go off screen
      if (x + menuWidth > SCREEN_WIDTH - 20) {
        x = SCREEN_WIDTH - menuWidth - 20;
      }
      if (x < 20) {
        x = 20;
      }

      setPosition({ x, y });
    }
  }, [visible, anchorPosition, items.length]);

  const handleItemPress = (item: ContextMenuItem) => {
    item.onPress();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.menu,
            {
              left: position.x,
              top: position.y,
            },
          ]}
        >
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index < items.length - 1 && styles.menuItemBorder,
              ]}
              onPress={() => handleItemPress(item)}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.variant === 'danger' ? COLORS.error : COLORS.text}
              />
              <Text
                style={[
                  styles.menuItemText,
                  item.variant === 'danger' && styles.menuItemTextDanger,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#1a1a18',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 237, 228, 0.08)',
    padding: SPACING.xs,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 237, 228, 0.08)',
  },
  menuItemText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  menuItemTextDanger: {
    color: COLORS.error,
  },
});
