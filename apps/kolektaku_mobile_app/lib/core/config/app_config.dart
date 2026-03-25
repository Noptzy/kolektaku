class AppConfig {
  static const String appName = 'Kolektaku';
  static const String baseUrl = 'https://kolektaku-stream-resolve.vercel.app';
  static const String apiUrl = '$baseUrl/api';
  
  static const int defaultPage = 1;
  static const int defaultLimit = 20;
  
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  static const int proxyTestTimeout = 8000;
  static const int maxWorkingProxies = 5;
  static const int maxProxiesToTest = 30;
  
  static const int localProxyPort = 8080;
}
