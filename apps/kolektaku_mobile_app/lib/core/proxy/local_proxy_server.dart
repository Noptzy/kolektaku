import 'dart:io';
import 'proxy_manager.dart';

class LocalProxyServer {
  static final LocalProxyServer _instance = LocalProxyServer._internal();
  factory LocalProxyServer() => _instance;
  
  HttpServer? _server;
  final ProxyManager _proxyManager = ProxyManager();
  bool _isRunning = false;
  
  // Reuse HttpClient to prevent socket exhaustion
  final HttpClient _httpClient = HttpClient()
    ..connectionTimeout = const Duration(seconds: 5)
    ..idleTimeout = const Duration(seconds: 30);

  bool get isRunning => _isRunning;
  int get port => _server?.port ?? 8080;

  LocalProxyServer._internal();

  Future<void> start({int port = 8080}) async {
    if (_isRunning) return;
    
    await _proxyManager.initialize();
    
    // Bind to 127.0.0.1 explicitly to avoid localhost (IPv6) issues
    _server = await HttpServer.bind('127.0.0.1', port);
    _isRunning = true;
    // print('Local proxy server running on http://127.0.0.1:$port');
    
    _server!.listen(_handleRequest);
  }

  Future<void> _handleRequest(HttpRequest request) async {
    final url = request.uri.queryParameters['url'];
    
    if (url == null) {
      request.response.statusCode = 400;
      request.response.writeln('URL is required');
      request.response.close();
      return;
    }

    // Set consistent headers for all requests
    final baseHeaders = <String, String>{
      'Referer': 'https://rapid-cloud.co/',
      'Origin': 'https://rapid-cloud.co',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    };

    try {
      final proxy = _proxyManager.getNextProxy();
      
      // Temporarily set proxy on reused client
      if (proxy != null) {
        final proxyParsed = Uri.parse(proxy);
        _httpClient.findProxy = (uri) => "PROXY ${proxyParsed.host}:${proxyParsed.port};";
        // print('Request: $url (via $proxy)');
      } else {
        _httpClient.findProxy = null;
        // print('Request: $url (direct)');
      }

      final proxyRequest = await _httpClient.getUrl(Uri.parse(url));
      
      // Copy incoming headers but override critical ones
      baseHeaders.forEach((name, value) => proxyRequest.headers.set(name, value));
      request.headers.forEach((name, values) {
        if (!['host', 'connection', 'referer', 'origin', 'user-agent'].contains(name.toLowerCase())) {
          proxyRequest.headers.set(name, values.join(', '));
        }
      });

      final proxyResponse = await proxyRequest.close().timeout(const Duration(seconds: 5));
      await _processResponse(request, proxyResponse, url);
      
    } catch (e) {
      // print('Proxy/Request failure: $e. Attemting fallback...');
      
      try {
        // Fallback: Total direct connection (bypass ProxyManager logic)
        _httpClient.findProxy = null;
        final directRequest = await _httpClient.getUrl(Uri.parse(url));
        
        baseHeaders.forEach((name, value) => directRequest.headers.set(name, value));
        request.headers.forEach((name, values) {
          if (!['host', 'connection', 'referer', 'origin', 'user-agent'].contains(name.toLowerCase())) {
            directRequest.headers.set(name, values.join(', '));
          }
        });

        final directResponse = await directRequest.close().timeout(const Duration(seconds: 15));
        await _processResponse(request, directResponse, url);
        // print('Fallback success for $url');
      } catch (fallbackError) {
        // print('Critical failure: $fallbackError');
        request.response.statusCode = 502;
        request.response.writeln('Gateway error: $fallbackError');
        await request.response.close();
      }
    }
  }

  Future<void> _processResponse(HttpRequest originalRequest, HttpClientResponse proxyResponse, String originalUrl) async {
    final contentType = proxyResponse.headers.contentType?.toString() ?? '';
    final isM3U8 = originalUrl.contains('.m3u8') || 
                   contentType.contains('application/vnd.apple.mpegurl') || 
                   contentType.contains('mpegurl');

    originalRequest.response.statusCode = proxyResponse.statusCode;
    
    // Copy response headers
    proxyResponse.headers.forEach((name, values) {
      if (name.toLowerCase() != 'content-length' && name.toLowerCase() != 'content-encoding') {
        originalRequest.response.headers.set(name, values);
      }
    });

    if (isM3U8) {
      final bodyBytes = await proxyResponse.expand((b) => b).toList();
      final body = _rewriteM3U8(String.fromCharCodes(bodyBytes), originalUrl);
      originalRequest.response.write(body);
    } else {
      await originalRequest.response.addStream(proxyResponse);
    }
    
    await originalRequest.response.close();
  }

  String _rewriteM3U8(String content, String baseUrl) {
    try {
      final lines = content.split('\n');
      final rewritten = <String>[];
      final baseUri = Uri.parse(baseUrl);
      final proxyHost = '127.0.0.1:$port';

      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.isEmpty || trimmed.startsWith('#')) {
          // Handle URI tags like #EXT-X-KEY:METHOD=AES-128,URI="part.key"
          if (trimmed.startsWith('#') && trimmed.contains('URI=')) {
            final uriMatch = RegExp(r'URI="([^"]+)"').firstMatch(trimmed);
            if (uriMatch != null) {
              final relativeUri = uriMatch.group(1)!;
              final absoluteUri = baseUri.resolve(relativeUri).toString();
              final proxied = 'http://$proxyHost/?url=${Uri.encodeComponent(absoluteUri)}';
              rewritten.add(trimmed.replaceFirst(relativeUri, proxied));
              continue;
            }
          }
          rewritten.add(line);
          continue;
        }

        String absolute;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          absolute = trimmed;
        } else {
          absolute = baseUri.resolve(trimmed).toString();
        }
        
        rewritten.add('http://$proxyHost/?url=${Uri.encodeComponent(absolute)}');
      }
      return rewritten.join('\n');
    } catch (err) {
      // print('M3U8 rewrite error: $err');
      return content;
    }
  }

  Future<void> stop() async {
    await _server?.close();
    _httpClient.close(force: true);
    _isRunning = false;
  }
}
