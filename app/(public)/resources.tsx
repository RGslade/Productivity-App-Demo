import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PublicAd, PublicFooter, PublicHeader } from '@/components/PublicSite';

export default function ResourcesPage() {
  return (
    <ThemedView style={styles.page} lightColour="#F2EFE7" darkColour="#171613">
      <ScrollView contentContainerStyle={styles.content}>
        <PublicHeader />
        <View style={styles.article}>
          <ThemedText type="eyebrow">Independent-living resources</ThemedText>
          <ThemedText type="displaySmall">A simple starting point when everything feels like a lot.</ThemedText>
          <ThemedText style={styles.body}>Preparing for independent living is easier when you separate the problem into small, visible decisions. Start with what is most immediate, write down what you already know, and use official information for anything involving money, housing, benefits, health, or legal rights.</ThemedText>
          <ThemedText type="subtitle">1. Get a clear monthly picture</ThemedText>
          <ThemedText style={styles.body}>List reliable income first, then fixed commitments such as rent, utilities, transport, subscriptions, and debt repayments. Give flexible spending its own realistic allowance. The goal is not a perfect forecast; it is knowing which costs are unavoidable and which choices you can change.</ThemedText>
          <ThemedText type="subtitle">2. Turn uncertainty into questions</ThemedText>
          <ThemedText style={styles.body}>If you are moving, ask what documents, deposits, references, and recurring bills you will need. If you are looking for work or education, record deadlines and the next action for each application. A question written down is easier to research or take to a trusted person.</ThemedText>
          <ThemedText type="subtitle">3. Use the right source for the right decision</ThemedText>
          <ThemedText style={styles.body}>For benefits, housing rules, consumer rights, and public services, begin with the relevant government or recognised organisation. Community resources can help you understand an experience, but they should not replace current official guidance. Productivity App&apos;s Help area groups useful starting points by topic and region.</ThemedText>
          <ThemedText type="subtitle">4. Build a small weekly reset</ThemedText>
          <ThemedText style={styles.body}>Choose a regular time to review upcoming tasks, check your balance, update notes, and decide the next three actions that matter. Small reviews prevent deadlines and bills from becoming emergencies. If you miss a week, simply restart with the next useful action.</ThemedText>
          <ThemedText type="subtitle">A note about LifeNest</ThemedText>
          <ThemedText style={styles.body}>LifeNest can help organise thoughts and suggest planning questions, but its responses can be incomplete or wrong. Do not use it for emergencies or as a substitute for qualified professional advice. When the stakes are high, contact an appropriate official service or professional.</ThemedText>
          <PublicAd />
          <Link href="/about" style={styles.link}>Learn how Productivity App is made Ã¢â€ â€™</Link>
        </View>
        <PublicFooter />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 40 },
  article: { width: '86%', maxWidth: 760, alignSelf: 'center', paddingVertical: 56, gap: 18 },
  body: { fontSize: 16, lineHeight: 27, opacity: 0.84 },
  link: { color: '#C05F3C', fontWeight: '700', marginTop: 6 },
});



