import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class ProxyManager {
  static final ProxyManager _instance = ProxyManager._internal();
  factory ProxyManager() => _instance;
  
  List<String> _proxies = [];
  int _currentIndex = 0;
  bool _enabled = false;

  List<String> get proxies => _proxies;
  bool get isEnabled => _enabled;
  String? get currentProxy => _enabled && _proxies.isNotEmpty 
      ? _proxies[_currentIndex] 
      : null;

  ProxyManager._internal();

  Future<void> initialize() async {
    // Optionally fetch proxies if needed. For now, we prefer direct connection
    // to avoid the 5-10s delay on every segment.
    // await fetchProxies(); 
  }

  Future<void> fetchProxies() async {
    final sources = [
      'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=&ssl=yes&anonymity=all',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    ];

    final allProxies = <String>[];
    
    for (final url in sources) {
      try {
        final response = await http.get(Uri.parse(url)).timeout(
          const Duration(seconds: 10),
        );
        final lines = response.body.split('\n')
            .where((l) => RegExp(r'^\d+\.\d+\.\d+\.\d+:\d+$').hasMatch(l.trim()))
            .map((l) => 'http://${l.trim()}');
        allProxies.addAll(lines);
      } catch (e) {
        print('Failed to fetch from $url: $e');
      }
    }

    final uniqueProxies = allProxies.toSet().toList();
    uniqueProxies.shuffle();
    
    final toTest = uniqueProxies.take(AppConfig.maxProxiesToTest).toList();
    final working = <String>[];

    for (int i = 0; i < toTest.length && working.length < AppConfig.maxWorkingProxies; i += 5) {
      final batch = toTest.skip(i).take(5).toList();
      final results = await Future.wait(batch.map((proxy) => _testProxy(proxy)));
      for (int j = 0; j < batch.length; j++) {
        if (results[j]) {
          working.add(batch[j]);
        }
      }
    }

    _proxies = working;
    _enabled = working.isNotEmpty;
    print('Loaded ${working.length} working proxies');
  }

  Future<bool> _testProxy(String proxy) async {
    try {
      final uri = Uri.parse(proxy);
      final client = http.Client();
      final response = await client.head(Uri.parse('https://www.google.com')).timeout(
        Duration(milliseconds: AppConfig.proxyTestTimeout),
      );
      client.close();
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  String? getNextProxy() {
    if (!_enabled || _proxies.isEmpty) return null;
    final proxy = _proxies[_currentIndex];
    _currentIndex = (_currentIndex + 1) % _proxies.length;
    return proxy;
  }

  String? getProxyUrl(String targetUrl) {
    final proxy = getNextProxy();
    if (proxy == null) return null;
    return proxy.replaceFirst('http://', 'http://$proxy/');
  }
}
