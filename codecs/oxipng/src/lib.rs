#[cfg(feature = "parallel")]
pub use wasm_bindgen_rayon::init_thread_pool;

use oxipng::{BitDepth, ColorType};
use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;

#[wasm_bindgen]
pub fn optimise(
    data: Clamped<Vec<u8>>,
    width: u32,
    height: u32,
    level: u8,
    interlace: bool,
) -> Vec<u8> {
    let mut options = oxipng::Options::from_preset(level);
    options.optimize_alpha = true;
    // oxipng 10.x: `interlace` is `Option<bool>` (was `Option<Interlacing>` in 9.x).
    options.interlace = Some(interlace);

    let raw = oxipng::RawImage::new(width, height, ColorType::RGBA, BitDepth::Eight, data.0)
        .unwrap_throw();
    raw.create_optimized_png(&options).unwrap_throw()
}
