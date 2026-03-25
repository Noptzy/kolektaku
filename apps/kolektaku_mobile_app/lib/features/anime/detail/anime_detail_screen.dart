import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/app_chrome.dart';
import '../../../services/anime_service.dart';

class AnimeDetailScreen extends StatefulWidget {
  final String slug;

  const AnimeDetailScreen({super.key, required this.slug});

  @override
  State<AnimeDetailScreen> createState() => _AnimeDetailScreenState();
}

class _AnimeDetailScreenState extends State<AnimeDetailScreen> {
  final AnimeService _animeService = AnimeService();

  Map<String, dynamic>? _anime;
  List<dynamic> _episodes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAnime();
  }

  Future<void> _loadAnime() async {
    setState(() => _isLoading = true);
    try {
      final animeData = await _animeService.getAnimeBySlug(widget.slug);
      final episodeData = await _animeService.getEpisodeList(widget.slug);

      final epRaw = episodeData['data'];
      List<dynamic> eps = [];
      if (epRaw is List) {
        eps = epRaw;
      } else if (epRaw is Map && epRaw['episodes'] is List) {
        eps = epRaw['episodes'];
      }

      if (!mounted) return;
      setState(() {
        _anime = animeData['data'];
        _episodes = eps;
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
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_anime == null) {
      return const Scaffold(body: Center(child: Text('Anime not found')));
    }

    final banner = (_anime!['landscapePosterUrl'] ?? _anime!['posterUrl'] ?? '').toString();
    final poster = (_anime!['posterUrl'] ?? '').toString();
    final genres = (_anime!['genres'] as List?) ?? const [];
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: AppBackdrop(
        useSafeArea: false,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 420,
              backgroundColor: Colors.transparent,
              leading: Padding(
                padding: const EdgeInsets.only(left: 8),
                child: IconButton.filledTonal(
                  onPressed: () {
                    if (Navigator.of(context).canPop()) {
                      context.pop();
                    } else {
                      context.go('/');
                    }
                  },
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
              ),
              actions: const [
                Padding(
                  padding: EdgeInsets.only(right: 12),
                  child: ThemeModeButton(),
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    CachedNetworkImage(
                      imageUrl: banner,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(color: scheme.surfaceContainerHighest),
                      errorWidget: (context, url, error) => Container(color: scheme.surfaceContainerHighest),
                    ),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: 0.14),
                            Colors.black.withValues(alpha: 0.3),
                            Theme.of(context).scaffoldBackgroundColor,
                          ],
                          stops: const [0.15, 0.55, 1],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 130, 20, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(28),
                                child: CachedNetworkImage(
                                  imageUrl: poster,
                                  width: 118,
                                  height: 168,
                                  fit: BoxFit.cover,
                                  placeholder: (context, url) => Container(
                                    width: 118,
                                    height: 168,
                                    color: scheme.surfaceContainerHighest,
                                  ),
                                  errorWidget: (context, url, error) => Container(
                                    width: 118,
                                    height: 168,
                                    color: scheme.surfaceContainerHighest,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        _HeroBadge(label: (_anime!['type'] ?? 'TV').toString()),
                                        _HeroBadge(label: (_anime!['status'] ?? '-').toString()),
                                        if (_anime!['releaseYear'] != null)
                                          _HeroBadge(label: _anime!['releaseYear'].toString()),
                                      ],
                                    ),
                                    const SizedBox(height: 14),
                                    Text(
                                      (_anime!['title'] ?? '').toString(),
                                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppPanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SectionHeading(
                            title: 'Story capsule',
                            subtitle: 'Ringkasan, genre, dan info penting dalam satu panel.',
                          ),
                          const SizedBox(height: 14),
                          Text(
                            _cleanSynopsis((_anime!['synopsis'] ?? '').toString()),
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                  color: scheme.onSurface.withValues(alpha: 0.72),
                                ),
                          ),
                          if (genres.isNotEmpty) ...[
                            const SizedBox(height: 18),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: genres.map<Widget>((genre) {
                                final name = genre is Map ? (genre['name'] ?? '').toString() : genre.toString();
                                return Chip(label: Text(name));
                              }).toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    AppPanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SectionHeading(
                            title: 'Episode drops',
                            subtitle: _episodes.isEmpty
                                ? 'Belum ada episode tersedia.'
                                : '${_episodes.length} episode siap dibuka.',
                          ),
                          const SizedBox(height: 16),
                          if (_episodes.isEmpty)
                            const Text('No episodes available')
                          else
                            GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 3,
                                childAspectRatio: 1.15,
                                mainAxisSpacing: 10,
                                crossAxisSpacing: 10,
                              ),
                              itemCount: _episodes.length,
                              itemBuilder: (context, index) {
                                final ep = _episodes[index] as Map<String, dynamic>;
                                final epNum = (ep['episodeNumber'] ?? ep['number'] ?? '?').toString();
                                return InkWell(
                                  onTap: () => context.go('/watch/${widget.slug}/$epNum'),
                                  borderRadius: BorderRadius.circular(22),
                                  child: Ink(
                                    decoration: BoxDecoration(
                                      color: scheme.primary.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(22),
                                      border: Border.all(color: scheme.primary.withValues(alpha: 0.16)),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.play_circle_fill_rounded, color: scheme.primary, size: 28),
                                        const SizedBox(height: 8),
                                        Text('Ep $epNum', style: Theme.of(context).textTheme.titleMedium),
                                        const SizedBox(height: 4),
                                        Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 8),
                                          child: Text(
                                            (ep['title'] ?? 'Open episode').toString(),
                                            maxLines: 2,
                                            textAlign: TextAlign.center,
                                            overflow: TextOverflow.ellipsis,
                                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                  color: scheme.onSurface.withValues(alpha: 0.68),
                                                ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _cleanSynopsis(String synopsis) {
    return synopsis
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('  ', ' ')
        .trim();
  }
}

class _HeroBadge extends StatelessWidget {
  final String label;

  const _HeroBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11),
      ),
    );
  }
}
