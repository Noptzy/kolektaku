import '../core/network/api_client.dart';

class ScheduleService {
  final ApiClient _api = ApiClient();

  Future<Map<String, dynamic>> getWeeklySchedule() async {
    final response = await _api.get('/schedules');
    return response.data;
  }
}
