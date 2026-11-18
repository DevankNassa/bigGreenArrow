import { importedSummary } from '../health-labels';

describe('importedSummary', () => {
  it('counts weigh-ins, singular and plural', () => {
    expect(importedSummary(124, 'Apple Health')).toBe('Imported 124 weigh-ins from Apple Health.');
    expect(importedSummary(1, 'Health Connect')).toBe('Imported 1 weigh-in from Health Connect.');
    expect(importedSummary(0, 'Apple Health')).toBe('No new weigh-ins found in Apple Health.');
  });
});
