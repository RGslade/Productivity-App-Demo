import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps, TextStyle, TouchableOpacityProps, StyleProp, Platform, } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useThemeColour } from '@/hooks/useThemeColour';
import { Radii } from '@/constants/Colours';
import { TrackedTouchableOpacity } from './TrackedTouchableOpacity';

type WebShadowStyle = ViewStyle & { boxShadow?: string };

/**
 * Cards sit on the page rather than float above it: a hairline border carries the
 * edge and the shadow stays almost invisible.
 */
const cardShadow = Platform.select<WebShadowStyle>({
  web: {
    boxShadow: '0 1px 2px rgba(30, 28, 25, 0.04)',
  },
  default: {
    shadowColor: '#1E1C19',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
}) as WebShadowStyle;

interface CardBaseProps {
  children?: React.ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  touchableProps?: TouchableOpacityProps;
  onLayout?: ViewProps['onLayout'];
}

type CardProps = CardBaseProps & (
  | { onPress: () => void; analyticsId: string }
  | { onPress?: undefined; analyticsId?: never }
);

// â¬…ï¸ OUTSIDE Card
/** Renders the base card surface used across the app. */
const CardContent: React.FC<{children?: React.ReactNode;
  title?: string; 
  style?: StyleProp<ViewStyle>; 
  bodyStyle?: StyleProp<ViewStyle>; 
  titleStyle?: StyleProp<TextStyle>;
  cardBackgroundColor: string;
  borderColor: string;
  onPress?: () => void;
  analyticsId?: string;
  touchableProps?: TouchableOpacityProps;
  onLayout?: ViewProps['onLayout'];
}> = ({children, title, style, bodyStyle, titleStyle, cardBackgroundColor, borderColor, onPress, analyticsId, touchableProps, onLayout,}) => {
  const content = (
    <ThemedView onLayout={onLayout} style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor }, style]}>
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
    <TrackedTouchableOpacity {...touchableProps} analyticsId={analyticsId!} analyticsControlType="card" activeOpacity={0.88} onPress={onPress}>
      {content}
    </TrackedTouchableOpacity>
  );
};


export const Card: React.FC<CardProps> = ({children, title, style, bodyStyle, titleStyle, onPress, analyticsId, touchableProps, onLayout,}) => {
  const cardBackgroundColor = useThemeColour({}, 'cardBackground');
  const borderColor = useThemeColour({}, 'cardBorder');

  return (
    <CardContent title={title} style={style} bodyStyle={bodyStyle} titleStyle={titleStyle} cardBackgroundColor={cardBackgroundColor} borderColor={borderColor} onPress={onPress} analyticsId={analyticsId} touchableProps={touchableProps} onLayout={onLayout}>
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
    borderRadius: Radii.card,
    ...cardShadow,
    borderWidth: 1,
    marginBottom: 11,
  },

  cardBody: {
    padding: 17,
  },

  cardHeader: {
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },

  cardFooter: {
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom: 17,
    borderTopWidth: 1,
  },
});

export default Card;
