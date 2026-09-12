import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PublicFooter, PublicHeader } from '@/components/PublicSite';
import { PROJECT_OWNER_NAME, PROJECT_SUPPORT_EMAIL, PROJECT_WEBSITE } from '@/constants/ProjectInfo';

export default function ContactPage() {
  return <ThemedView style={styles.page} lightColour="#F2EFE7" darkColour="#171613">
    <ScrollView contentContainerStyle={styles.content}>
      <PublicHeader />
      <View style={styles.article}>
        <ThemedText type="eyebrow">Contact</ThemedText>
        <ThemedText type="displaySmall">Questions, feedback, or support?</ThemedText>
        <ThemedText style={styles.body}>Productivity App is a personal portfolio project maintained by {PROJECT_OWNER_NAME}. For account, privacy, accessibility, billing, or product questions, email with enough detail for the issue to be understood. Please do not send passwords or sensitive financial information by email.</ThemedText>
        <ThemedText type="subtitle">Support email</ThemedText>
        <ThemedText style={styles.body}>{PROJECT_SUPPORT_EMAIL}</ThemedText>
        <ThemedText type="subtitle">Portfolio website</ThemedText>
        <ThemedText style={styles.body}>{PROJECT_WEBSITE}</ThemedText>
        <ThemedText style={styles.body}>We aim to respond within 24–48 hours. For urgent safety, medical, or emergency situations, contact the relevant emergency service or qualified organisation in your area.</ThemedText>
        <Link href="/legal/privacy" style={styles.link}>Read our Privacy Policy †</Link>
      </View>
      <PublicFooter />
    </ScrollView>
  </ThemedView>;
}

const styles = StyleSheet.create({ page: { flex: 1 }, content: { paddingBottom: 40 }, article: { width: '86%', maxWidth: 760, alignSelf: 'center', paddingVertical: 56, gap: 18 }, body: { fontSize: 16, lineHeight: 27, opacity: 0.84 }, link: { color: '#C05F3C', fontWeight: '700' } });


