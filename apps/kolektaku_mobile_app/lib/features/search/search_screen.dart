import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/ui/app_chrome.dart';
import '../../services/anime_service.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final AnimeService _animeService = AnimeService();
  final TextEditingController _searchController = TextEditingController();

  List<dynamic> _topHits = [];
  List<dynamic> _results = [];
  final Set<String> _myList = <String>{};
  bool _isLoading = true;
  String? _error;
  bool _hasSearched = false;

  @override
  void initState() {
    super.initState();
    _loadTopHits();
  }

  Future<void> _loadTopHits() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await _animeService.getAllAnime();
      final raw = data['data'];
      List<dynamic> topHits = [];
      if (raw is List) {
        topHits = raw;
      } else if (raw is Map && raw['anime'] is List) {
        topHits = raw['anime'];
      }

      if (!mounted) return;
      setState(() {
        _topHits = topHits.take(20).toList();
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _search(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      setState(() {
        _hasSearched = false;
        _results = [];
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _hasSearched = true;
    });

    try {
      final data = await _animeService.searchAnime(trimmed);
      final raw = data['data'];
      List<dynamic> results = [];
      if (raw is List) {
        results = raw;
      } else if (raw is Map && raw['anime'] is List) {
        results = raw['anime'];
      }

      if (!mounted) return;
      setState(() {
        _results = results;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final displayItems = _hasSearched ? _results : _topHits;

    return Scaffold(
      body: AppBackdrop(
        child: RefreshIndicator(
          onRefresh: _loadTopHits,
          child: ListView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _hasSearched ? 'Search Results' : 'Top Hits Anime',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                  ),
                  const ThemeModeButton(),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                onSubmitted: _search,
                decoration: InputDecoration(
                  hintText: 'Cari anime...',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: IconButton(
                    onPressed: () => _search(_searchController.text),
                    icon: const Icon(Icons.arrow_forward_rounded),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.only(top: 32),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _SearchInfoState(
                  title: 'Gagal memuat data',
                  subtitle: _error!,
                  icon: Icons.error_outline_rounded,
                )
              else if (displayItems.isEmpty)
                const _SearchInfoState(
                  title: 'Tidak ada hasil',
                  subtitle: 'Coba kata kunci lain, atau cek Top Hits.',
                  icon: Icons.search_off_rounded,
                )
              else
                ...displayItems.asMap().entries.map(
                  (entry) {
                    final index = entry.key;
                    final anime = Map<String, dynamic>.from(entry.value as Map);
                    final slug = (anime['slug'] ?? '').toString();
                    final isSaved = _myList.contains(slug);

                    return _TopHitTile(
                      anime: anime,
                      rank: index + 1,
                      score: _mockScore(index),
                      isSaved: isSaved,
                      onToggleSave: () {
                        if (slug.isEmpty) return;
                        setState(() {
                          if (isSaved) {
                            _myList.remove(slug);
                          } else {
                            _myList.add(slug);
                          }
                        });
                      },
                    );
                  },
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

class _TopHitTile extends StatelessWidget {
  final Map<String, dynamic> anime;
  final int rank;
  final String score;
  final bool isSaved;
  final VoidCallback onToggleSave;

  const _TopHitTile({
    required this.anime,
    required this.rank,
    required this.score,
    required this.isSaved,
    required this.onToggleSave,
  });

  @override
  Widget build(BuildContext context) {
    final poster = (anime['posterUrl'] ?? anime['poster'] ?? '').toString();
    final title = (anime['title'] ?? 'Unknown').toString();
    final type = (anime['type'] ?? '').toString();
    final year = (anime['releaseYear'] ?? '').toString();

    return GestureDetector(
      onTap: () => context.go('/anime/${anime['slug']}'),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 132,
              height: 165,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CachedNetworkImage(
                      imageUrl: poster,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(color: const Color(0xFF374151)),
                      errorWidget: (context, url, error) => Container(color: const Color(0xFF374151)),
                    ),
                    Positioned(top: 10, left: 10, child: _SmallScoreBadge(score: score)),
                    Positioned(
                      left: 10,
                      bottom: 6,
                      child: Text(
                        '$rank',
                        style: const TextStyle(
                          fontSize: 40,
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
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    [year, 'Japan'].where((e) => e.isNotEmpty).join(' | '),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Genre: ${type.isEmpty ? 'Anime' : type}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62),
                        ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: onToggleSave,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF22C55E),
                      side: BorderSide(color: isSaved ? const Color(0xFF22C55E) : const Color(0xFF22C55E)),
                      backgroundColor: isSaved ? const Color(0xFFE9FCEB) : Colors.transparent,
                      shape: const StadiumBorder(),
                    ),
                    icon: Icon(isSaved ? Icons.check_rounded : Icons.add_rounded),
                    label: const Text('My List', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmallScoreBadge extends StatelessWidget {
  final String score;

  const _SmallScoreBadge({required this.score});

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

class _SearchInfoState extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const _SearchInfoState({required this.title, required this.subtitle, required this.icon});

  @override
  Widget build(BuildContext context) {
    return AppPanel(
      child: Column(
        children: [
          Icon(icon, size: 44, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 10),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(subtitle, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
