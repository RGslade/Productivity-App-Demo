import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "react-native";

//Render donate page, which is just simple flat information.
export default function DonatePage() {
    return (
        <ThemedView>
            <ThemedText>Support Productivity App</ThemedText>
            <ThemedText>
                Thank you for considering a donation! Please visit our website to make a contribution and support our mission to help young adults.
            </ThemedText>
            <Button title="Donate" onPress={() => {}} />
        </ThemedView>
    );
}
