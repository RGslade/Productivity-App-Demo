import { Redirect, Link } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { PublicFooter, PublicHeader, PublicAd } from '@/components/PublicSite';

export default function Index() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  if (Platform.OS !== 'web') return <Redirect href="/(auth)/login" />;

  return (
    <ThemedView style={styles.page} lightColour="#F2EFE7" darkColour="#171613">
      <ScrollView contentContainerStyle={styles.content}>
        <PublicHeader />
        <View style={styles.hero}>
          <ThemedText type="eyebrow">A calmer way to prepare</ThemedText>
          <ThemedText type="display">Practical support for leaving home with confidence.</ThemedText>
          <ThemedText style={styles.lede}>
            Productivity Mobile App brings everyday planning into one thoughtful place: understand your money, organise responsibilities, keep useful notes, and find trustworthy starting points for the next stage of independent life.
          </ThemedText>
          <View style={styles.actions}>
            <Link href="/(auth)/register" style={styles.primaryLink}>Create your free account</Link>
            <Link href="/(auth)/login" style={styles.secondaryLink}>Sign in</Link>
          </View>
        </View>
        <PublicAd />
        <View style={styles.section}>
          <ThemedText type="subtitle">Designed for the decisions that add up</ThemedText>
          <ThemedText style={styles.body}>
            Independent living is rarely one big decision. It is a collection of small tasks: checking what comes in and goes out, remembering deadlines, finding the right public service, preparing for education or work, and making a plan when things feel unclear. Productivity Mobile App gives those tasks a clear home so progress is easier to see and easier to continue.
          </ThemedText>
          <View style={styles.grid}>
            {[
              ['Money, without the fog', 'Record income and spending, review your monthly balance, and build a clearer picture of what is affordable.'],
              ['A nest that reflects real life', 'Turn responsibilities into checklists, notes, and reminders that fit your current priorities.'],
              ['Helpful starting points', 'Explore curated guides and regional links for government, housing, work, education, health, and wellbeing.'],
              ['Guidance with boundaries', 'LifeNest can help you think through a plan, while clearly reminding you when qualified or emergency support is needed.'],
            ].map(([title, text]) => (
              <View key={title} style={styles.feature}>
                <ThemedText type="defaultSemiBold">{title}</ThemedText>
                <ThemedText style={styles.featureText}>{text}</ThemedText>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.section, styles.callout]}>
          <ThemedText type="subtitle">Start with one useful next step</ThemedText>
          <ThemedText style={styles.body}>
            You do not need to have everything worked out before you begin. Use the public resources to get oriented, then create an account when you are ready to keep your own plans and progress together.
          </ThemedText>
          <Link href="/resources" style={styles.textLink}>Read the independent-living guide Ã¢â€ â€™</Link>
        </View>
        <PublicFooter />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 40 },
  hero: { width: '86%', maxWidth: 980, alignSelf: 'center', paddingVertical: 72 },
  lede: { maxWidth: 720, fontSize: 18, lineHeight: 29, marginTop: 20, opacity: 0.82 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 30 },
  primaryLink: { backgroundColor: '#C05F3C', color: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 8, fontWeight: '700' },
  secondaryLink: { borderWidth: 1, borderColor: '#C05F3C', color: '#C05F3C', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 8, fontWeight: '700' },
  section: { width: '86%', maxWidth: 980, alignSelf: 'center', paddingVertical: 38 },
  body: { maxWidth: 760, fontSize: 16, lineHeight: 26, marginTop: 12, opacity: 0.84 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 24 },
  feature: { flex: 1, minWidth: 220, padding: 20, borderWidth: 1, borderColor: 'rgba(30,28,25,0.12)', borderRadius: 12 },
  featureText: { marginTop: 8, lineHeight: 23, opacity: 0.78 },
  callout: { backgroundColor: '#EBE7DD', borderRadius: 16, paddingHorizontal: 24, marginTop: 20 },
  textLink: { color: '#C05F3C', fontWeight: '700', marginTop: 18 },
});
