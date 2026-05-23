import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { documentService } from '@/services/documentService';
import type { Document } from '@/types/document';
import { useThemeColour } from '@/hooks/useThemeColour';
import { showGlobalInterstitialAd } from '@/components/AdDisplay';
import { useSubscriptions } from '@/hooks/useSubscriptions';

//
export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const backgroundColour = useThemeColour({}, 'background');
  const { isAdFree } = useSubscriptions();

  //Load the documents when the screen loads.
  useEffect(() => {
    loadDocuments();
  }, []);

  //Show the interstatial ad when entering the screen unless the user has paid for no ads.
  useEffect(() => {
    return () => {
      if (!isAdFree) {
        showGlobalInterstitialAd();
      }
    };
  }, [isAdFree]);

  //Use the document service method to load the documents.
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentService.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  //Handle download of all documents when user presses button.
  const handleDownloadAll = async () => {
    Alert.alert('Download All Documents', 'This will download all available documents to your device. Continue?',
      [{ text: 'Cancel', style: 'cancel' }, {text: 'Download', onPress: async () => {
            setDownloadingAll(true);
            try {
              let successCount = 0;
              let errorCount = 0;
              //For each document, attempt to download it and count any errors and successes.
              for (const document of documents) {
                try {
                  await documentService.downloadDocument(document.id);
                  successCount++;
                } catch (error) {
                  console.error(`Error downloading ${document.file_name}:`, error);
                  errorCount++;
                }
              }

              if (errorCount === 0) {
                Alert.alert('Success', `All ${successCount} documents downloaded successfully!`);
              } else {
                Alert.alert('Partial Success', `${successCount} documents downloaded successfully. ${errorCount} failed to download.`);
              }
            } catch (error) {
              console.error('Error downloading documents:', error);
            } finally {
              setDownloadingAll(false);
            }
          }
        }
      ]
    );
  };

  //Handle the chosen action of the document that the user picks.
  const handleDocumentAction = async (document: Document, action: 'open' | 'download') => {
    try {
      switch (action) {
        case 'open':
          router.push(`/documents/viewer/${document.id}`);
          break;
        case 'download':
          await documentService.downloadDocument(document.id);
          Alert.alert('Success', `${document.file_name} downloaded successfully!`);
          break;
      }
    } catch (error) {
      console.error(`Error ${action}ing document:`, error);
    }
  };

  //Handle loading state.
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <LoadingSpinner />
          <ThemedText style={styles.loadingText}>Loading documents...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <ThemedView style={styles.content} lightColour={backgroundColour} darkColour={backgroundColour}>
          <ThemedView style={styles.header} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Access your important life guides and documents
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.actionSection} lightColour={backgroundColour} darkColour={backgroundColour}>
            {downloadingAll ? (
              <ThemedView style={styles.downloadingContainer}>
                <LoadingSpinner />
                <ThemedText style={styles.downloadingText}>Downloading all documents...</ThemedText>
              </ThemedView>
            ) : (
              <Button
                title="Download All Documents"
                variant="primary"
                onPress={handleDownloadAll}
                disabled={documents.length === 0}
                style={styles.downloadAllButton}
              />
            )}
          </ThemedView>

          {documents.length === 0 ? (
            <ThemedView style={styles.emptyCard} lightColour={backgroundColour} darkColour={backgroundColour}>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Documents Available
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                Documents will appear here when they become available. Check back later or contact support if you need assistance.
              </ThemedText>
              <Button title="Refresh" variant="secondary" onPress={loadDocuments} style={styles.refreshButton} />
            </ThemedView>
          ) : (
            <ThemedView style={styles.documentsGrid} lightColour={backgroundColour} darkColour={backgroundColour}>
              {documents.map((document) => (
                <Card key={document.id} style={styles.documentCard}>
                  <ThemedView style={styles.documentHeader}>
                    <ThemedText style={styles.documentIcon}>
                      {documentService.getFileIcon(document.file_name)}
                    </ThemedText>
                    <ThemedView style={styles.documentInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.documentName}>
                        {document.title}
                      </ThemedText>
                      <ThemedText style={styles.documentFileName}>
                        {document.file_name}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>

                  {!!document.description && (
                    <ThemedText style={styles.documentDescription} numberOfLines={2} ellipsizeMode="tail">
                      {document.description}
                    </ThemedText>
                  )}

                  <ThemedView style={styles.documentActions}>
                    <Button title="Open" variant="primary" size="small" onPress={() => handleDocumentAction(document, 'open')}
                      style={styles.actionButton} />
                    <Button title="Download" variant="secondary" size="small" onPress={() => handleDocumentAction(document, 'download')}
                      style={styles.actionButton}/>
                  </ThemedView>

                  <ThemedText style={styles.lastModified}>
                    Created: {new Date(document.created_at).toLocaleDateString()}
                  </ThemedText>
                </Card>
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    padding: 10,
  },
  header: {
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  actionSection: {
    marginBottom: 10,
  },
  downloadAllButton: {
    alignSelf: 'center',
    minWidth: 200,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  downloadingText: {
    marginLeft: 12,
    fontSize: 16,
  },
  documentsGrid: {
    gap: 5,
  },
  documentCard: {
    padding: 5,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  documentIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    marginBottom: 4,
  },
  documentFileName: {
    fontSize: 14,
    opacity: 0.7,
  },
  documentDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 10,
    lineHeight: 20,
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
  },
  lastModified: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  refreshButton: {
    minWidth: 120,
  },
});