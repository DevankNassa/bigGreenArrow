import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import LogScreen from '@/app/log';
import type { WeighIn } from '@/engine';

jest.mock('expo-haptics');
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  router: { canGoBack: () => true, back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

let mockParams: { id?: string } = {};
const mockAddWeighIn = jest.fn(async () => {});
const mockUpdateWeighIn = jest.fn(async () => {});
let mockWeighIns: WeighIn[] = [];

jest.mock('@/data/data-context', () => ({
  useData: () => ({
    weighIns: mockWeighIns,
    preferences: { ...jest.requireActual('@/data/preferences').DEFAULT_PREFERENCES, unit: 'kg' },
    addWeighIn: mockAddWeighIn,
    updateWeighIn: mockUpdateWeighIn,
    deleteWeighIn: jest.fn(),
  }),
}));

const weighIn = (over: Partial<WeighIn> = {}): WeighIn => ({
  id: 'w1',
  timestamp: '2026-11-18T07:30:00',
  weightKg: 82.4,
  source: 'manual',
  excluded: false,
  ...over,
} as WeighIn);

function render(): ReactTestRenderer {
  let screen: ReactTestRenderer | undefined;
  act(() => {
    screen = create(<LogScreen />);
  });
  return screen!;
}

const byLabel = (screen: ReactTestRenderer, label: string): ReactTestInstance =>
  screen.root.find((n) => typeof n.type !== 'string' && n.props.accessibilityLabel === label && n.props.onPress);

const press = (screen: ReactTestRenderer, label: string) =>
  act(() => {
    byLabel(screen, label).props.onPress();
  });

const shownWeight = (screen: ReactTestRenderer) =>
  screen.root.find((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Weight, '))
    .props.accessibilityLabel as string;

const allText = (screen: ReactTestRenderer) => JSON.stringify(screen.toJSON());

beforeEach(() => {
  mockParams = {};
  mockWeighIns = [];
  jest.clearAllMocks();
});

describe('log screen keypad', () => {
  it('replaces the pre-filled weight on the first key and saves what was typed', async () => {
    mockWeighIns = [weighIn()];
    const screen = render();
    expect(shownWeight(screen)).toBe('Weight, 82.4 kg');

    for (const key of ['8', '1', 'Decimal point', '9']) press(screen, key);
    expect(shownWeight(screen)).toBe('Weight, 81.9 kg');

    const saves = screen.root.findAll((n) => n.props.label === 'Save' && n.props.onPress);
    expect(saves.length).toBeGreaterThan(0);
    await act(async () => {
      await saves[saves.length - 1].props.onPress();
    });
    expect(mockAddWeighIn).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 81.9 }));
  });

  it('holds the range error while the first digits are typed', () => {
    mockWeighIns = [weighIn()];
    const screen = render();
    press(screen, '8');
    expect(allText(screen)).not.toContain('must be between');
    press(screen, 'Decimal point');
    expect(allText(screen)).toContain('must be between');
  });

  it('starts empty without history, and backspace and clear work', () => {
    const screen = render();
    expect(shownWeight(screen)).toBe('Weight, empty kg');
    for (const key of ['7', '5', 'Delete']) press(screen, key);
    expect(shownWeight(screen)).toBe('Weight, 7 kg');
    act(() => {
      byLabel(screen, 'Delete').props.onLongPress();
    });
    expect(shownWeight(screen)).toBe('Weight, empty kg');
  });

  it('hides the keypad while the note is typed', () => {
    const screen = render();
    const note = screen.root.find((n) => n.props.accessibilityLabel === 'Note' && n.props.onFocus);
    act(() => note.props.onFocus());
    expect(screen.root.findAll((n) => n.props.accessibilityLabel === 'Decimal point')).toHaveLength(0);
    act(() => note.props.onBlur());
    expect(screen.root.findAll((n) => n.props.accessibilityLabel === 'Decimal point').length).toBeGreaterThan(0);
  });

  it('shows no keypad for a synced entry, which cannot be edited here', () => {
    mockWeighIns = [weighIn({ source: 'apple_health' })];
    mockParams = { id: 'w1' };
    const screen = render();
    expect(screen.root.findAll((n) => n.props.accessibilityLabel === 'Decimal point')).toHaveLength(0);
  });

  it('edits an existing manual entry', async () => {
    mockWeighIns = [weighIn()];
    mockParams = { id: 'w1' };
    const screen = render();
    press(screen, 'Increase by 0.1');
    expect(shownWeight(screen)).toBe('Weight, 82.5 kg');
    press(screen, '9');
    expect(shownWeight(screen)).toBe('Weight, 9 kg');
  });
});

