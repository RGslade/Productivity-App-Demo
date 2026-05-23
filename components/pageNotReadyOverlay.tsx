import { KeyboardAvoidingView, Modal, Platform, View, StyleSheet } from 'react-native';
import { ThemedView } from './ThemedView';
import { Button, Card } from './ui';
import { ThemedText } from './ThemedText';
import { router } from 'expo-router';

//
interface PageNotReadyOverlayProps {
    onClose: () => void;
    animationType?: 'none' | 'slide' | 'fade';
    pageName?: string;
}
//
export default function PageNotReadyOverlay({ onClose, animationType = 'none', pageName = 'none' }: PageNotReadyOverlayProps) {
    //
    const isLoading = false;
    //
    return (
        <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ThemedView style={styles.container}>
                <Modal visible={true} animationType={animationType} transparent onRequestClose={onClose} >
                    <View style={styles.overlay}>
                        <Card style={styles.overlayCard}>
                            <ThemedView style={styles.header}>
                                <ThemedText type="subtitle" style={styles.title}>
                                    Page not available
                                </ThemedText>
                                <Button title="Close" size="small" onPress={onClose} />
                            </ThemedView>
                            <ThemedView style={styles.description}>
                                <ThemedText type="default" style={styles.descriptionText}>
                                    We&lsquo;re working hard to bring you this feature. In the meantime, check out the button below to see what&lsquo;s happening with the page!
                                </ThemedText>
                            </ThemedView>
                            <Button title="Page Status" variant="secondary" size="small" onPress={() => router.navigate(`https://www.ProductivityMobileApp.co.uk/pagesstatus/${pageName}`)} style={styles.statusButton} disabled={isLoading} />
                        </Card>
                    </View>
                </Modal>
            </ThemedView>
        </KeyboardAvoidingView>
    );
}

//
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardContainer: {
        flex: 1,
    },
    // History / burger button
    statusButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 4,
    },

    // ===== History Modal =====
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    overlayCard: {
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    description: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
    },
});
