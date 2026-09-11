import React from 'react';
import { Platform, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { TrackedTouchableOpacity } from '../TrackedTouchableOpacity';
import { logUiPress } from '@/services/analyticsService';

jest.mock('@/services/analyticsService', () => ({
  logUiPress: jest.fn(() => Promise.resolve()),
}));

const logUiPressMock = jest.mocked(logUiPress);

describe('TrackedTouchableOpacity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs once before invoking the press handler', async () => {
    const onPress = jest.fn();
    const view = await render(
      <TrackedTouchableOpacity analyticsId="test_save" analyticsControlType="button" onPress={onPress}>
        <Text>Save</Text>
      </TrackedTouchableOpacity>,
    );

    fireEvent.press(view.getByText('Save'));

    expect(logUiPressMock).toHaveBeenCalledWith({
      controlId: 'test_save',
      controlType: 'button',
      screen: '/test',
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  }, 30000);

  it('does not log or invoke disabled controls', async () => {
    const onPress = jest.fn();
    const view = await render(
      <TrackedTouchableOpacity analyticsId="test_disabled" disabled onPress={onPress}>
        <Text>Disabled</Text>
      </TrackedTouchableOpacity>,
    );

    fireEvent.press(view.getByText('Disabled'));

    expect(logUiPressMock).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('adds a pointer cursor to active web controls', async () => {
    const originalPlatform = Platform.OS;
    Platform.OS = 'web';
    const onPress = jest.fn();

    try {
      const view = await render(
        <TrackedTouchableOpacity analyticsId="test_web_cursor" onPress={onPress} testID="web-cursor-touchable">
          <Text>Open</Text>
        </TrackedTouchableOpacity>,
      );
      const touchable = view.getByTestId('web-cursor-touchable');

      expect(touchable.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ cursor: 'pointer' })])
      );
      expect(touchable.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ transitionDuration: '140ms' })])
      );
    } finally {
      Platform.OS = originalPlatform;
    }
  });

  it('uses a default cursor for disabled web controls', async () => {
    const originalPlatform = Platform.OS;
    Platform.OS = 'web';
    const onPress = jest.fn();

    try {
      const view = await render(
        <TrackedTouchableOpacity analyticsId="test_disabled_cursor" disabled onPress={onPress} testID="disabled-cursor-touchable">
          <Text>Disabled</Text>
        </TrackedTouchableOpacity>,
      );
      const touchable = view.getByTestId('disabled-cursor-touchable');

      expect(touchable.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ cursor: 'default' })])
      );
    } finally {
      Platform.OS = originalPlatform;
    }
  });
});


