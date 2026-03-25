import 'package:go_router/go_router.dart';
import '../features/player/watch_screen.dart';
import '../features/shell/main_shell.dart';
import '../features/home/home_screen.dart';
import '../features/search/search_screen.dart';
import '../features/schedule/schedule_screen.dart';
import '../features/anime/detail/anime_detail_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
        GoRoute(path: '/search', builder: (context, state) => const SearchScreen()),
        GoRoute(path: '/schedule', builder: (context, state) => const ScheduleScreen()),
      ],
    ),
    GoRoute(
      path: '/anime/:slug',
      builder: (context, state) => AnimeDetailScreen(
        slug: state.pathParameters['slug']!,
      ),
    ),
    GoRoute(
      path: '/watch/:slug/:episode',
      builder: (context, state) {
        final slug = state.pathParameters['slug']!;
        final episode = state.pathParameters['episode']!;
        // Use a wrapper that fetches the actual stream URL before playing
        return WatchScreen(slug: slug, episode: episode);
      },
    ),
  ],
);
