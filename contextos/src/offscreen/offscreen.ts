import * as ort from 'onnxruntime-web/webgpu'
import { pipeline, env } from '@huggingface/transformers'

// Load quantized weights from Hugging Face CDN and cache in browser CacheStorage
env.allowLocalModels = false
// Disable built-in WASM blob caching so MV3 CSP never blocks blob: script imports
;(env as any).useWasmCache = false

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'
const ORT_WASM_URL =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/ort-wasm-simd-threaded.asyncify.wasm'

// Point ONNX Runtime directly to our local MV3-safe .mjs glue file
ort.env.wasm.numThreads = 1
ort.env.wasm.proxy = false
ort.env.wasm.wasmPaths = {
  mjs: chrome.runtime.getURL('ort/ort-wasm-simd-threaded.asyncify.mjs'),
  wasm: ORT_WASM_URL,
}

let extractorPromise: Promise<any> | null = null
let isReady = false

async function fetchAndCacheWasm(): Promise<ArrayBuffer> {
  const cacheName = 'contextos-ort-wasm-v1'
  try {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(ORT_WASM_URL)
    if (cached) {
      return await cached.arrayBuffer()
    }
    const res = await fetch(ORT_WASM_URL)
    if (!res.ok) throw new Error(`Failed to fetch ONNX runtime (${res.status})`)
    await cache.put(ORT_WASM_URL, res.clone())
    return await res.arrayBuffer()
  } catch (err) {
    const res = await fetch(ORT_WASM_URL)
    if (!res.ok) throw err
    return await res.arrayBuffer()
  }
}

async function initOnnxRuntime() {
  ort.env.wasm.numThreads = 1
  ort.env.wasm.proxy = false
  ort.env.wasm.wasmPaths = {
    mjs: chrome.runtime.getURL('ort/ort-wasm-simd-threaded.asyncify.mjs'),
    wasm: ORT_WASM_URL,
  }
  if (!ort.env.wasm.wasmBinary) {
    chrome.runtime.sendMessage({
      type: 'LOCAL_AI_PROGRESS',
      payload: { status: 'progress', file: 'onnx-runtime.wasm', progress: 10 },
    }).catch(() => {})
    ort.env.wasm.wasmBinary = await fetchAndCacheWasm()
  }
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      await initOnnxRuntime()
      return pipeline('feature-extraction', MODEL_ID, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (info: any) => {
          if (info?.status === 'progress' || info?.status === 'initiate' || info?.status === 'done') {
            chrome.runtime.sendMessage({
              type: 'LOCAL_AI_PROGRESS',
              payload: {
                status: info.status,
                file: info.file ?? '',
                progress: typeof info.progress === 'number' ? Math.round(info.progress) : 0,
              },
            }).catch(() => {})
          }
        },
      })
    })()
      .then((pipe) => {
        isReady = true
        return pipe
      })
      .catch((err) => {
        extractorPromise = null
        isReady = false
        throw err
      })
  }
  return extractorPromise
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor()
  const vectors: number[][] = []
  for (const text of texts) {
    const clean = text.trim()
    if (!clean) {
      vectors.push([])
      continue
    }
    const output = await extractor(clean, { pooling: 'mean', normalize: true })
    vectors.push(Array.from(output.data as Float32Array))
  }
  return vectors
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'offscreen') return false

  ;(async () => {
    try {
      if (message.type === 'OFFSCREEN_LOAD_MODEL') {
        await getExtractor()
        sendResponse({ success: true, ready: isReady })
      } else if (message.type === 'OFFSCREEN_EMBED') {
        const texts = (message.payload?.texts ?? []) as string[]
        const vectors = await embedTexts(texts)
        sendResponse({ success: true, vectors })
      } else if (message.type === 'OFFSCREEN_STATUS') {
        sendResponse({ success: true, ready: isReady })
      }
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || String(err) })
    }
  })()

  return true
})
