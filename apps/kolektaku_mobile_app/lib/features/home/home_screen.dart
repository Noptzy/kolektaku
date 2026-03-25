import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/ui/app_chrome.dart';
import '../../services/anime_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AnimeService _animeService = AnimeService();

  List<dynamic> _animeList = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final animeData = await _animeService.getAllAnime();
      final rawAnime = animeData['data'];

      List<dynamic> animeList = [];
      if (rawAnime is List) {
        animeList = rawAnime;
      } else if (rawAnime is Map && rawAnime['anime'] is List) {
        animeList = rawAnime['anime'];
      }

      if (!mounted) return;
      setState(() {
        _animeList = animeList;
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
    final featured = _animeList.isNotEmpty ? Map<String, dynamic>.from(_animeList.first as Map) : null;
    final topHits = _animeList.take(10).toList();
    final newEpisodes = _animeList.reversed.take(12).toList();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: AppBackdrop(
        useSafeArea: false,
        child: RefreshIndicator(
          onRefresh: _loadData,
          child: ListView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            padding: EdgeInsets.zero,
            children: [
              if (_isLoading)
                SizedBox(
                  height: 420,
                  child: Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
                    ),
                  ),
                )
              else
                _HomeHero(featured: featured),
              Container(
                margin: const EdgeInsets.only(top: -20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF171B24) : Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 20, 0, 120),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _SectionHeader(
                        title: 'Top Hits Anime',
                        onSeeAll: () => context.go('/search'),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 210,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.only(right: 22),
                          itemCount: topHits.length,
                          separatorBuilder: (context, index) => const SizedBox(width: 12),
                          itemBuilder: (context, index) {
                            final anime = Map<String, dynamic>.from(topHits[index] as Map);
                            return _RankedPosterCard(
                              anime: anime,
                              rank: index + 1,
                              score: _mockScore(index),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 20),
                      _SectionHeader(
                        title: 'New Episode Releases',
                        onSeeAll: () => context.go('/schedule'),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 220,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.only(right: 22),
                          itemCount: newEpisodes.length,
                          separatorBuilder: (context, index) => const SizedBox(width: 12),
                          itemBuilder: (context, index) {
                            final anime = Map<String, dynamic>.from(newEpisodes[index] as Map);
                            final ep = anime['animeDetail']?['totalEpisodes']?.toString() ?? '${index + 1}';
                            return _EpisodePosterCard(
                              anime: anime,
                              episodeLabel: 'Episode $ep',
                              score: _mockScore(index + 2),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _mockScore(int seed) {
    final value = 9.0 + ((seed % 7) / 10);
    return value.toStringAsFixed(1);
  }
}

class _HomeHero extends StatelessWidget {
  final Map<String, dynamic>? featured;

  const _HomeHero({required this.featured});

  @override
  Widget build(BuildContext context) {
    final poster = (featured?['landscapePosterUrl'] ?? featured?['posterUrl'] ?? '').toString();
    final title = (featured?['title'] ?? 'Anime Highlight').toString();
    final subtitle = _buildSubtitle(featured);

    return SizedBox(
      height: 430,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CachedNetworkImage(
            imageUrl: poster,
            fit: BoxFit.cover,
            placeholder: (context, imageUrl) => Container(color: const Color(0xFF161B25)),
            errorWidget: (context, imageUrl, error) => Container(color: const Color(0xFF161B25)),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.25),
                  Colors.black.withValues(alpha: 0.18),
                  Colors.black.withValues(alpha: 0.72),
                ],
                stops: const [0, 0.45, 1],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 34),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: const Color(0xFF22C55E),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'A',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => context.go('/search'),
                        icon: const Icon(Icons.search_rounded, color: Colors.white),
                      ),
                      const ThemeModeButton(),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 38,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF22C55E),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: const StadiumBorder(),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        ),
                        onPressed: featured == null
                            ? null
                            : () => context.go('/anime/${featured!['slug']}'),
                        icon: const Icon(Icons.play_circle_fill_rounded, size: 20),
                        label: const Text('Play', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white54),
                          shape: const StadiumBorder(),
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        ),
                        onPressed: () {},
                        icon: const Icon(Icons.add_rounded, size: 20),
                        label: const Text('My List', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _buildSubtitle(Map<String, dynamic>? anime) {
    if (anime == null) return 'Action, Shounen, Adventure';
    final type = (anime['type'] ?? '').toString();
    final year = anime['releaseYear']?.toString() ?? '';
    if (type.isEmpty && year.isEmpty) return 'Anime Highlight';
    if (type.isNotEmpty && year.isNotEmpty) return '$type - $year';
    return '$type$year';
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback onSeeAll;

  const _SectionHeader({required this.title, required this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 22),
      child: Row(
        children: [
          Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const Spacer(),
          TextButton(
            onPressed: onSeeAll,
            child: const Text(
              'See all',
              style: TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _RankedPosterCard extends StatelessWidget {
  final Map<String, dynamic> anime;
  final int rank;
  final String score;

  const _RankedPosterCard({required this.anime, required this.rank, required this.score});

  @override
  Widget build(BuildContext context) {
    final poster = (anime['posterUrl'] ?? anime['poster'] ?? '').toString();

    return GestureDetector(
      onTap: () => context.go('/anime/${anime['slug']}'),
      child: SizedBox(
        width: 152,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            fit: StackFit.expand,
            children: [
              CachedNetworkImage(
                imageUrl: poster,
                fit: BoxFit.cover,
                placeholder: (context, imageUrl) => Container(color: const Color(0xFF1F2937)),
                errorWidget: (context, imageUrl, error) => Container(color: const Color(0xFF1F2937)),
              ),
              Positioned(
                top: 10,
                left: 10,
                child: _ScoreBadge(score: score),
              ),
              Positioned(
                left: 12,
                bottom: 10,
                child: Text(
                  '$rank',
                  style: const TextStyle(
                    fontSize: 44,
                    fontWeight: FontWeight.w800,
                    color: Colors.white70,
                    height: 1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EpisodePosterCard extends StatelessWidget {
  final Map<String, dynamic> anime;
  final String episodeLabel;
  final String score;

  const _EpisodePosterCard({required this.anime, required this.episodeLabel, required this.score});

  @override
  Widget build(BuildContext context) {
    final poster = (anime['posterUrl'] ?? anime['poster'] ?? '').toString();
    return GestureDetector(
      onTap: () => context.go('/anime/${anime['slug']}'),
      child: SizedBox(
        width: 170,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            fit: StackFit.expand,
            children: [
              CachedNetworkImage(
                imageUrl: poster,
                fit: BoxFit.cover,
                placeholder: (context, imageUrl) => Container(color: const Color(0xFF1F2937)),
                errorWidget: (context, imageUrl, error) => Container(color: const Color(0xFF1F2937)),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.18),
                      Colors.black.withValues(alpha: 0.5),
                    ],
                  ),
                ),
              ),
              Positioned(top: 10, left: 10, child: _ScoreBadge(score: score)),
              Positioned(
                left: 10,
                bottom: 10,
                child: Text(
                  episodeLabel,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScoreBadge extends StatelessWidget {
  final String score;

  const _ScoreBadge({required this.score});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF22C55E),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        score,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11),
      ),
    );
  }
}
