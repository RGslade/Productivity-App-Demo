import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

async function checkAndRequestAndroidPermissions() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (!granted) {
            const requestResult = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );

            if (requestResult === PermissionsAndroid.RESULTS.GRANTED) {
            } else if (requestResult === PermissionsAndroid.RESULTS.DENIED) {
            } else if (requestResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                function openAppSettings() {
                    if (Platform.OS === 'android') {
                        Linking.openSettings().catch(() => {
                            Alert.alert('Error', 'Unable to open app settings.');
                        });
                    }
                }
            }
        }
    } else {
    }
}

export default checkAndRequestAndroidPermissions;
