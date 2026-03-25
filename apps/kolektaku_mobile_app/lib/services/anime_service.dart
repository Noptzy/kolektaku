import '../core/network/api_client.dart';
import '../core/config/app_config.dart';

class AnimeService {
  final ApiClient _api = ApiClient();

  Future<Map<String, dynamic>> getAllAnime({
    int page = AppConfig.defaultPage,
    int limit = AppConfig.defaultLimit,
    Map<String, dynamic>? filters,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
      ...?filters,
    };
    final response = await _api.get('/anime', queryParameters: params);
    return response.data;
  }

  Future<Map<String, dynamic>> getAnimeBySlug(String slug) async {
    final response = await _api.get('/anime/$slug');
    return response.data;
  }

  Future<Map<String, dynamic>> getEpisodeList(String slug) async {
    final response = await _api.get('/anime/$slug/eps');
    return response.data;
  }

  Future<Map<String, dynamic>> getEpisodeStream(String slug, String episodeNumber) async {
    final response = await _api.get('/anime/$slug/eps/$episodeNumber');
    return response.data;
  }

  Future<Map<String, dynamic>> searchAnime(String keyword, {int page = 1, int limit = 20}) async {
    final response = await _api.get('/anime/search', queryParameters: {
      'q': keyword,
      'page': page,
      'limit': limit,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getFilterOptions() async {
    final response = await _api.get('/anime/filters');
    return response.data;
  }

  Future<Map<String, dynamic>> getGlobalStats() async {
    final response = await _api.get('/anime/stats');
    return response.data;
  }
}
