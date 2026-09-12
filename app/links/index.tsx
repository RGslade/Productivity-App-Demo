import { Redirect, useLocalSearchParams } from 'expo-router';

/** Redirects the retired Links list into the merged Help hub. */
export default function LinksRedirectScreen() {
  const params = useLocalSearchParams<{ add?: string }>();

  return <Redirect href={{ pathname: '/help', params: params.add ? { add: params.add } : undefined } as any} />;
}
