import React, { useMemo, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useThemeColour } from '@/hooks/useThemeColour';

//
export type LegalDocumentKey = 'terms' | 'privacy' | 'lifenest';

//
type ExternalLegalDocument = {
  key: LegalDocumentKey;
  shortTitle: string;
  fallbackVersion: string;
  url: string;
};

//
type LegalAcceptanceModalProps = {
  visible: boolean;
  loading?: boolean;
  versions: Record<LegalDocumentKey, string>;
  onAccept: () => Promise<void> | void;
};

//
const REQUIRED_ACCEPTANCE_LINKS: ExternalLegalDocument[] = [
  {
    key: 'terms',
    shortTitle: 'Terms of Service',
    fallbackVersion: 'v1',
    url: 'https://www.example.com/terms-of-service',
  },
  {
    key: 'privacy',
    shortTitle: 'Privacy Policy',
    fallbackVersion: 'v1',
    url: 'https://www.example.com/privacy-policy',
  },
  {
    key: 'lifenest',
    shortTitle: 'LifeNest Terms',
    fallbackVersion: 'v1',
    url: 'https://www.example.com/terms-of-service',
  },
];

/** Collects mandatory legal confirmations after authentication without returning users to onboarding. */
//
export function LegalAcceptanceModal({ visible, loading = false, versions, onAccept }: LegalAcceptanceModalProps) {
  //
  const [accepted, setAccepted] = useState<Record<LegalDocumentKey, boolean>>({
    terms: false,
    privacy: false,
    lifenest: false,
  });
  //
  const linkColor = useThemeColour({}, 'primary');
  //
  const canContinue = useMemo(() => REQUIRED_ACCEPTANCE_LINKS.every((document) => accepted[document.key]), [accepted]);

  //
  const openDocument = async (url: string) => {
    await Linking.openURL(url);
  };

  //
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Card style={styles.modalCard}>
          <ThemedText type="subtitle" style={styles.title}>Before you continue</ThemedText>
          <ThemedText style={styles.description}>
            Please open and read each document, then tick the boxes to confirm you agree to the latest versions.
          </ThemedText>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.documentList}>
            {REQUIRED_ACCEPTANCE_LINKS.map((document) => (
              <View key={document.key} style={styles.documentRow}>
                <Switch
                  label={`I have read and agree to the ${document.shortTitle}`}
                  description={`Version ${versions[document.key] || document.fallbackVersion}`}
                  value={accepted[document.key]}
                  onValueChange={(value) => setAccepted((current) => ({ ...current, [document.key]: value }))}
                />
                <TouchableOpacity onPress={() => openDocument(document.url)} style={styles.linkButton}>
                  <ThemedText style={[styles.linkText, { color: linkColor }]}>Open {document.shortTitle}</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <Button
            title={loading ? 'Saving...' : 'Continue'}
            onPress={onAccept}
            loading={loading}
            disabled={!canContinue || loading}
            fullWidth
          />
        </Card>
      </View>
    </Modal>
  );
}

//
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(5, 9, 20, 0.72)',
  },
  modalCard: {
    maxHeight: '86%',
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.78,
  },
  scroll: {
    maxHeight: 380,
  },
  documentList: {
    gap: 14,
  },
  documentRow: {
    gap: 6,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
