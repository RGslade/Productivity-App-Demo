import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { REQUIRED_LEGAL_DOCUMENTS } from '@/constants/LegalDocuments';
import type { LegalDocumentKey } from '@/constants/LegalDocuments';
import { useThemeColour } from '@/hooks/useThemeColour';

type LegalAcceptanceModalProps = {
  visible: boolean;
  loading?: boolean;
  versions: Record<LegalDocumentKey, string>;
  onAccept: (viewedAt: Record<LegalDocumentKey, string | null>) => Promise<void> | void;
};

/** Collects mandatory legal confirmations after authentication without returning users to onboarding. */
export function LegalAcceptanceModal({ visible, loading = false, versions, onAccept }: LegalAcceptanceModalProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState<Record<LegalDocumentKey, boolean>>({
    terms: false,
    privacy: false,
    lifenest: false,
  });
  const [viewedAt, setViewedAt] = useState<Record<LegalDocumentKey, string | null>>({
    terms: null,
    privacy: null,
    lifenest: null,
  });
  const linkColor = useThemeColour({}, 'primary');
  const canContinue = useMemo(
    () => REQUIRED_LEGAL_DOCUMENTS.every((document) => Boolean(viewedAt[document.key]) && accepted[document.key]),
    [accepted, viewedAt]
  );

  const openDocument = (key: LegalDocumentKey, route: `/legal/${LegalDocumentKey}`) => {
    setViewedAt((current) => ({
      ...current,
      [key]: current[key] ?? new Date().toISOString(),
    }));
    router.push(route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Card style={styles.modalCard}>
          <ThemedText type="subtitle" style={styles.title}>Before you continue</ThemedText>
          <ThemedText style={styles.description}>
            Please open and read each document, then tick the boxes to confirm you agree to the latest versions.
          </ThemedText>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.documentList}>
            {REQUIRED_LEGAL_DOCUMENTS.map((document) => (
              <View key={document.key} style={styles.documentRow}>
                <Switch
                  label={`I have read and agree to the ${document.shortTitle}`}
                  description={`Version ${versions[document.key] || document.version}${viewedAt[document.key] ? '' : ' - open this document first'}`}
                  value={accepted[document.key]}
                  disabled={!viewedAt[document.key]}
                  onValueChange={(value) => setAccepted((current) => ({ ...current, [document.key]: value }))}
                />
                <TouchableOpacity analyticsId="components_legalacceptancemodal_link_button" analyticsControlType="link" onPress={() => openDocument(document.key, document.route)} style={styles.linkButton}>
                  <ThemedText style={[styles.linkText, { color: linkColor }]}>Open {document.shortTitle}</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <Button analyticsId="components_legalacceptancemodal_on_accept"
            title={loading ? 'Saving...' : 'Continue'}
            onPress={() => onAccept(viewedAt)}
            loading={loading}
            disabled={!canContinue || loading}
            fullWidth
          />
        </Card>
      </View>
    </Modal>
  );
}

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
