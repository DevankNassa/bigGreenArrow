import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { WeighIn } from '@/engine';

import { weighInsCsv } from './csv';

/** Writes every weigh-in to a CSV file and opens the share sheet for it. */
export async function shareWeighInsCsv(weighIns: readonly WeighIn[]): Promise<void> {
  const file = new File(Paths.cache, 'big-green-arrow-weigh-ins.csv');
  if (file.exists) file.delete();
  file.create();
  file.write(weighInsCsv(weighIns));
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export weigh-ins' });
}
