import { encoderMap } from '../../feature-meta';

export type SupportedEncoderMap = Partial<typeof encoderMap>;

export async function getSupportedEncoderMap(
  encoders = encoderMap,
): Promise<SupportedEncoderMap> {
  const supportedEncoderMap: SupportedEncoderMap = {
    ...encoders,
  };

  await Promise.all(
    Object.entries(encoders).map(async ([encoderName, details]) => {
      if ('featureTest' in details && !(await details.featureTest())) {
        delete supportedEncoderMap[encoderName as keyof typeof encoderMap];
      }
    }),
  );

  return supportedEncoderMap;
}
