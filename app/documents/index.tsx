import { Redirect } from 'expo-router';

/** Redirects the retired Documents list into the merged Help hub. */
export default function DocumentsRedirectScreen() {
  return <Redirect href="/help/index" />;
}
