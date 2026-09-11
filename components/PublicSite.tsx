import React from 'react';
import { Link } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import AdDisplay from '@/components/AdDisplay';

export function PublicHeader() {
  return <View style={styles.header}>
    <Link href="/" style={styles.brand}>Productivity Mobile App</Link>
    <View style={styles.nav}>
      <Link href="/resources" style={styles.navLink}>Resources</Link>
      <Link href="/about" style={styles.navLink}>About</Link>
      <Link href="/contact" style={styles.navLink}>Contact</Link>
    </View>
  </View>;
}

export function PublicFooter() {
  return <View style={styles.footer}>
    <ThemedText style={styles.footerCopy}>Productivity Mobile App is a personal portfolio project.</ThemedText>
    <View style={styles.footerLinks}>
      <Link href="/legal/privacy" style={styles.footerLink}>Privacy Policy</Link>
      <Link href="/legal/terms" style={styles.footerLink}>Terms of Service</Link>
      <Link href="/contact" style={styles.footerLink}>Contact</Link>
    </View>
  </View>;
}

export function PublicAd() {
  return Platform.OS === 'web' ? <View style={styles.ad}><AdDisplay /></View> : null;
}

const styles = StyleSheet.create({
  header: { width: '86%', maxWidth: 980, alignSelf: 'center', minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(30,28,25,0.12)' },
  brand: { color: '#1E1C19', fontSize: 20, fontWeight: '800' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  navLink: { color: '#6B665E', fontWeight: '700', paddingVertical: 10 },
  ad: { width: '86%', maxWidth: 980, alignSelf: 'center', marginBottom: 18 },
  footer: { width: '86%', maxWidth: 980, alignSelf: 'center', borderTopWidth: 1, borderTopColor: 'rgba(30,28,25,0.12)', paddingTop: 24, marginTop: 36, gap: 12 },
  footerCopy: { fontSize: 13, opacity: 0.7 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  footerLink: { color: '#C05F3C', fontSize: 13, fontWeight: '700' },
});
