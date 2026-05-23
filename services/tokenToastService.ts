import { Alert, Platform, ToastAndroid } from 'react-native';

/** Shows consistent feedback when LifeNest tokens are consumed. */
//
export function showTokenUsageToast(tokensUsed: number) {
  //
  const message = `${tokensUsed} ${tokensUsed === 1 ? 'Token' : 'Tokens'} used`;
  //
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert('Tokens used', message);
}
