import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';

class PlayerController {
  late final Player _player;
  late final VideoController _videoController;
  
  Player get player => _player;
  VideoController get videoController => _videoController;

  PlayerController() {
    _player = Player();
    _videoController = VideoController(_player);
  }

  Future<void> playStream(String url) async {
    await _player.open(Media(url));
    await _player.play();
  }

  Future<void> pause() async {
    await _player.pause();
  }

  Future<void> resume() async {
    await _player.play();
  }

  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  Future<void> setVolume(double volume) async {
    await _player.setVolume(volume);
  }

  Duration get position => _player.state.position;
  Duration get duration => _player.state.duration;
  bool get isPlaying => _player.state.playing;

  void setSubtitleTrack(SubtitleTrack track) {
    _player.setSubtitleTrack(track);
  }

  void setVideoTrack(VideoTrack track) {
    _player.setVideoTrack(track);
  }

  void dispose() {
    _player.dispose();
  }
}
