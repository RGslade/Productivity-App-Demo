import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { renderMessageWithBold } from '@/components/StringFormatter';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  calculateLifeNestTokensForMessage,
  LIFENEST_MAX_INPUT_CHARACTERS,
  LIFENEST_USAGE_WARNING_RATIO,
} from '@/constants/lifeNestUsage';
import { useAuth } from '@/hooks/useAuth';
import { useLifeNestTermsVersion } from '@/hooks/useSettings';
import { lifeNestService } from '@/services/lifeNestService';
import { settingsService } from '@/services/settingsService';
import { userService } from '@/services/userService';
import { showTokenUsageToast } from '@/services/tokenToastService';
import { useThemeColour } from '@/hooks/useThemeColour';
import {
  ChatFeedbackReportRequest,
  ChatMessage,
  Conversation,
  LifeNestMonthlyUsageSummary,
  SendMessageRequest,
} from '@/types/chatBot';

const SAMPLE_QUESTIONS = [
  'How can I budget better for moving out?',
  'Help me plan my week with my work hours and free time.',
  'What should I consider before renting my first place?',
];

const DEFAULT_LIFENEST_MODEL = 'gpt-4o';

const REPORT_REASONS = [
  'Unsafe advice',
  'Incorrect information',
  'Off-topic response',
  'Harassment or hate',
  'Other',
];

/** Truncates one title for the LifeNest header so the purchase CTA can fit beside it. */
function truncateConversationTitle(title: string) {
  return title.length > 20 ? `${title.slice(0, 20)}...` : title;
}

/** Renders the LifeNest premium chat experience and token usage controls. */
export default function LifeNestScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const requestedConversationId = Array.isArray(conversationId) ? conversationId[0] : conversationId;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [selectedConversationTitle, setSelectedConversationTitle] = useState<string>('New conversation');
  const [historyVisible, setHistoryVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { userInfo } = useAuth();
  const [backgroundColour, setBackgroundColour] = useState<string>('#FFFFFF');
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState<LifeNestMonthlyUsageSummary | null>(null);
  const [isUsageBlocked, setIsUsageBlocked] = useState(false);
  const [showUsageWarning, setShowUsageWarning] = useState(false);
  const { data: lifeNestTermsVersion } = useLifeNestTermsVersion();
  const activeLifeNestTermsVersion = lifeNestTermsVersion || 'v1';
  const warningShownRef = useRef(false);
  const blockedShownRef = useRef(false);
  const isInitialisedRef = useRef(false);
  const inputTokenCost = useMemo(() => calculateLifeNestTokensForMessage(inputMessage), [inputMessage]);
  const remainingTokenCount = monthlyUsage?.totalTokensRemaining ?? 0;
  const textColour = useThemeColour({}, 'text');
  const inputBackgroundColour = useThemeColour({}, 'inputBackground');
  const inputBorderColour = useThemeColour({}, 'inputBorder');
  const hasInsufficientTokensForMessage = Boolean(
    inputTokenCost > 0 && monthlyUsage && inputTokenCost > remainingTokenCount
  );

  /** Picks the best starting model, preferring the user's saved setting when it is usable. */
  const resolveDefaultModel = useCallback((availableModels: string[], preferredModel?: string | null) => {
    const usableModels = availableModels.filter((candidate) => candidate && candidate !== 'None');
    if (preferredModel && preferredModel !== 'None') {
      return preferredModel;
    }

    return usableModels[0] ?? DEFAULT_LIFENEST_MODEL;
  }, []);

  /** Builds a user-facing date label for the next monthly usage reset. */
  const getNextResetLabel = (periodEndIso?: string | null): string => {
    if (periodEndIso) {
      return new Date(periodEndIso).toLocaleDateString([], { month: 'long', day: 'numeric' });
    }

    return 'when your subscription renews';
  };

  useEffect(() => {
    if (isInitialisedRef.current) return;
    isInitialisedRef.current = true;
    let isCancelled = false;

    const init = async () => {
      try {
        const [availableModels, chatBotSettings, userConversations, currentUsage] = await Promise.all([
          lifeNestService.getModels(),
          settingsService.getChatBotSettings(),
          lifeNestService.getUserConversations(),
          lifeNestService.getCurrentMonthlyUsageSummary(),
        ]);
        if (isCancelled) return;

        const defaultModel = resolveDefaultModel(availableModels, chatBotSettings.preferred_model);
        setBackgroundColour(chatBotSettings.background_colour);
        setModels(availableModels.includes(defaultModel) ? availableModels : [defaultModel, ...availableModels]);
        setModel((prev) => prev ?? defaultModel);
        setConversations(userConversations);
        setMonthlyUsage(currentUsage);

        if (userConversations.length > 0) {
          const requestedConversation = requestedConversationId
            ? userConversations.find((conv) => conv.id === requestedConversationId)
            : undefined;
          const initialConversation = requestedConversation || userConversations[0];
          setSelectedConversationId(initialConversation.id);
          setSelectedConversationTitle(initialConversation.title || 'New conversation');
          const history = await lifeNestService.getChatHistory(initialConversation.id);
          if (isCancelled) return;
          setMessages(history);
          setShowWelcome(history.length === 0);
        } else {
          setShowWelcome(true);
        }
      } catch (error) {
        console.error('LifeNest initialisation failed', error);
      }
    };

    void init();

    return () => {
      isCancelled = true;
    };
  }, [requestedConversationId, resolveDefaultModel]);

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;

      const refreshUsage = async () => {
        try {
          const currentUsage = await lifeNestService.getCurrentMonthlyUsageSummary();
          if (!isCancelled) {
            setMonthlyUsage(currentUsage);
          }
        } catch (error) {
          console.error('LifeNest usage refresh failed', error);
        }
      };

      void refreshUsage();

      return () => {
        isCancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    if (!monthlyUsage || monthlyUsage.totalTokensAvailable <= 0) {
      setIsUsageBlocked(false);
      setShowUsageWarning(false);
      warningShownRef.current = false;
      blockedShownRef.current = false;
      return;
    }

    const ratioUsed = monthlyUsage.totalTokensUsed / monthlyUsage.totalTokensAvailable;
    const hasReachedLimit = ratioUsed >= 1;
    const isNearLimit = ratioUsed >= LIFENEST_USAGE_WARNING_RATIO && !hasReachedLimit;

    setIsUsageBlocked(hasReachedLimit);
    setShowUsageWarning(isNearLimit);

    if (hasReachedLimit && !blockedShownRef.current) {
      blockedShownRef.current = true;
      Alert.alert(
        'Monthly limit reached',
        `You have reached your LifeNest limit for this month. Usage resets on ${getNextResetLabel(monthlyUsage.periodEnd)}.`,
      );
    }

    if (!hasReachedLimit) {
      blockedShownRef.current = false;
    }

    if (isNearLimit && !warningShownRef.current) {
      warningShownRef.current = true;
      Alert.alert(
        'Monthly LifeNest limit warning',
        `You are close to your monthly LifeNest usage limit. Your usage resets on ${getNextResetLabel(monthlyUsage.periodEnd)}.`,
      );
    }

    if (!isNearLimit) {
      warningShownRef.current = false;
    }
  }, [monthlyUsage]);

  useEffect(() => {
    if (!userInfo?.is_premium_user || !userInfo.id) return;
    const hasAccepted = userInfo.lifenest_terms_accepted === true;
    const acceptedVersion = userInfo.lifenest_terms_version_accepted;

    if (!hasAccepted || acceptedVersion !== activeLifeNestTermsVersion) {
      setShowTermsModal(true);
    }
  }, [activeLifeNestTermsVersion, userInfo]);

  /** Persists acceptance of the latest LifeNest terms. */
  const handleAcceptTerms = async () => {
    if (!userInfo?.id) {
      setShowTermsModal(false);
      return;
    }

    try {
      await userService.updateUser({
        lifenest_terms_accepted: true,
        lifenest_terms_accepted_at: new Date().toISOString(),
        lifenest_terms_version_accepted: activeLifeNestTermsVersion,
      });
    } catch (error) {
      console.error('LifeNest terms acceptance failed', error);
    } finally {
      setShowTermsModal(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoading, messages]);

  /** Sends one prompt to LifeNest after model and token checks pass. */
  const handleSendMessage = async (messageText?: string) => {
    const text = messageText ?? inputMessage.trim();
    if (!text) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }

    if (!model) {
      Alert.alert('Error', 'Please select a model first.');
      return;
    }

    const messageTokenCost = calculateLifeNestTokensForMessage(text);
    if (monthlyUsage && monthlyUsage.totalTokensRemaining <= 0) {
      Alert.alert('Out of tokens', 'You are out of tokens. Use the "Get Tokens" button to purchase more.');
      return;
    }

    if (monthlyUsage && messageTokenCost > monthlyUsage.totalTokensRemaining) {
      Alert.alert(
        'Not enough tokens',
        `This message needs ${messageTokenCost} LifeNest ${messageTokenCost === 1 ? 'token' : 'tokens'}, but you only have ${monthlyUsage.totalTokensRemaining} remaining.`,
      );
      return;
    }

    if (isLoading) return;
    setInputMessage('');
    setShowWelcome(false);
    setIsLoading(true);

    try {
      const request: SendMessageRequest = {
        message: text,
        model,
        conversationId: selectedConversationId,
      };
      const conv = await lifeNestService.sendMessage(request);
      if (!selectedConversationId) {
        setSelectedConversationId(conv.id);
        setSelectedConversationTitle(conv.title || text.slice(0, 30) || 'New conversation');
      }

      const createdAt = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: Date.now() * -1,
        conversation_id: conv.id,
        message: text,
        was_edited: false,
        created_at: createdAt,
        updated_at: createdAt,
        is_user_message: true,
      };
      setMessages((currentMessages) => [...currentMessages, userMessage]);

      const responseRequest =
        request.conversationId === '' || request.conversationId === undefined
          ? { message: text, model: conv.model, conversationId: conv.id }
          : request;
      const { aiResponse, conversationId: nextConversationId, usage } = await lifeNestService.receiveMessage(responseRequest);
      setMessages((currentMessages) => [...currentMessages, ...aiResponse]);
      setSelectedConversationId(nextConversationId);

      if (usage) {
        showTokenUsageToast(usage.tokensUsed);
        const nextUsage = await lifeNestService.getCurrentMonthlyUsageSummary();
        setMonthlyUsage(nextUsage);
      }

      const updatedConversations = await lifeNestService.getUserConversations();
      setConversations(updatedConversations);

      const currentConversation = updatedConversations.find((conversation) => conversation.id === nextConversationId);
      if (currentConversation) {
        setSelectedConversationTitle(currentConversation.title || 'New conversation');
      }
    } catch (error) {
      console.error('LifeNest message send failed', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Opens the history sheet. */
  const openHistory = () => setHistoryVisible(true);

  /** Closes the history sheet. */
  const closeHistory = () => setHistoryVisible(false);

  /** Loads a selected conversation into the active chat view. */
  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      const history = await lifeNestService.getChatHistory(conversation.id);
      setMessages(history);
      setSelectedConversationId(conversation.id);
      setSelectedConversationTitle(conversation.title || 'New conversation');
      setShowWelcome(history.length === 0);
    } catch (error) {
      console.error('LifeNest conversation load failed', error);
      Alert.alert('Error', 'Could not load that conversation.');
    } finally {
      closeHistory();
    }
  };

  /** Clears the current conversation state and starts a new chat. */
  const handleNewChat = () => {
    setMessages([]);
    setSelectedConversationId('');
    setSelectedConversationTitle('New conversation');
    setShowWelcome(true);
    closeHistory();
  };

  /** Sends a suggested prompt through the same path as the typed message submit button. */
  const handleSampleQuestionPress = (question: string) => {
    setInputMessage(question);
    void handleSendMessage(question);
  };

  /** Opens the assistant response reporting modal. */
  const openReportModal = (message: ChatMessage) => {
    setReportingMessage(message);
    setReportReason('');
    setReportDetails('');
    setReportVisible(true);
  };

  /** Closes the assistant response reporting modal. */
  const closeReportModal = () => {
    if (isSubmittingReport) return;
    setReportVisible(false);
    setReportingMessage(null);
    setReportReason('');
    setReportDetails('');
  };

  /** Sends the selected report reason and optional details for an assistant response. */
  const handleSubmitReport = async () => {
    if (!reportingMessage || !selectedConversationId) {
      Alert.alert('Error', 'Missing report context. Please try again.');
      return;
    }

    if (!reportReason) {
      Alert.alert('Error', 'Please choose a report reason.');
      return;
    }

    const request: ChatFeedbackReportRequest = {
      conversationId: selectedConversationId,
      messageId: reportingMessage.id,
      message: reportingMessage.message,
      reason: reportReason,
      details: reportDetails.trim() || undefined,
    };

    try {
      setIsSubmittingReport(true);
      await lifeNestService.reportAssistantMessage(request);
      Alert.alert('Report sent', 'Thank you. We have submitted this report for review.');
      closeReportModal();
    } catch (error) {
      console.error('LifeNest response report failed', error);
      Alert.alert('Error', 'We could not send the report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  /** Formats one ISO timestamp into a local time label. */
  const formatTime = (timestamp: string): string =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /** Formats one ISO timestamp into a short month/day label. */
  const formatDateShort = (timestamp: string): string =>
    new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

  const currentTitle = selectedConversationTitle || 'New conversation';

  return (
    <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ThemedView style={styles.container}>
        <Modal visible={showTermsModal} transparent animationType="fade" onRequestClose={handleAcceptTerms}>
          <View style={styles.termsOverlay}>
            <View style={styles.termsModal}>
              <ThemedText type="subtitle" style={styles.termsTitle}>LifeNest Premium Terms</ThemedText>
              <ScrollView style={styles.termsScroll} contentContainerStyle={styles.termsContent}>
                <ThemedText style={styles.termsText}>
                  LifeNest is designed to support independent living planning, including budgeting, housing preparation, work readiness, and healthy routines.
                </ThemedText>
                <ThemedText style={styles.termsText}>
                  You must not use LifeNest for medical diagnosis, legal or financial liability decisions, harmful actions, illegal activity, harassment, or crisis guidance.
                </ThemedText>
                <ThemedText style={styles.termsText}>
                  For severe mental health or safety concerns, contact a qualified professional urgently. Use the app Links page for support resources. UK emergency support includes 999, NHS 111, and Samaritans 116 123.
                </ThemedText>
                <ThemedText style={styles.termsText}>
                  Responses may be imperfect. Verify critical information before acting. Continued use means you agree to use LifeNest responsibly and only for its intended purpose.
                </ThemedText>
              </ScrollView>
              <Button title="I understand" onPress={handleAcceptTerms} />
            </View>
          </View>
        </Modal>

        <ThemedView style={styles.header}>
          <ThemedView style={styles.headerLeft}>
            <TouchableOpacity onPress={openHistory} style={styles.historyButton}>
              <ThemedText style={styles.historyButtonText}>☰</ThemedText>
            </TouchableOpacity>
            <ThemedText type="title" style={styles.conversationTitle}>
              {truncateConversationTitle(currentTitle)}
            </ThemedText>
            <Button
              title="Get Tokens"
              variant="secondary"
              size="small"
              onPress={() => {
                router.push('/subscribe');
              }}
              style={{ marginLeft: 12 }}
            />
          </ThemedView>
        </ThemedView>

        <ScrollView
          ref={scrollViewRef}
          style={[styles.messagesContainer, { backgroundColor: backgroundColour }]}
          showsVerticalScrollIndicator={false}
        >
          {showWelcome && messages.length === 0 ? (
            <ThemedView style={styles.welcomeCard}>
              <ThemedText style={styles.welcomeEmoji}>🤖</ThemedText>
              <ThemedText type="subtitle" style={styles.welcomeTitle}>
                Welcome to LifeNest!
              </ThemedText>
              <ThemedText style={styles.welcomeDescription}>
                Your AI assistant for life guidance and support. Start a conversation below or try one of these example questions:
              </ThemedText>

              <ThemedText style={styles.modelSelectorLabel}>Model</ThemedText>
              <ThemedView
                style={[
                  styles.modelPickerShell,
                  { backgroundColor: inputBackgroundColour, borderColor: inputBorderColour },
                ]}
              >
                <Picker
                  selectedValue={model}
                  onValueChange={(selectedModel) => setModel(selectedModel)}
                  enabled={!isLoading}
                  style={[styles.modelPicker, { color: textColour }]}
                  dropdownIconColor={textColour}
                >
                  {models.filter((candidateModel) => candidateModel !== 'None').map((candidateModel) => (
                    <Picker.Item key={candidateModel} label={candidateModel} value={candidateModel} color={textColour} />
                  ))}
                </Picker>
              </ThemedView>
              <ThemedText style={styles.modelSelectorHint}>
                Your saved default is selected automatically.
              </ThemedText>

              <ThemedView style={styles.sampleQuestions}>
                {SAMPLE_QUESTIONS.map((question) => (
                  <Button
                    key={question}
                    title={question}
                    variant="secondary"
                    size="small"
                    onPress={() => handleSampleQuestionPress(question)}
                    style={styles.sampleButton}
                  />
                ))}
              </ThemedView>
            </ThemedView>
          ) : null}

          {messages.map((message) => {
            const isAI = !message.is_user_message;
            return (
              <ThemedView
                key={message.id}
                style={[
                  styles.messageContainer,
                  isAI ? styles.aiMessageContainer : styles.userMessageContainer,
                  { backgroundColor: 'transparent' },
                ]}
              >
                <Card style={[styles.messageCard, isAI ? styles.aiMessage : styles.userMessage]}>
                  {isAI ? (
                    <ThemedView style={styles.aiHeader}>
                      <ThemedText style={styles.aiName}>LifeNest</ThemedText>
                    </ThemedView>
                  ) : null}
                  {renderMessageWithBold(message, [styles.messageText, { color: 'white' }])}
                  <ThemedText style={[styles.timestamp, !isAI && styles.userTimestamp]}>
                    {formatTime(message.created_at)}
                  </ThemedText>
                  {isAI && message.id > 0 ? (
                    <TouchableOpacity onPress={() => openReportModal(message)} style={styles.reportButton}>
                      <ThemedText style={styles.reportButtonText}>Report response</ThemedText>
                    </TouchableOpacity>
                  ) : null}
                </Card>
              </ThemedView>
            );
          })}

          {isLoading ? (
            <ThemedView style={[styles.messageContainer, styles.aiMessageContainer, { backgroundColor: 'transparent' }]}>
              <Card style={[styles.messageCard, styles.aiMessage, styles.loadingMessageCard]}>
                <ThemedView style={styles.aiHeader}>
                  <ThemedText style={styles.aiName}>LifeNest</ThemedText>
                </ThemedView>
                <ThemedView style={styles.loadingMessageContent}>
                  <LoadingSpinner size="small" text="" />
                  <ThemedText style={styles.loadingMessageText}>Thinking...</ThemedText>
                </ThemedView>
              </Card>
            </ThemedView>
          ) : null}
        </ScrollView>

        <ThemedView style={styles.inputContainer}>
          {monthlyUsage ? (
            <ThemedText style={styles.limitText}>
              {monthlyUsage.monthlyTokenAllowance > 0
                ? `Monthly tokens: ${Math.max(monthlyUsage.monthlyTokenAllowance - monthlyUsage.monthlyTokensUsed, 0)} / ${monthlyUsage.monthlyTokenAllowance} left - resets ${getNextResetLabel(monthlyUsage.periodEnd)} - Extra balance: ${monthlyUsage.purchasedTokensBalance}`
                : `Extra balance: ${monthlyUsage.purchasedTokensBalance}`}
            </ThemedText>
          ) : null}
          {showUsageWarning ? (
            <ThemedText style={styles.warningText}>
              You are nearing your LifeNest token limit for this month.
            </ThemedText>
          ) : null}
          {isUsageBlocked ? (
            <ThemedText style={styles.blockedText}>
              You have used all available LifeNest tokens. Buy more tokens or wait for the monthly reset.
            </ThemedText>
          ) : null}
          {!isUsageBlocked && hasInsufficientTokensForMessage ? (
            <ThemedText style={styles.warningText}>
              This message needs more tokens than you currently have available.
            </ThemedText>
          ) : null}
          <ThemedView style={styles.inputWrapper}>
            <Input
              viewStyle={styles.textInputGroup}
              style={styles.textInput}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Ask LifeNest anything..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={LIFENEST_MAX_INPUT_CHARACTERS}
              editable={!isLoading}
            />
            <Button
              title="Send"
              variant="primary"
              size="small"
              onPress={() => handleSendMessage()}
              disabled={!inputMessage.trim() || !model || isLoading}
              style={styles.sendButton}
            />
          </ThemedView>
          <ThemedText style={styles.inputHelper}>
            {`${inputMessage.length}/${LIFENEST_MAX_INPUT_CHARACTERS} characters • This message uses ${inputTokenCost} ${inputTokenCost === 1 ? 'token' : 'tokens'}`}
          </ThemedText>
        </ThemedView>

        <Modal visible={reportVisible} animationType="fade" transparent onRequestClose={closeReportModal}>
          <View style={styles.reportOverlay}>
            <Card style={styles.reportCard}>
              <ThemedText type="subtitle" style={styles.reportTitle}>Report AI response</ThemedText>
              <ThemedText style={styles.reportSubtitle}>Select a reason and send to our OpenAI feedback intake.</ThemedText>
              <ThemedView style={styles.reportReasonGrid}>
                {REPORT_REASONS.map((reason) => (
                  <Button
                    key={reason}
                    title={reason}
                    variant={reportReason === reason ? 'primary' : 'secondary'}
                    size="small"
                    onPress={() => setReportReason(reason)}
                    style={styles.reportReasonButton}
                  />
                ))}
              </ThemedView>
              <Input
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Optional extra details"
                multiline
                maxLength={300}
                style={styles.reportInput}
                editable={!isSubmittingReport}
              />
              <ThemedView style={styles.reportActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="small"
                  onPress={closeReportModal}
                  disabled={isSubmittingReport}
                  style={styles.reportActionButton}
                />
                <Button
                  title={isSubmittingReport ? 'Sending...' : 'Submit report'}
                  variant="primary"
                  size="small"
                  onPress={handleSubmitReport}
                  disabled={isSubmittingReport || !reportReason}
                  style={styles.reportActionButton}
                />
              </ThemedView>
            </Card>
          </View>
        </Modal>

        <Modal visible={historyVisible} animationType="slide" transparent onRequestClose={closeHistory}>
          <View style={styles.historyOverlay}>
            <Card style={styles.historyCard}>
              <ThemedView style={styles.historyHeader}>
                <ThemedText type="subtitle" style={styles.historyTitle}>
                  Your conversations
                </ThemedText>
                <Button title="Close" variant="secondary" size="small" onPress={closeHistory} />
              </ThemedView>
              <Button
                title="New chat"
                variant="primary"
                size="small"
                onPress={handleNewChat}
                style={styles.newChatButton}
                disabled={isLoading || currentTitle === 'New conversation'}
              />
              <ScrollView style={styles.historyList}>
                {!conversations || conversations.length === 0 ? (
                  <ThemedText style={styles.historyEmpty}>
                    No previous conversations yet.
                  </ThemedText>
                ) : null}
                {conversations.map((conversation) => (
                  <TouchableOpacity
                    key={conversation.id}
                    style={styles.historyItem}
                    onPress={() => handleSelectConversation(conversation)}
                  >
                    <ThemedText style={styles.historyItemTitle}>
                      {conversation.title || 'Untitled conversation'}
                    </ThemedText>
                    <ThemedText style={styles.historyItemMeta}>
                      {`${formatDateShort(conversation.updated_at || conversation.created_at)} • ${conversation.model}`}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          </View>
        </Modal>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
  },
  historyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  historyButtonText: {
    fontSize: 20,
  },
  messagesContainer: {
    flex: 1,
    padding: 6,
  },
  welcomeCard: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 5,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 6,
    height: 40,
  },
  welcomeTitle: {
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  modelSelectorLabel: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 8,
  },
  modelPickerShell: {
    width: '100%',
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  modelPicker: {
    width: '100%',
    minHeight: 52,
  },
  modelSelectorHint: {
    fontSize: 12,
    opacity: 0.68,
    textAlign: 'center',
    marginBottom: 16,
  },
  sampleQuestions: {
    width: '100%',
    gap: 8,
  },
  sampleButton: {
    marginBottom: 4,
  },
  messageContainer: {
    marginBottom: 0,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '85%',
    padding: 5,
  },
  userMessage: {
    backgroundColor: '#3B82F6',
  },
  aiMessage: {},
  loadingMessageCard: {
    minWidth: 150,
  },
  loadingMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  loadingMessageText: {
    fontSize: 14,
    opacity: 0.72,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiName: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 6,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  reportButton: {
    marginTop: 8,
  },
  reportButtonText: {
    fontSize: 12,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  inputContainer: {
    paddingTop: 15,
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  limitText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
    opacity: 0.75,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 4,
  },
  blockedText: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 3,
    width: '100%',
  },
  textInputGroup: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  sendButton: {
    minWidth: 60,
    flexShrink: 0,
  },
  inputHelper: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  reportCard: {
    padding: 16,
  },
  reportTitle: {
    marginBottom: 8,
  },
  reportSubtitle: {
    marginBottom: 12,
    opacity: 0.7,
  },
  reportReasonGrid: {
    gap: 8,
    marginBottom: 12,
  },
  reportReasonButton: {
    marginBottom: 2,
  },
  reportInput: {
    minHeight: 90,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportActionButton: {
    flex: 1,
  },
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  historyCard: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  newChatButton: {
    marginBottom: 12,
  },
  historyList: {
    maxHeight: '100%',
  },
  historyEmpty: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    paddingVertical: 16,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  historyItemMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  termsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  termsModal: {
    maxHeight: '82%',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#111827',
  },
  termsTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  termsScroll: {
    marginBottom: 12,
  },
  termsContent: {
    gap: 10,
  },
  termsText: {
    lineHeight: 20,
  },
});
