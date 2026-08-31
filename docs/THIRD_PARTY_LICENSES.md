# Third-party licenses

## Moonshine Tiny JA model

- Model: `sherpa-onnx-moonshine-tiny-ja-quantized-2026-02-27`
- Bundled directory: `assets/models/moonshine-tiny-ja`
- Publisher: Moonshine AI / sherpa-onnx model distribution
- Source: <https://huggingface.co/csukuangfj2/sherpa-onnx-moonshine-tiny-ja-quantized-2026-02-27>
- License: Moonshine Community License (free research/non-commercial use and limited commercial
  use under its terms; the full text is bundled at `assets/models/moonshine-tiny-ja/LICENSE`)
- Distribution notice: `assets/models/moonshine-tiny-ja/NOTICE` is bundled with the model.

Product attribution: **Powered by Moonshine AI**. The same attribution is shown in the app's
第三者ライセンス screen.

The two ONNX model files are gzip-compressed in the repository to avoid accidental secret-scanner
matches inside opaque model bytes. The Android config plugin expands them into the native assets
directory during prebuild; runtime still receives the original ONNX files. File-level checksums
for the committed assets are recorded in `assets/moonshine-tiny-ja.sha256`.

## react-native-sherpa-onnx

- Version: `0.4.3`
- Android native runtime: `sherpa-onnx-android-v1.13.2-1`
- Source: <https://github.com/XDcobra/react-native-sherpa-onnx>
- License: MIT

The Android build disables the package's optional FFmpeg and libarchive features because this
application only uses PCM capture and offline STT. The package's native runtime and third-party
license notices are kept with the dependency at build time.

## expo-speech-recognition

- Version: `3.1.3`
- Source: <https://github.com/jamsch/expo-speech-recognition>
- License: MIT

Android uses this package only with `requiresOnDeviceRecognition: true`; no network speech
recognition endpoint is used.
