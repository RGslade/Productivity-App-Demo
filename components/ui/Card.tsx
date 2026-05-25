import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle, TouchableOpacity, TouchableOpacityProps, StyleProp, } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useThemeColour } from '@/hooks/useThemeColour';

interface CardProps {
  children?: React.ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  touchableProps?: TouchableOpacityProps;
}

// ⬅️ OUTSIDE Card
/** Renders the base card surface used across the app. */
const CardContent: React.FC<{children?: React.ReactNode;
  title?: string; 
  style?: StyleProp<ViewStyle>; 
  bodyStyle?: StyleProp<ViewStyle>; 
  titleStyle?: StyleProp<TextStyle>;
  cardBackgroundColor: string;
  borderColor: string;
  onPress?: () => void;
  touchableProps?: TouchableOpacityProps;
}> = ({children, title, style, bodyStyle, titleStyle, cardBackgroundColor, borderColor, onPress, touchableProps,}) => {
  const content = (
    <ThemedView style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor }, style]}>
      <View style={[styles.cardBody, bodyStyle]}>
        {title && (
          <ThemedText type="subtitle" style={titleStyle}>
            {title}
          </ThemedText>
        )}
        {children}
      </View>
    </ThemedView>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} {...touchableProps}>
      {content}
    </TouchableOpacity>
  );
};


export const Card: React.FC<CardProps> = ({children, title, style, bodyStyle, titleStyle, onPress, touchableProps,}) => {
  const cardBackgroundColor = useThemeColour({}, 'cardBackground');
  const borderColor = useThemeColour({}, 'cardBorder');

  return (
    <CardContent title={title} style={style} bodyStyle={bodyStyle} titleStyle={titleStyle} cardBackgroundColor={cardBackgroundColor} borderColor={borderColor} onPress={onPress} touchableProps={touchableProps}>
      {children}
    </CardContent>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  const borderColour = useThemeColour({ light: '#DEE2E6', dark: '#3A3A3C' }, 'cardBorder');

  return (
    <View style={[styles.cardHeader, { borderBottomColor: borderColour }, style]}>
      {children}
    </View>
  );
};

interface CardBodyProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, style }) => {
  return (
    <View style={[styles.cardBody, style]}>
      {children}
    </View>
  )
};

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  const borderColor = useThemeColour({ light: '#DEE2E6', dark: '#3A3A3C' }, 'cardBorder');

  return (
    <View style={[styles.cardFooter, { borderTopColor: borderColor }, style]}>
      {children}
    </View>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, style }) => {
  return (
    <ThemedText type="subtitle" style={[style]}>
      {children}
    </ThemedText>
  )
};

interface CardTextProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const CardText: React.FC<CardTextProps> = ({ children, style }) => {
  return (
    <ThemedText style={[style]}>
      {children}
    </ThemedText>
  )
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    marginBottom: 14,
  },

  cardBody: {
    padding: 16,
  },

  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },

  cardFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
});

export default Card;
