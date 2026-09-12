import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PublicAd, PublicFooter, PublicHeader } from '@/components/PublicSite';

export default function AboutPage() {
  return <ThemedView style={styles.page} lightColour="#F2EFE7" darkColour="#171613">
    <ScrollView contentContainerStyle={styles.content}>
      <PublicHeader />
      <View style={styles.article}>
        <ThemedText type="eyebrow">About the product</ThemedText>
        <ThemedText type="displaySmall">A practical companion for a more independent life.</ThemedText>
        <ThemedText style={styles.body}>Productivity App is made for young adults who are preparing for a move, managing new responsibilities, or simply trying to feel more organised.</ThemedText>
        <ThemedText type="subtitle">What we are trying to solve</ThemedText>
        <ThemedText style={styles.body}>Advice about independent living is often scattered across government websites, personal finance tools, notes apps, and generic productivity products. Productivity App brings the planning layer together while keeping the user in control of their own data and decisions.</ThemedText>
        <ThemedText type="subtitle">What you will find</ThemedText>
        <ThemedText style={styles.body}>The app includes budgeting, tasks and checklists, notes, education tracking, curated help resources, regional links, a news reader, and LifeNest planning guidance. Features are designed to be useful on their own; an account is needed only for private data and synchronisation.</ThemedText>
        <ThemedText style={styles.body}>LifeNest is not a professional adviser. It should not replace financial, legal, medical, housing, benefits, mental-health, safeguarding, or emergency support. The app points users towards qualified and official sources when a situation needs more than general planning help.</ThemedText>
        <PublicAd />
      </View>
      <PublicFooter />
    </ScrollView>
  </ThemedView>;
}

const styles = StyleSheet.create({ page: { flex: 1 }, content: { paddingBottom: 40 }, article: { width: '86%', maxWidth: 760, alignSelf: 'center', paddingVertical: 56, gap: 18 }, body: { fontSize: 16, lineHeight: 27, opacity: 0.84 } });



