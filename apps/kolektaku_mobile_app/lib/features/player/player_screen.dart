import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'player_controller.dart';

class PlayerScreen extends StatefulWidget {
  final String videoUrl;
  final String title;
  final List<Map<String, dynamic>>? subtitleTracks;

  const PlayerScreen({
    super.key,
    required this.videoUrl,
    required this.title,
    this.subtitleTracks,
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final PlayerController _controller;
  bool _isFullScreen = false;
  int _selectedSubtitleIndex = 0;

  @override
  void initState() {
    super.initState();
    _controller = PlayerController();
    _controller.playStream(widget.videoUrl);
    if (widget.subtitleTracks != null && widget.subtitleTracks!.isNotEmpty) {
      _selectedSubtitleIndex = 0;
      // Note: we can't set subtitle track immediately because player is still opening
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: _isFullScreen ? null : AppBar(
        title: Text(widget.title),
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: Center(
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Video(
                  controller: _controller.videoController,
                  controls: AdaptiveVideoControls,
                ),
              ),
            ),
          ),
          if (widget.subtitleTracks != null && widget.subtitleTracks!.isNotEmpty)
            Container(
              color: Colors.black54,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.closed_caption, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: widget.subtitleTracks![_selectedSubtitleIndex]['label'],
                      onChanged: (val) {
                        if (val == null) return;
                        final idx = widget.subtitleTracks!.indexWhere((t) => t['label'] == val);
                        if (idx >= 0) {
                          setState(() {
                            _selectedSubtitleIndex = idx;
                          });
                          final trackUrl = widget.subtitleTracks![idx]['file'];
                          if (trackUrl != null) {
                            _controller.setSubtitleTrack(SubtitleTrack.uri(trackUrl));
                          }
                        }
                      },
                      items: widget.subtitleTracks!
                          .map((t) => DropdownMenuItem(
                                value: t['label'] as String,
                                child: Text(t['label'] as String, style: const TextStyle(color: Colors.white)),
                              ))
                          .toList(),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
