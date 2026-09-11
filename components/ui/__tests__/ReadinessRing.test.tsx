import React from 'react';
import { render } from '@testing-library/react-native';
import { ReadinessRing } from '../ReadinessRing';

describe('ReadinessRing fraction display', () => {
  it('renders completed and total values as a stacked fraction', async () => {
    const { getByText } = await render(
      <ReadinessRing value={50} fraction={{ numerator: 1, denominator: 2 }} />
    );

    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });
});


