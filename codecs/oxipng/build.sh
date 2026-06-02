#!/bin/bash

set -e

rm -rf pkg pkg-parallel
export CFLAGS="${CFLAGS} -DUNALIGNED_ACCESS_IS_FAST=1"
wasm-pack build -t web
# Threaded (pkg-parallel) build. wasm-bindgen-rayon needs a SHARED + IMPORTED
# WebAssembly.Memory so the main thread can postMessage it to its rayon worker
# pool (a non-shared memory throws DataCloneError "#<Memory> could not be
# cloned"). On current nightlies `+atomics` alone no longer emits a shared
# memory at link, so we pass the full linker set explicitly:
#   --shared-memory          make the memory shared
#   --max-memory=1073741824  a shared memory MUST declare a max (1 GiB = 16384 pages)
#   --import-memory          the JS glue creates+supplies the shared memory
#   --export=__wasm_init_tls --export=__tls_{size,align,base} --export=__heap_base
#                            the TLS-init + heap-base symbols wasm-bindgen's
#                            threading pass needs to find (to inject per-thread
#                            stacks + thread ids); omitting them is what made
#                            wasm-bindgen error "failed to prepare module for
#                            threading" / "failed to find `__heap_base`". On
#                            current nightlies these are no longer exported by
#                            default, so we export them explicitly at link.
# -Z build-std rebuilds std with the same target-features so the whole link
# (app + std) agrees on atomics/bulk-memory.
RUSTFLAGS='-C target-feature=+atomics,+bulk-memory -C link-arg=--shared-memory -C link-arg=--max-memory=1073741824 -C link-arg=--import-memory -C link-arg=--export=__wasm_init_tls -C link-arg=--export=__tls_size -C link-arg=--export=__tls_align -C link-arg=--export=__tls_base -C link-arg=--export=__heap_base' wasm-pack build -t web -d pkg-parallel . -- -Z build-std=panic_abort,std --features=parallel
rm pkg{,-parallel}/.gitignore
