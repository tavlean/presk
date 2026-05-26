import {
  buildActiveAdditionalProcessorCacheUrls,
  buildInitialCacheUrls,
  shouldCacheDynamically,
} from './cache-plan';
import { detectProcessorSupport } from './processor-support';

import * as initialApp from 'entry-data:client/initial-app';
import swUrl from 'service-worker:sw';
import * as compress from 'entry-data:client/lazy-app/Compress';
import * as swBridge from 'entry-data:client/lazy-app/sw-bridge';
import * as blobAnim from 'entry-data:shared/prerendered-app/Intro/blob-anim';

import * as featuresWorker from 'entry-data:../features-worker/active';

import * as avifDec from 'entry-data:codecs/avif/dec/avif_dec';
import * as webpDec from 'entry-data:codecs/webp/dec/webp_dec';

import * as avifEncMt from 'entry-data:codecs/avif/enc/avif_enc_mt';
import * as avifEnc from 'entry-data:codecs/avif/enc/avif_enc';

import * as jxlEncMtSimd from 'entry-data:codecs/jxl/enc/jxl_enc_mt_simd';
import * as jxlEncMt from 'entry-data:codecs/jxl/enc/jxl_enc_mt';
import * as jxlEnc from 'entry-data:codecs/jxl/enc/jxl_enc';

import * as oxiMt from 'entry-data:codecs/oxipng/pkg-parallel/squoosh_oxipng';
import * as oxi from 'entry-data:codecs/oxipng/pkg/squoosh_oxipng';

import * as webpEncSimd from 'entry-data:codecs/webp/enc/webp_enc_simd';
import * as webpEnc from 'entry-data:codecs/webp/enc/webp_enc';

export { shouldCacheDynamically };

export const initial = buildInitialCacheUrls({
  initialApp,
  compress,
  swBridge,
  blobAnim,
  featuresWorker,
  serviceWorkerUrl: swUrl,
});

export const theRest = (async () => {
  return buildActiveAdditionalProcessorCacheUrls(
    await detectProcessorSupport(),
    {
      featuresWorker,
      avifDec,
      webpDec,
      avifEncMt,
      avifEnc,
      jxlEncMtSimd,
      jxlEncMt,
      jxlEnc,
      oxiMt,
      oxi,
      webpEncSimd,
      webpEnc,
    },
  );
})();
