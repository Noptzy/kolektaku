import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/app_chrome.dart';
import '../../../services/anime_service.dart';

class EpisodeListScreen extends StatefulWidget {
  final String slug;

  const EpisodeListScreen({super.key, required this.slug});

  @override
  State<EpisodeListScreen> createState() => _EpisodeListScreenState();
}

class _EpisodeListScreenState extends State<EpisodeListScreen> {
  final AnimeService _animeService = AnimeService();

  List<dynamic> _episodes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadEpisodes();
  }

  Future<void> _loadEpisodes() async {
    setState(() => _isLoading = true);
    try {
      final data = await _animeService.getEpisodeList(widget.slug);
      final raw = data['data'];
      List<dynamic> episodes = [];
      if (raw is List) {
        episodes = raw;
      } else if (raw is Map && raw['episodes'] is List) {
        episodes = raw['episodes'];
      }

      if (!mounted) return;
      setState(() {
        _episodes = episodes;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
          children: [
            Row(
              children: [
                IconButton.filledTonal(
                  onPressed: () {
                    if (Navigator.of(context).canPop()) {
                      context.pop();
                    } else {
                      context.go('/anime/${widget.slug}');
                    }
                  },
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Episode list', style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text(widget.slug, style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
                const ThemeModeButton(),
              ],
            ),
            const SizedBox(height: 18),
            AppPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeading(
                    title: 'Semua episode',
                    subtitle: _isLoading
                        ? 'Memuat daftar episode...'
                        : '${_episodes.length} episode siap ditonton.',
                  ),
                  const SizedBox(height: 16),
                  if (_isLoading)
                    const Center(child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: CircularProgressIndicator(),
                    ))
                  else if (_episodes.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('Belum ada episode tersedia.'),
                    )
                  else
                    ..._episodes.asMap().entries.map((entry) {
                      final episode = Map<String, dynamic>.from(entry.value as Map);
                      final epNum = (episode['episodeNumber'] ?? episode['number'] ?? '?').toString();
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () => context.go('/watch/${widget.slug}/$epNum'),
                          borderRadius: BorderRadius.circular(22),
                          child: Ink(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(22),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    epNum,
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                          color: Theme.of(context).colorScheme.primary,
                                        ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('Episode $epNum', style: Theme.of(context).textTheme.titleMedium),
                                      const SizedBox(height: 4),
                                      Text(
                                        (episode['title'] ?? 'Open episode').toString(),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: Theme.of(context).textTheme.bodyMedium,
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.play_circle_fill_rounded),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
