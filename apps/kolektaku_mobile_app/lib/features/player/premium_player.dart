import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'player_controller.dart';

class PremiumPlayer extends StatefulWidget {
  final String videoUrl;
  final String title;
  final List<Map<String, dynamic>> subtitleTracks;
  final bool waitingForTranslation;
  final ValueChanged<Duration>? onTimeUpdate;
  final ValueChanged<Duration>? onSeek;

  const PremiumPlayer({
    super.key,
    required this.videoUrl,
    required this.title,
    required this.subtitleTracks,
    this.waitingForTranslation = false,
    this.onTimeUpdate,
    this.onSeek,
  });

  @override
  State<PremiumPlayer> createState() => _PremiumPlayerState();
}

class _PremiumPlayerState extends State<PremiumPlayer> {
  late final PlayerController _controller;
  bool _showControls = true;
  Timer? _hideTimer;
  double _volume = 100.0;
  bool _isMuted = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  int _selectedSubtitleIndex = -1;
  double? _dragValue;
  int _lastTimeCallbackSecond = -1;
  bool _isForcedPausedByTranslation = false;
  String? _activeSubtitleFile;
  
  late final StreamSubscription _positionSub;
  late final StreamSubscription _durationSub;
  
  // Throttle timer for mouse movement to prevent setState spam
  DateTime _lastHoverTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _controller = PlayerController();
    _controller.playStream(widget.videoUrl);

    _positionSub = _controller.player.stream.position.listen((p) {
      if (!mounted) return;
      setState(() => _position = p);

      final currentSecond = p.inSeconds;
      if (widget.onTimeUpdate != null && currentSecond != _lastTimeCallbackSecond) {
        _lastTimeCallbackSecond = currentSecond;
        widget.onTimeUpdate!(p);
      }
    });
    _durationSub = _controller.player.stream.duration.listen((d) {
      if (mounted) setState(() => _duration = d);
    });

    _startHideTimer();
  }

  @override
  void didUpdateWidget(PremiumPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);

    final newSignature = _buildSubtitleSignature(widget.subtitleTracks);
    final oldSignature = _buildSubtitleSignature(oldWidget.subtitleTracks);
    final tracksChanged = newSignature != oldSignature;

    if (tracksChanged && widget.subtitleTracks.isNotEmpty) {
      final firstTrackLabel = widget.subtitleTracks[0]['label'].toString();
      final firstTrackFile = widget.subtitleTracks[0]['file']?.toString();
      final oldFirstTrackLabel = oldWidget.subtitleTracks.isNotEmpty
          ? oldWidget.subtitleTracks[0]['label'].toString()
          : '';
      final oldFirstTrackFile = oldWidget.subtitleTracks.isNotEmpty
          ? oldWidget.subtitleTracks[0]['file']?.toString()
          : null;

      final isAiNow = firstTrackLabel.contains('AI');
      final wasAiBefore = oldFirstTrackLabel.contains('AI');
      final aiTrackChanged = firstTrackFile != oldFirstTrackFile;

      if (isAiNow && (!wasAiBefore || aiTrackChanged)) {
        _selectSubtitle(0);
      }

    }

    if (oldWidget.waitingForTranslation != widget.waitingForTranslation) {
      if (widget.waitingForTranslation && !_isForcedPausedByTranslation) {
        _controller.pause();
        _isForcedPausedByTranslation = true;
      } else if (!widget.waitingForTranslation && _isForcedPausedByTranslation) {
        _controller.resume();
        _isForcedPausedByTranslation = false;
      }
    }
  }

  String _buildSubtitleSignature(List<Map<String, dynamic>> tracks) {
    if (tracks.isEmpty) return '';
    return tracks
        .map((track) => '${track['label'] ?? ''}|${track['file'] ?? ''}')
        .join('::');
  }

  void _startHideTimer() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 4), () {
      if (mounted) setState(() => _showControls = false);
    });
  }

  void _toggleControls() {
    if (!mounted) return;
    setState(() {
      _showControls = !_showControls;
      if (_showControls) _startHideTimer();
    });
  }

  // Throttled hover logic to prevent overloading the UI thread
  void _onMouseHover(PointerEvent event) {
    final now = DateTime.now();
    if (now.difference(_lastHoverTime).inMilliseconds < 100) return;
    _lastHoverTime = now;

    if (!_showControls) {
      _toggleControls();
    } else {
      _startHideTimer();
    }
  }

  void _selectSubtitle(int index) {
    if (index < 0 || index >= widget.subtitleTracks.length) return;

    final trackUrl = widget.subtitleTracks[index]['file']?.toString();
    if (trackUrl == null || trackUrl.isEmpty) return;
    if (_selectedSubtitleIndex == index && _activeSubtitleFile == trackUrl) return;

    setState(() => _selectedSubtitleIndex = index);
    _activeSubtitleFile = trackUrl;

    if (trackUrl.startsWith('http')) {
      _controller.setSubtitleTrack(SubtitleTrack.uri(trackUrl));
    } else {
      _controller.setSubtitleTrack(SubtitleTrack.uri('file://$trackUrl'));
    }
  }

  void _seekTo(Duration target) {
    final maxSeconds = _duration.inSeconds;
    final clampedSeconds = target.inSeconds.clamp(0, maxSeconds > 0 ? maxSeconds : 0);
    final clamped = Duration(seconds: clampedSeconds);
    _controller.seek(clamped);
    widget.onSeek?.call(clamped);
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  void dispose() {
    _positionSub.cancel();
    _durationSub.cancel();
    _hideTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: ThemeData.dark().copyWith(
        primaryColor: const Color(0xFF00E5FF),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00E5FF),
          secondary: Color(0xFF00BCD4),
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.black,
        body: MouseRegion(
          onHover: _onMouseHover, // Use throttled logic
          child: GestureDetector(
            onTap: _toggleControls,
            child: Stack(
              fit: StackFit.expand,
              children: [
                // 1. Video Layer - Explicit black background and AspectRatio
                Container(
                  color: Colors.black,
                  child: Center(
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Video(
                        controller: _controller.videoController,
                        controls: NoVideoControls,
                      ),
                    ),
                  ),
                ),

                if (widget.waitingForTranslation)
                  Container(
                    color: Colors.black.withValues(alpha: 0.72),
                    child: const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 44,
                            height: 44,
                            child: CircularProgressIndicator(
                              strokeWidth: 3,
                              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00E5FF)),
                            ),
                          ),
                          SizedBox(height: 14),
                          Text(
                            'Menerjemahkan subtitle 30 detik...',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                // 2. Custom Controls (Glassmorphism Overlay)
                AnimatedOpacity(
                  opacity: _showControls ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 300),
                  child: Stack(
                    children: [
                      // Top Bar
                      _buildTopBar(),

                      // Center Play/Pause & Seek
                      _buildCenterControls(),

                      // Bottom Bar
                      _buildBottomBar(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        height: 88,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.black.withOpacity(0.8), Colors.transparent],
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.3,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Streaming lewat proxy lokal',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.72),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            _buildSubtitleSelector(),
          ],
        ),
      ),
    );
  }

  Widget _buildSubtitleSelector() {
    return PopupMenuButton<int>(
      icon: const Icon(Icons.closed_caption, color: Colors.white, size: 28),
      tooltip: 'Subtitles',
      onSelected: _selectSubtitle,
      color: Colors.black.withOpacity(0.8),
      itemBuilder: (context) {
        if (widget.subtitleTracks.isEmpty) {
          return [
            const PopupMenuItem(
              value: -1,
              child: Text('No Subtitles', style: TextStyle(color: Colors.white70)),
            )
          ];
        }
        return List.generate(widget.subtitleTracks.length, (i) {
          final isSelected = i == _selectedSubtitleIndex;
          final label = widget.subtitleTracks[i]['label'] as String;
          return PopupMenuItem(
            value: i,
            child: Row(
              children: [
                Icon(
                  isSelected ? Icons.check_circle : Icons.circle_outlined,
                  color: isSelected ? const Color(0xFF00E5FF) : Colors.white24,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.white70,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ],
            ),
          );
        });
      },
    );
  }

  Widget _buildCenterControls() {
    return Center(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildCircleButton(
            icon: Icons.replay_10,
            onPressed: () => _seekTo(_position - const Duration(seconds: 10)),
          ),
          const SizedBox(width: 30),
          _buildPlayPauseButton(),
          const SizedBox(width: 30),
          _buildCircleButton(
            icon: Icons.forward_10,
            onPressed: () => _seekTo(_position + const Duration(seconds: 10)),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayPauseButton() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(50),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withOpacity(0.2)),
          ),
          child: IconButton(
            icon: Icon(
              _controller.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
              size: 50,
              color: const Color(0xFF00E5FF),
            ),
            onPressed: () {
              if (_controller.isPlaying) _controller.pause();
              else _controller.resume();
              setState(() {});
            },
          ),
        ),
      ),
    );
  }

  Widget _buildCircleButton({required IconData icon, required VoidCallback onPressed}) {
    return IconButton(
      icon: Icon(icon, color: Colors.white.withOpacity(0.8), size: 36),
      onPressed: onPressed,
    );
  }

  Widget _buildBottomBar() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [Colors.black.withOpacity(0.9), Colors.transparent],
          ),
        ),
        padding: const EdgeInsets.only(left: 20, right: 20, bottom: 30, top: 40),
        child: Column(
          children: [
            // Progress Bar
            Row(
              children: [
                Text(
                  _formatDuration(_position),
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
                Expanded(
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      trackHeight: 4,
                      thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                      overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
                      activeTrackColor: const Color(0xFF00E5FF),
                      inactiveTrackColor: Colors.white24,
                      thumbColor: Colors.white,
                    ),
                    child: Slider(
                      value: (_dragValue ?? _position.inSeconds.toDouble())
                          .clamp(0.0, _duration.inSeconds.toDouble().clamp(1.0, double.infinity)),
                      max: _duration.inSeconds.toDouble().clamp(1.0, double.infinity),
                      onChanged: (val) {
                        setState(() {
                          _dragValue = val;
                        });
                      },
                      onChangeEnd: (val) {
                        setState(() {
                          _dragValue = null;
                        });
                        _seekTo(Duration(seconds: val.toInt()));
                      },
                    ),
                  ),
                ),
                Text(
                  _formatDuration(_duration),
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
            
            // Bottom Controls
            Row(
              children: [
                _buildVolumeControl(),
                const Spacer(),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '1080P • AUTO',
                      style: TextStyle(
                        color: Colors.white38,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      'KOLEKTAKU AI POWERED',
                      style: TextStyle(
                        color: Color(0xFF00E5FF),
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                IconButton(
                  icon: const Icon(Icons.fullscreen, color: Colors.white70),
                  onPressed: () {
                    // Implementation for full screen toggle
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVolumeControl() {
    return Row(
      children: [
        IconButton(
          icon: Icon(
            _isMuted || _volume == 0 ? Icons.volume_off : Icons.volume_up,
            color: Colors.white70,
            size: 20,
          ),
          onPressed: () {
            setState(() {
              _isMuted = !_isMuted;
              _controller.setVolume(_isMuted ? 0 : _volume);
            });
          },
        ),
        SizedBox(
          width: 80,
          child: SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 2,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 4),
              activeTrackColor: Colors.white70,
              inactiveTrackColor: Colors.white10,
              thumbColor: Colors.white,
            ),
            child: Slider(
              value: _isMuted ? 0 : _volume,
              max: 100.0,
              onChanged: (val) {
                setState(() {
                  _volume = val;
                  _isMuted = false;
                  _controller.setVolume(val);
                });
              },
            ),
          ),
        ),
      ],
    );
  }
}
