import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { documentService } from '@/services/documentService';
import type { Document } from '@/types/document';
import { useThemeColour } from '@/hooks/useThemeColour';

//
export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = id ? parseInt(id) : 0;
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [error, setError] = useState<string>('');
  const backgroundColour = useThemeColour({}, 'background');

  //Load the document by the id from the parameters.
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError('');
        const doc = await documentService.getDocument(documentId);

        if (!doc || !doc.content) {
          setError('Document with content not found');
          return;
        }

        setDocument(doc);
      } catch (error) {
        console.error('Error loading document:', error);
        setError('Failed to load document. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      loadDocument();
    }
  }, [documentId, id]);

  //Handles the download button press.
  const handleDownload = async () => {
    if (!documentId || !document) return;

    setDownloading(true);
    try {
      //Calls the method to handle backend of the download.
      await documentService.downloadDocument(documentId);
      Alert.alert('Success', `${document.file_name} downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setDownloading(false);
    }
  };

  //Handles font size adjustment.
  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.max(12, Math.min(24, prev + delta)));
  };

  //Handles checking of if PDF.
  const isPDFDocument = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  //renders the view if error or no document.
  if (error || !document) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="title" style={styles.errorTitle}>
          Document Unavailable
        </ThemedText>
        <ThemedText style={styles.errorText}>
          {error || 'Document not found'}
        </ThemedText>
        <Button title="Go Back" variant="primary" onPress={() => router.back()} style={styles.errorButton} />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content} lightColour={backgroundColour} darkColour={backgroundColour}>
        {/* Document Header */}
        <Card style={styles.headerCard}>
          <ThemedView style={styles.documentHeader}>
            <ThemedText style={styles.documentIcon}>
              {documentService.getFileIcon(document.file_name)}
            </ThemedText>
            <ThemedView style={styles.documentInfo}>
              <ThemedText type="subtitle" style={styles.documentName}>
                {document.title}
              </ThemedText>
              <ThemedText style={styles.documentFileName}>
                {document.file_name}
              </ThemedText>
              {!!document.description && (
                <ThemedText style={styles.documentDescription}>
                  {document.description}
                </ThemedText>
              )}
            </ThemedView>
          </ThemedView>

          {/* Controls */}
          <ThemedView style={styles.controls}>
            <ThemedView style={styles.fontControls}>
              <Button title="A-" variant="secondary" size="small" onPress={() => adjustFontSize(-2)} style={styles.fontButton} />
              <ThemedText style={styles.fontSizeText}>
                {fontSize}px
              </ThemedText>
              <Button title="A+" variant="secondary" size="small" onPress={() => adjustFontSize(2)} style={styles.fontButton} />
            </ThemedView>

            {downloading ? (
              <ThemedView style={styles.downloadingContainer}>
                <LoadingSpinner />
              </ThemedView>
            ) : (
              <Button title="Download" variant="primary" size="small" onPress={handleDownload} style={styles.downloadButton} />
            )}
          </ThemedView>
        </Card>

        {/* Document Content */}
        <Card style={styles.contentCard}>
          {isPDFDocument(document.file_name) ? (
            <ThemedView style={styles.pdfContainer}>
              <ThemedText style={styles.pdfIcon}>📄</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.pdfTitle}>
                PDF Document
              </ThemedText>
              <ThemedText style={styles.pdfText}>
                This is a PDF document. For the best viewing experience, please download the file and open it with a PDF viewer app.
              </ThemedText>
              <Button title="Download PDF" variant="primary" onPress={handleDownload} style={styles.pdfDownloadButton}
                disabled={downloading}/>
            </ThemedView>
          ) : (<ThemedView style={styles.documentContentContainer}>
            <ThemedText style={[styles.documentContent, { fontSize }]}>
              {document.content}
            </ThemedText>
          </ThemedView>
          )}
        </Card>

        {/* Document Metadata */}
        <Card style={styles.metadataCard}>
          <ThemedText type="defaultSemiBold" style={styles.metadataTitle}>
            Document Information
          </ThemedText>

          <ThemedView style={styles.metadataGrid}>
            <ThemedView style={styles.metadataItem}>
              <ThemedText style={styles.metadataLabel}>Created:</ThemedText>
              <ThemedText style={styles.metadataValue}>
                {new Date(document.created_at).toLocaleDateString()}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.metadataItem}>
              <ThemedText style={styles.metadataLabel}>File Type:</ThemedText>
              <ThemedText style={styles.metadataValue}>
                {documentService.getFileExtension(document.file_name).toUpperCase()}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </Card>

        {/* Actions */}
        <ThemedView style={styles.actionsContainer} lightColour={backgroundColour} darkColour={backgroundColour}>
          <Button title="Back to Documents" variant="secondary" onPress={() => router.back()} style={styles.backButton} />
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorButton: {
    minWidth: 120,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    padding: 16,
    marginBottom: 16,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  documentIcon: {
    fontSize: 32,
    marginRight: 16,
    marginTop: 4,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 20,
    marginBottom: 4,
  },
  documentFileName: {
    fontSize: 14,
    opacity: 0.7,
  },
  documentDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 8,
    lineHeight: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontButton: {
    minWidth: 40,
  },
  fontSizeText: {
    fontSize: 14,
    minWidth: 40,
    textAlign: 'center',
  },
  downloadingContainer: {
    padding: 8,
  },
  downloadButton: {
    minWidth: 100,
  },
  contentCard: {
    padding: 0,
    marginBottom: 16,
    minHeight: 400,
  },
  documentContentContainer: {
    padding: 20,
  },
  documentContent: {
    lineHeight: 24,
    textAlign: 'left',
  },
  pdfContainer: {
    padding: 40,
    alignItems: 'center',
    minHeight: 300,
    justifyContent: 'center',
  },
  pdfIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  pdfTitle: {
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  pdfText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  pdfDownloadButton: {
    minWidth: 150,
  },
  metadataCard: {
    padding: 16,
    marginBottom: 16,
  },
  metadataTitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  metadataGrid: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metadataLabel: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    paddingTop: 8,
  },
  backButton: {
    alignSelf: 'center',
    minWidth: 150,
  },
});