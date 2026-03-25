import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../../services/anime_service.dart';
import '../../services/translation_service.dart';
import '../../utils/translation.dart';
import './premium_player.dart';

class WatchScreen extends StatefulWidget {
  final String slug;
  final String episode;

  const WatchScreen({super.key, required this.slug, required this.episode});

  @override
  State<WatchScreen> createState() => _WatchScreenState();
}

class _WatchScreenState extends State<WatchScreen> {
  static const int _windowSeconds = 30;

  final AnimeService _animeService = AnimeService();
  final TranslationService _translationService = TranslationService();

  String? _videoUrl;
  List<Map<String, dynamic>> _subtitleTracks = [];
  final bool _useLocalProxy = true;
  bool _loading = true;
  bool _isTranslating = false;
  bool _waitingForWindowTranslation = false;
  String? _error;

  String? _aiSourceUrl;
  String? _aiTrackFilePath;
  List<_VttCue> _aiCues = <_VttCue>[];
  final Set<int> _translatedCueIndices = <int>{};
  final Set<int> _translatedWindowStarts = <int>{};
  int _activeWindowStart = -1;
  int _translationJobId = 0;
  int _lastHandledSecond = -1;
  bool _translationInProgress = false;
  int? _queuedWindowStart;
  bool _queuedWindowBlocking = false;

  @override
  void initState() {
    super.initState();
    _loadStream();
  }

  Future<void> _loadStream() async {
    try {
      final res = await _animeService.getEpisodeStream(widget.slug, widget.episode);
      final data = res['data'];

      String? selectedSource;
      final tracks = <Map<String, dynamic>>[];
      String? englishTrackUrl;
      bool hasIndonesianTrack = false;

      if (data != null && data['stream'] != null) {
        final stream = data['stream'];
        final streamData = stream['data'] ?? stream;

        if (streamData['sources'] is List && streamData['sources'].isNotEmpty) {
          final sources = List<Map<String, dynamic>>.from(streamData['sources']);
          selectedSource = _pickBestSource(sources)?['file']?.toString();
        }

        if (streamData['tracks'] is List) {
          final rawTracks = List<Map<String, dynamic>>.from(streamData['tracks'])
              .where((t) {
                final kind = (t['kind'] ?? '').toString().toLowerCase();
                return kind == 'captions' || kind == 'subtitles';
              })
              .toList();

          for (final raw in rawTracks) {
            final originalFile = (raw['file'] ?? '').toString();
            if (originalFile.isEmpty) continue;

            final rawLabel = (raw['label'] ?? 'Unknown').toString();
            final translatedLabel = Translator.translate(rawLabel);
            final rawLabelLower = rawLabel.toLowerCase();
            final translatedLower = translatedLabel.toLowerCase();

            if (rawLabelLower.contains('indones') || translatedLower.contains('indo')) {
              hasIndonesianTrack = true;
            }

            if (englishTrackUrl == null &&
                (rawLabelLower.contains('english') || rawLabelLower.contains('inggris') || rawLabelLower.startsWith('eng'))) {
              englishTrackUrl = originalFile;
            }

            tracks.add({
              'file': _wrapProxyUrl(originalFile),
              'originalFile': originalFile,
              'rawLabel': rawLabel,
              'label': translatedLabel,
            });
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _videoUrl = _useLocalProxy && selectedSource != null ? _wrapProxyUrl(selectedSource) : selectedSource;
        _subtitleTracks = tracks;
        _loading = false;
      });

      if (!hasIndonesianTrack && englishTrackUrl != null) {
        await _prepareDynamicAiTrack(englishTrackUrl);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Map<String, dynamic>? _pickBestSource(List<Map<String, dynamic>> sources) {
    if (sources.isEmpty) return null;

    final withFile = sources.where((s) => (s['file'] ?? '').toString().isNotEmpty).toList();
    if (withFile.isEmpty) return sources.first;

    for (final source in withFile) {
      final file = source['file'].toString().toLowerCase();
      if (file.contains('master.m3u8')) {
        return source;
      }
    }

    for (final source in withFile) {
      final file = source['file'].toString().toLowerCase();
      final type = (source['type'] ?? '').toString().toLowerCase();
      if (type == 'hls' && file.contains('.m3u8')) {
        return source;
      }
    }

    for (final source in withFile) {
      final file = source['file'].toString().toLowerCase();
      if (file.contains('.m3u8')) {
        return source;
      }
    }

    return withFile.first;
  }

  String _wrapProxyUrl(dynamic url) {
    final raw = (url ?? '').toString();
    if (raw.isEmpty) return raw;
    if (raw.startsWith('http://127.0.0.1:8080/?url=')) return raw;
    return 'http://127.0.0.1:8080/?url=${Uri.encodeComponent(raw)}';
  }

  Future<void> _prepareDynamicAiTrack(String vttUrl) async {
    if (!mounted) return;

    setState(() {
      _isTranslating = true;
      _waitingForWindowTranslation = true;
    });

    try {
      final response = await http.get(Uri.parse(_wrapProxyUrl(vttUrl)));
      if (response.statusCode != 200) {
        return;
      }

      final cues = _parseVtt(response.body);
      if (cues.isEmpty) {
        return;
      }

      _aiSourceUrl = vttUrl;
      _aiCues = cues;
      _translatedCueIndices.clear();
      _translatedWindowStarts.clear();
      _activeWindowStart = -1;
      _lastHandledSecond = -1;
      _queuedWindowStart = null;
      _queuedWindowBlocking = false;
      _translationInProgress = false;

      await _writeAiTrackFile();
      if (!mounted) return;

      setState(() {
        _upsertAiTrack();
      });

      await _startWindowTranslation(windowStart: 0, blockPlayback: true, force: true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal memuat subtitle AI: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isTranslating = false;
          if (_aiTrackFilePath == null) {
            _waitingForWindowTranslation = false;
          }
        });
      }
    }
  }

  int _windowStartForSecond(int second) {
    final safeSecond = math.max(0, second);
    return (safeSecond ~/ _windowSeconds) * _windowSeconds;
  }

  Future<void> _startWindowTranslation({
    required int windowStart,
    required bool blockPlayback,
    bool force = false,
  }) async {
    if (_aiTrackFilePath == null || _aiCues.isEmpty) return;
    if (!force && _translatedWindowStarts.contains(windowStart)) return;

    if (_translationInProgress && !force) {
      _queuedWindowStart = windowStart;
      _queuedWindowBlocking = _queuedWindowBlocking || blockPlayback;
      return;
    }

    final jobId = ++_translationJobId;
    _translationInProgress = true;
    _activeWindowStart = windowStart;

    if (mounted) {
      setState(() {
        _isTranslating = true;
        if (blockPlayback) {
          _waitingForWindowTranslation = true;
        }
      });
    }

    final windowEnd = windowStart + _windowSeconds;
    final targetCueIndexes = <int>[];
    for (var i = 0; i < _aiCues.length; i++) {
      final startSec = _aiCues[i].startSeconds;
      if (startSec >= windowStart && startSec < windowEnd) {
        targetCueIndexes.add(i);
      }
    }

    final pendingIndexes = targetCueIndexes.where((i) => !_translatedCueIndices.contains(i)).toList();

    try {
      if (pendingIndexes.isNotEmpty) {
        final payload = pendingIndexes
            .map((i) => '[[IDX:$i]] ${_aiCues[i].textLines.join(' ').trim()}')
            .join('\n');

        final translatedBatch = await _translationService.translateBatch(payload);
        if (!mounted || jobId != _translationJobId) return;

        if (translatedBatch != null && translatedBatch.trim().isNotEmpty) {
          _applyTranslatedBatch(translatedBatch, pendingIndexes);
        } else {
          await _translateCueByCueFallback(pendingIndexes, jobId);
        }

        await _writeAiTrackFile();
        if (!mounted || jobId != _translationJobId) return;

        setState(() {
          _upsertAiTrack();
        });
      }

      _translatedWindowStarts.add(windowStart);
    } catch (_) {
      if (!mounted || jobId != _translationJobId) return;
      if (blockPlayback) {
        setState(() {
          _waitingForWindowTranslation = false;
        });
      }
    } finally {
      if (mounted && jobId == _translationJobId) {
        _translationInProgress = false;
        final queuedStart = _queuedWindowStart;
        final queuedBlocking = _queuedWindowBlocking;
        _queuedWindowStart = null;
        _queuedWindowBlocking = false;

        setState(() {
          _isTranslating = queuedStart != null;
          if (blockPlayback) {
            _waitingForWindowTranslation = false;
          }
        });

        if (queuedStart != null && !_translatedWindowStarts.contains(queuedStart)) {
          unawaited(_startWindowTranslation(
            windowStart: queuedStart,
            blockPlayback: queuedBlocking,
            force: false,
          ));
        } else {
          final nextWindowStart = windowStart + _windowSeconds;
          if (!_translatedWindowStarts.contains(nextWindowStart)) {
            unawaited(_startWindowTranslation(
              windowStart: nextWindowStart,
              blockPlayback: false,
              force: false,
            ));
          }
        }
      }
    }
  }

  Future<void> _translateCueByCueFallback(List<int> pendingIndexes, int jobId) async {
    for (final index in pendingIndexes) {
      if (!mounted || jobId != _translationJobId) return;
      final sourceText = _aiCues[index].textLines.join(' ').trim();
      if (sourceText.isEmpty) continue;

      final translated = await _translationService.translateBatch(sourceText);
      if (!mounted || jobId != _translationJobId) return;

      if (translated == null || translated.trim().isEmpty) continue;
      final normalized = Translator.applyInformalStyle(translated.trim());
      _aiCues[index] = _aiCues[index].copyWith(textLines: _wrapSubtitleText(normalized));
      _translatedCueIndices.add(index);
    }
  }

  void _applyTranslatedBatch(String translatedBatch, List<int> pendingIndexes) {
    final pendingSet = pendingIndexes.toSet();
    final regex = RegExp(r'\[\[IDX:(\d+)\]\]\s*([\s\S]*?)(?=(\[\[IDX:\d+\]\])|$)');
    final matches = regex.allMatches(translatedBatch).toList();

    if (matches.isEmpty) {
      return;
    }

    for (final match in matches) {
      final index = int.tryParse(match.group(1) ?? '');
      final text = (match.group(2) ?? '').trim();
      if (index == null || !pendingSet.contains(index) || text.isEmpty) {
        continue;
      }

      final normalized = Translator.applyInformalStyle(text);
      _aiCues[index] = _aiCues[index].copyWith(textLines: _wrapSubtitleText(normalized));
      _translatedCueIndices.add(index);
    }
  }

  Future<void> _writeAiTrackFile() async {
    final tempDir = await getTemporaryDirectory();
    final path = _aiTrackFilePath ??
        '${tempDir.path}/ai_${widget.slug}_${widget.episode}_${DateTime.now().millisecondsSinceEpoch}.vtt';

    final file = File(path);
    await file.writeAsString(_buildVtt(_aiCues));
    _aiTrackFilePath = path;
  }

  void _upsertAiTrack() {
    if (_aiTrackFilePath == null) return;

    _subtitleTracks.removeWhere((track) =>
        (track['label'] ?? '').toString().toLowerCase().contains('kolektaku ai'));

    _subtitleTracks.insert(0, {
      'file': _aiTrackFilePath,
      'originalFile': _aiSourceUrl,
      'label': 'Indonesia (Kolektaku AI) ✨',
      'rawLabel': 'Indonesia (AI)',
    });
  }

  void _handlePlayerTimeUpdate(Duration position) {
    if (_aiTrackFilePath == null) return;
    final second = position.inSeconds;
    if (second == _lastHandledSecond) return;
    _lastHandledSecond = second;

    final currentWindowStart = _windowStartForSecond(second);
    if (!_translatedWindowStarts.contains(currentWindowStart) && currentWindowStart != _activeWindowStart) {
      unawaited(_startWindowTranslation(
        windowStart: currentWindowStart,
        blockPlayback: false,
      ));
    }
  }

  void _handlePlayerSeek(Duration position) {
    if (_aiTrackFilePath == null) return;
    final targetWindowStart = _windowStartForSecond(position.inSeconds);
    if (_translatedWindowStarts.contains(targetWindowStart)) {
      final nextWindowStart = targetWindowStart + _windowSeconds;
      if (!_translatedWindowStarts.contains(nextWindowStart)) {
        unawaited(_startWindowTranslation(
          windowStart: nextWindowStart,
          blockPlayback: false,
        ));
      }
      return;
    }

    unawaited(_startWindowTranslation(
      windowStart: targetWindowStart,
      blockPlayback: true,
      force: true,
    ));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text('Episode ${widget.episode}')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_videoUrl == null || _videoUrl!.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text('Episode ${widget.episode}')),
        body: Center(child: Text(_error ?? 'Unable to load video URL')),
      );
    }

    final player = PremiumPlayer(
      key: ValueKey(_videoUrl),
      videoUrl: _videoUrl!,
      title: 'Episode ${widget.episode}',
      subtitleTracks: _subtitleTracks,
      waitingForTranslation: _waitingForWindowTranslation,
      onTimeUpdate: _handlePlayerTimeUpdate,
      onSeek: _handlePlayerSeek,
    );

    return Stack(
      children: [
        player,
        if (_isTranslating)
          Positioned(
            top: 100,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF00E5FF).withValues(alpha: 0.5)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00E5FF)),
                    ),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'AI Translating 30s window...',
                    style: TextStyle(color: Colors.white, fontSize: 12, decoration: TextDecoration.none),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

List<_VttCue> _parseVtt(String content) {
  final lines = content.replaceAll('\r\n', '\n').split('\n');
  final cues = <_VttCue>[];
  var i = 0;

  while (i < lines.length) {
    final line = lines[i].trim();

    if (line.isEmpty || line.toUpperCase() == 'WEBVTT' || line.startsWith('NOTE')) {
      i++;
      continue;
    }

    String timingLine = line;
    if (!timingLine.contains('-->')) {
      i++;
      if (i >= lines.length) break;
      timingLine = lines[i].trim();
    }

    if (!timingLine.contains('-->')) {
      i++;
      continue;
    }

    i++;
    final textLines = <String>[];
    while (i < lines.length && lines[i].trim().isNotEmpty) {
      textLines.add(lines[i].trim());
      i++;
    }

    final startPart = timingLine.split('-->').first.trim();
    final startSeconds = _parseTimestampToSeconds(startPart);
    cues.add(_VttCue(timing: timingLine, textLines: textLines, startSeconds: startSeconds));

    while (i < lines.length && lines[i].trim().isEmpty) {
      i++;
    }
  }

  return cues;
}

double _parseTimestampToSeconds(String raw) {
  final normalized = raw.replaceAll(',', '.').trim();
  final parts = normalized.split(':');
  if (parts.length < 2) return 0;

  double sec = 0;
  if (parts.length == 3) {
    sec += (double.tryParse(parts[0]) ?? 0) * 3600;
    sec += (double.tryParse(parts[1]) ?? 0) * 60;
    sec += double.tryParse(parts[2]) ?? 0;
  } else {
    sec += (double.tryParse(parts[0]) ?? 0) * 60;
    sec += double.tryParse(parts[1]) ?? 0;
  }
  return sec;
}

String _buildVtt(List<_VttCue> cues) {
  final buffer = StringBuffer('WEBVTT\n\n');
  for (var i = 0; i < cues.length; i++) {
    final cue = cues[i];
    buffer.writeln(i + 1);
    buffer.writeln(cue.timing);
    for (final line in cue.textLines) {
      buffer.writeln(line);
    }
    buffer.writeln();
  }
  return buffer.toString();
}

List<String> _wrapSubtitleText(String text) {
  final cleaned = text.trim();
  if (cleaned.isEmpty) return <String>[];

  const maxChars = 44;
  final words = cleaned.split(RegExp(r'\s+'));
  final lines = <String>[];
  final current = StringBuffer();

  for (final word in words) {
    final candidate = current.isEmpty ? word : '${current.toString()} $word';
    if (candidate.length > maxChars && current.isNotEmpty) {
      lines.add(current.toString());
      current
        ..clear()
        ..write(word);
    } else {
      if (current.isNotEmpty) current.write(' ');
      current.write(word);
    }
  }

  if (current.isNotEmpty) {
    lines.add(current.toString());
  }

  return lines;
}

class _VttCue {
  final String timing;
  final List<String> textLines;
  final double startSeconds;

  const _VttCue({
    required this.timing,
    required this.textLines,
    required this.startSeconds,
  });

  _VttCue copyWith({
    String? timing,
    List<String>? textLines,
    double? startSeconds,
  }) {
    return _VttCue(
      timing: timing ?? this.timing,
      textLines: textLines ?? this.textLines,
      startSeconds: startSeconds ?? this.startSeconds,
    );
  }
}
