import { ThemedText } from './ThemedText';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';
import { ChatMessage } from '@/types/chatBot';

export const renderMessageWithBold = (message: ChatMessage, additionalStyles: StyleProp<TextStyle>) => {
  const isAI = !message.is_user_message;
  const styles = StyleSheet.create({
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      color: !isAI ? '#FFFFFF' : '#000000',
    },
    boldText: {
      fontWeight: 'bold',
    },
  });

  if (!isAI) {
    return (
      <ThemedText style={styles.messageText}>
        {message.message}
      </ThemedText>
    );
  }

  const parts = message.message.split(/(\*\*.*?\*\*)/g);

  return (
    <ThemedText style={[styles.messageText, additionalStyles]}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <ThemedText key={index} style={styles.boldText}>
              {boldText}
            </ThemedText>
          );
        }
        return <ThemedText key={index}>{part}</ThemedText>;
      })}
    </ThemedText>
  );
};
