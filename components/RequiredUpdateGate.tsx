import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { showAlert } from '@/hooks/dataHandler';

type RequiredUpdateGateProps = {
  currentVersion: string;
  minimumVersion: string | null;
  storeUrl: string | null;
};

/** Renders a blocking update screen when minimum supported app version is not met. */
export default function RequiredUpdateGate({ currentVersion, minimumVersion, storeUrl }: RequiredUpdateGateProps) {
  const handleOpenStore = async () => {
    if (!storeUrl) {
      showAlert('Update link missing', 'Store URL is not configured yet. Please contact support.');
      return;
    }

    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      console.error('RequiredUpdateGate.handleOpenStore', error);
      showAlert('Unable to open store', 'Please try again in a moment.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content} lightColour="transparent" darkColour="transparent">
        <ThemedText type="title" style={styles.title}>Update required</ThemedText>
        <ThemedText style={styles.body}>
          You must update Productivity App to continue using the app.
        </ThemedText>
        <ThemedText style={styles.meta}>Current version: {currentVersion}</ThemedText>
        <ThemedText style={styles.meta}>Minimum required: {minimumVersion || 'Not set'}</ThemedText>
        <Button analyticsId="components_requiredupdategate_update_now" title="Update now" onPress={handleOpenStore} fullWidth style={styles.button} />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    opacity: 0.85,
  },
  button: {
    marginTop: 8,
  },
});
