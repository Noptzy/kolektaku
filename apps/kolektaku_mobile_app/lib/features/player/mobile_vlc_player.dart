import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_vlc_player/flutter_vlc_player.dart';

class MobileVlcPlayer extends StatefulWidget {
  final String videoUrl;
  final String title;
  final List<Map<String, dynamic>> subtitleTracks;

  const MobileVlcPlayer({
    super.key,
    required this.videoUrl,
    required this.title,
    required this.subtitleTracks,
  });

  @override
  State<MobileVlcPlayer> createState() => _MobileVlcPlayerState();
}

class _MobileVlcPlayerState extends State<MobileVlcPlayer> {
  late final VlcPlayerController _controller;
  final Set<String> _loadedSubtitleSources = <String>{};
  final List<int> _subtitleIds = <int>[];
  int _selectedSubtitleIndex = -1;
  bool _isReady = false;
  bool _isSyncingSubtitles = false;
  String? _error;
  Timer? _subtitleRetryTimer;
  int _subtitleRetryCount = 0;

  static const int _maxSubtitleRetry = 12;

  @override
  void initState() {
    super.initState();
    _controller = VlcPlayerController.network(
      widget.videoUrl,
      autoInitialize: true,
      autoPlay: true,
      hwAcc: HwAcc.full,
      options: VlcPlayerOptions(),
    );

    _controller.addOnInitListener(_handleControllerInitialized);
  }

  void _handleControllerInitialized() {
    if (!mounted) return;

    setState(() {
      _isReady = true;
    });
    _scheduleSubtitleSync(forcePreferredSelection: true, immediate: false);
  }

  @override
  void didUpdateWidget(covariant MobileVlcPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    final subtitleListChanged = oldWidget.subtitleTracks.length != widget.subtitleTracks.length;
    if (subtitleListChanged) {
      _scheduleSubtitleSync(forcePreferredSelection: true);
    }
  }

  void _scheduleSubtitleSync({bool forcePreferredSelection = false, bool immediate = true}) {
    _subtitleRetryTimer?.cancel();
    final delay = immediate ? Duration.zero : const Duration(milliseconds: 300);
    _subtitleRetryTimer = Timer(delay, () {
      unawaited(_syncSubtitles(
        forcePreferredSelection: forcePreferredSelection,
      ));
    });
  }

  Future<void> _syncSubtitles({bool forcePreferredSelection = false}) async {
    if (_isSyncingSubtitles || !mounted) return;
    if (!_controller.value.isInitialized) {
      if (_subtitleRetryCount < _maxSubtitleRetry) {
        _subtitleRetryCount += 1;
        _scheduleSubtitleSync(forcePreferredSelection: forcePreferredSelection, immediate: false);
      }
      return;
    }

    _subtitleRetryCount = 0;
    _isSyncingSubtitles = true;
    try {
      for (var i = 0; i < widget.subtitleTracks.length; i++) {
        final track = widget.subtitleTracks[i];
        final file = (track['file'] ?? '').toString();
        if (file.isEmpty || _loadedSubtitleSources.contains(file)) {
          continue;
        }

        if (file.startsWith('http')) {
          await _controller.addSubtitleFromNetwork(file, isSelected: false);
        } else {
          await _controller.addSubtitleFromFile(File(file), isSelected: false);
        }
        _loadedSubtitleSources.add(file);
      }

      final dynamic spuTracks = await _controller.getSpuTracks();
      _subtitleIds
        ..clear()
        ..addAll(_extractSubtitleIds(spuTracks));

      if (widget.subtitleTracks.isEmpty || _subtitleIds.isEmpty) return;

      final preferredIndex = _findPreferredSubtitleIndex();
      final nextIndex = forcePreferredSelection ? preferredIndex : (_selectedSubtitleIndex >= 0 ? _selectedSubtitleIndex : preferredIndex);
      await _selectSubtitle(nextIndex);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Subtitle sync failed: $e';
        });
      }
    } finally {
      _isSyncingSubtitles = false;
    }
  }

  List<int> _extractSubtitleIds(dynamic spuTracks) {
    if (spuTracks is Map) {
      return spuTracks.keys.map((e) => int.tryParse(e.toString()) ?? -1).where((e) => e >= 0).toList();
    }
    if (spuTracks is List) {
      return List<int>.generate(spuTracks.length, (index) => index);
    }
    return <int>[];
  }

  int _findPreferredSubtitleIndex() {
    final indoIndex = widget.subtitleTracks.indexWhere(
      (track) => (track['label'] ?? '').toString().toLowerCase().contains('indonesia'),
    );
    if (indoIndex >= 0) return indoIndex;

    final englishIndex = widget.subtitleTracks.indexWhere(
      (track) => (track['label'] ?? '').toString().toLowerCase().contains('inggris'),
    );
    return englishIndex >= 0 ? englishIndex : 0;
  }

  Future<void> _selectSubtitle(int index) async {
    if (index < 0 || index >= widget.subtitleTracks.length) return;
    if (!_controller.value.isInitialized) {
      _scheduleSubtitleSync(forcePreferredSelection: true, immediate: false);
      return;
    }

    final trackId = index < _subtitleIds.length ? _subtitleIds[index] : index;
    await _controller.setSpuTrack(trackId);
    if (mounted) {
      setState(() {
        _selectedSubtitleIndex = index;
      });
    }
  }

  @override
  void dispose() {
    _subtitleRetryTimer?.cancel();
    _controller.removeOnInitListener(_handleControllerInitialized);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: Colors.black12,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: const Text(
              'Proxy lokal aktif',
              textAlign: TextAlign.right,
              style: TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                Center(
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    child: VlcPlayer(
                      controller: _controller,
                      aspectRatio: 16 / 9,
                      placeholder: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                  ),
                ),
                if (!_isReady)
                  const Positioned.fill(
                    child: ColoredBox(
                      color: Colors.black45,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  ),
              ],
            ),
          ),
          if (widget.subtitleTracks.isNotEmpty)
            Container(
              color: Colors.black54,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: DropdownButtonFormField<int>(
                dropdownColor: Colors.black87,
                initialValue: _selectedSubtitleIndex >= 0 ? _selectedSubtitleIndex : null,
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  prefixIcon: Icon(Icons.closed_caption, color: Colors.white),
                ),
                style: const TextStyle(color: Colors.white),
                hint: const Text('Pilih subtitle', style: TextStyle(color: Colors.white70)),
                items: List<DropdownMenuItem<int>>.generate(
                  widget.subtitleTracks.length,
                  (index) => DropdownMenuItem<int>(
                    value: index,
                    child: Text((widget.subtitleTracks[index]['label'] ?? 'Subtitle').toString()),
                  ),
                ),
                onChanged: (value) {
                  if (value == null) return;
                  unawaited(_selectSubtitle(value));
                },
              ),
            ),
          if (_error != null)
            Container(
              width: double.infinity,
              color: Colors.red.shade700,
              padding: const EdgeInsets.all(8),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}
