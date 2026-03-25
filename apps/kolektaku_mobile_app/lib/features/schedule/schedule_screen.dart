import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/ui/app_chrome.dart';
import '../../services/schedule_service.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  final ScheduleService _scheduleService = ScheduleService();

  List<Map<String, dynamic>> _items = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final res = await _scheduleService.getWeeklySchedule();
      final raw = res['data'];

      final flattened = <Map<String, dynamic>>[];
      if (raw is Map) {
        for (final entry in raw.entries) {
          final dateKey = entry.key;
          final value = entry.value;
          if (value is List) {
            for (final item in value) {
              if (item is Map) {
                final map = Map<String, dynamic>.from(item);
                map['dateKey'] = dateKey;
                flattened.add(map);
              }
            }
          }
        }
      }

      flattened.sort((a, b) {
        final aDate = DateTime.tryParse((a['airingAt'] ?? '').toString());
        final bDate = DateTime.tryParse((b['airingAt'] ?? '').toString());
        if (aDate == null || bDate == null) return 0;
        return bDate.compareTo(aDate);
      });

      if (!mounted) return;
      setState(() {
        _items = flattened;
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
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackdrop(
        child: RefreshIndicator(
          onRefresh: _loadSchedule,
          child: ListView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text('Notification', style: Theme.of(context).textTheme.headlineMedium),
                  ),
                  const ThemeModeButton(),
                  const SizedBox(width: 6),
                  IconButton.filledTonal(onPressed: () {}, icon: const Icon(Icons.more_horiz_rounded)),
                ],
              ),
              const SizedBox(height: 14),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.only(top: 32),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _FeedInfo(
                  title: 'Gagal memuat notifikasi',
                  subtitle: _error!,
                  icon: Icons.error_outline_rounded,
                )
              else if (_items.isEmpty)
                const _FeedInfo(
                  title: 'Belum ada update',
                  subtitle: 'Notifikasi jadwal episode akan muncul di sini.',
                  icon: Icons.notifications_none_rounded,
                )
              else
                ..._items.map((item) => _NotificationTile(item: item)),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final Map<String, dynamic> item;

  const _NotificationTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final koleksi = item['koleksi'] as Map<String, dynamic>? ?? {};
    final title = (koleksi['title'] ?? item['title'] ?? 'Unknown').toString();
    final slug = (koleksi['slug'] ?? item['slug'] ?? '').toString();
    final posterUrl = (koleksi['posterUrl'] ?? '').toString();
    final episode = (item['episodeNumber'] ?? '').toString();
    final date = _formatDate(item['airingAt']);
    final isNew = episode.isEmpty || episode == '0';

    return GestureDetector(
      onTap: slug.isEmpty ? null : () => context.go('/anime/$slug'),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: CachedNetworkImage(
                imageUrl: posterUrl,
                width: 138,
                height: 88,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(color: const Color(0xFF334155)),
                errorWidget: (context, url, error) => Container(color: const Color(0xFF334155)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        date,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.45),
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    episode.isEmpty ? 'Episode update' : 'Episodes $episode',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF22C55E).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      isNew ? 'New Release' : 'Update',
                      style: const TextStyle(
                        color: Color(0xFF22C55E),
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(dynamic raw) {
    try {
      final dt = DateTime.parse((raw ?? '').toString()).toLocal();
      return '${dt.month}/${dt.day}/${dt.year}';
    } catch (_) {
      return '-';
    }
  }
}

class _FeedInfo extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const _FeedInfo({required this.title, required this.subtitle, required this.icon});

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
