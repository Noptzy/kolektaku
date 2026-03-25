import '../core/network/api_client.dart';

class DetailService {
  final ApiClient _api = ApiClient();

  Future<Map<String, dynamic>> getStaffAnime(String staffId, {int page = 1, int limit = 20}) async {
    final response = await _api.get('/anime/staff/$staffId', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getStudioAnime(String studioId, {int page = 1, int limit = 20}) async {
    final response = await _api.get('/anime/studio/$studioId', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getVAAnime(String vaId, {int page = 1, int limit = 20}) async {
    final response = await _api.get('/anime/va/$vaId', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getCharacterAnime(String characterId, {int page = 1, int limit = 20}) async {
    final response = await _api.get('/anime/character/$characterId', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getAnimeByGenre(String genre, {int page = 1, int limit = 20}) async {
    final response = await _api.get('/anime/genre/$genre', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return response.data;
  }
}
