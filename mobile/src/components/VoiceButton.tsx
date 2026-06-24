import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';
import { apiRequest, apiUpload } from '../api/server';

interface VoiceButtonProps {
  onCommand?: (transcript: string) => void;
}

export default function VoiceButton({ onCommand }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please grant microphone permission');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      
      await recording.startAsync();
      setIsRecording(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      console.error(error);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        setIsModalVisible(true);
        setIsTranscribing(true);
        setTranscript('');

        try {
          const formData = new FormData();
          formData.append('audio', {
            uri,
            name: 'voice-command.m4a',
            type: 'audio/m4a',
          } as any);

          const result = await apiUpload<{ transcript?: string }>('/api/voice/transcribe', formData);

          setTranscript(result?.transcript || '');
        } catch (error: any) {
          Alert.alert('Transcription unavailable', error?.message || 'We could not transcribe that recording.');
        } finally {
          setIsTranscribing(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      console.error(error);
    }
  };

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const processCommand = async () => {
    if (!transcript.trim()) {
      Alert.alert('No command', 'Please enter a command');
      return;
    }

    setIsProcessing(true);
    
    try {
      await apiRequest('/api/voice/process', {
        method: 'POST',
        body: { transcript },
      });
      if (onCommand) {
        onCommand(transcript);
      }
      setIsModalVisible(false);
      setTranscript('');
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonRecording]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isRecording ? 'stop' : 'mic'}
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Voice command</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your command..."
              value={transcript}
              onChangeText={setTranscript}
              multiline
              numberOfLines={3}
              placeholderTextColor={COLORS.textMuted}
            />
            {isTranscribing ? (
              <Text style={styles.helperText}>Transcribing your recording...</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={processCommand}
                disabled={isProcessing || isTranscribing}
              >
                <Text style={styles.modalButtonText}>
                  {isProcessing ? 'Processing...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: SPACING.xl + 20,
    left: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
    shadowColor: COLORS.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  helperText: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});
