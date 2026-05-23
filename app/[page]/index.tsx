import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

//Handles the page missing screen.
export default function NotFoundScreen() {
    const { page } = useLocalSearchParams(); // Get the dynamic parameter

    return (
        <>
            <ThemedView style={styles.container}>
                <ThemedText type="title">This screen does not exist.</ThemedText>
                <ThemedText type="subtitle">You tried to access: {page}</ThemedText>
                <Link href="/" style={styles.link}>
                    <ThemedText type="link">Go to home screen!</ThemedText>
                </Link>
            </ThemedView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
});
