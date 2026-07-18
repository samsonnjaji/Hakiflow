import 'dart:async';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:record/record.dart';

class VoiceService {
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();
  StreamSubscription<Uint8List>? _subscription;
  Completer<void>? _streamDone;
  final List<int> _pcm = [];

  bool recording = false;

  Future<void> start() async {
    if (!await _recorder.hasPermission()) {
      throw StateError('Microphone permission was not granted.');
    }
    _pcm.clear();
    _streamDone = Completer<void>();
    final stream = await _recorder.startStream(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
        autoGain: true,
        echoCancel: true,
        noiseSuppress: true,
      ),
    );
    _subscription = stream.listen(
      _pcm.addAll,
      onDone: () {
        if (!(_streamDone?.isCompleted ?? true)) {
          _streamDone!.complete();
        }
      },
    );
    recording = true;
  }

  Future<Uint8List> stop() async {
    if (!recording) {
      throw StateError('Voice recording has not started.');
    }
    await _recorder.stop();
    await _streamDone?.future.timeout(
      const Duration(seconds: 2),
      onTimeout: () {},
    );
    await _subscription?.cancel();
    recording = false;
    if (_pcm.isEmpty) {
      throw StateError('No audio was captured. Please try again.');
    }
    return _wav(Uint8List.fromList(_pcm), sampleRate: 16000, channels: 1);
  }

  Future<void> play(Uint8List mp3) => _player.play(BytesSource(mp3));

  Future<void> dispose() async {
    await _subscription?.cancel();
    await _recorder.dispose();
    await _player.dispose();
  }

  Uint8List _wav(
    Uint8List pcm, {
    required int sampleRate,
    required int channels,
  }) {
    const bitsPerSample = 16;
    final byteRate = sampleRate * channels * bitsPerSample ~/ 8;
    final blockAlign = channels * bitsPerSample ~/ 8;
    final output = Uint8List(44 + pcm.length);
    final view = ByteData.sublistView(output);
    void ascii(int offset, String value) {
      for (var index = 0; index < value.length; index++) {
        output[offset + index] = value.codeUnitAt(index);
      }
    }

    ascii(0, 'RIFF');
    view.setUint32(4, 36 + pcm.length, Endian.little);
    ascii(8, 'WAVE');
    ascii(12, 'fmt ');
    view.setUint32(16, 16, Endian.little);
    view.setUint16(20, 1, Endian.little);
    view.setUint16(22, channels, Endian.little);
    view.setUint32(24, sampleRate, Endian.little);
    view.setUint32(28, byteRate, Endian.little);
    view.setUint16(32, blockAlign, Endian.little);
    view.setUint16(34, bitsPerSample, Endian.little);
    ascii(36, 'data');
    view.setUint32(40, pcm.length, Endian.little);
    output.setRange(44, output.length, pcm);
    return output;
  }
}
