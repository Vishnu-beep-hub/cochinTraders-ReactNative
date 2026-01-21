import { Text, useThemeColor } from '@/components/Themed';
import React from 'react';
import { View as DefaultView, Modal, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  visible: boolean;
  status?: number | string | null;
  onClose?: () => void;
  onRetry?: () => void;
};

export default function ErrorModal({ visible, status, onClose, onRetry }: Props) {
  const cardBg = useThemeColor({}, 'card');
  const buttonPrimary = useThemeColor({}, 'buttonPrimary');
  const textColor = useThemeColor({}, 'text');

  const statusText = typeof status === 'number' ? String(status) : (status || 'Unknown');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <DefaultView style={styles.overlay}>
        <DefaultView style={[styles.content, { backgroundColor: cardBg }]}>
          <Text style={styles.title}>Error: {statusText}</Text>
          <Text style={[styles.message, { color: textColor }]}>
            Please open Cochin Connect server for connecting to apis. if issue persists, please contact programer or enginear
          </Text>
          {onRetry ? (
            <TouchableOpacity style={[styles.button, { backgroundColor: buttonPrimary, marginBottom: 8 }]} onPress={onRetry}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.button, { backgroundColor: buttonPrimary }]} onPress={onClose}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </DefaultView>
      </DefaultView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  content: { paddingHorizontal: 30, paddingVertical: 40, borderRadius: 16, alignItems: 'center', elevation: 10 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 10, color: '#c62828' },
  message: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
  button: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
})
