import qoiDecoder from 'codecs/qoi/dec/qoi_dec';
import { createQoiDecoderRuntime } from './runtime';

export default createQoiDecoderRuntime({
  loadDecoder: async () => qoiDecoder,
});
