import 'package:http/http.dart' as http;
import '../proxy/proxy_manager.dart';

class M3U8Handler {
  final ProxyManager _proxyManager = ProxyManager();
  String? _localProxyUrl;

  void setLocalProxyUrl(String url) {
    _localProxyUrl = url;
  }

  Future<String> fetchAndRewriteM3U8(String m3u8Url) async {
    final client = http.Client();
    
    try {
      final response = await client.get(Uri.parse(m3u8Url)).timeout(
        const Duration(seconds: 20),
      );
      final content = response.body;
      
      return _rewriteSegmentUrls(content, m3u8Url);
    } finally {
      client.close();
    }
  }

  String _rewriteSegmentUrls(String content, String baseUrl) {
    final lines = content.split('\n');
    final rewritten = <String>[];
    final baseUri = Uri.parse(baseUrl);

    for (final line in lines) {
      if (line.endsWith('.ts') || line.endsWith('.m3u8')) {
        String absoluteUrl;
        if (line.startsWith('http')) {
          absoluteUrl = line;
        } else if (line.startsWith('/')) {
          absoluteUrl = '${baseUri.origin}${baseUri.path}/../${line.substring(1)}';
          absoluteUrl = Uri.parse(absoluteUrl).normalizePath().toString();
        } else {
          final baseDir = baseUri.path.substring(0, baseUri.path.lastIndexOf('/'));
          absoluteUrl = '${baseUri.scheme}://${baseUri.host}${baseDir}/${line}';
        }
        
        if (_localProxyUrl != null) {
          rewritten.add('$_localProxyUrl?url=${Uri.encodeComponent(absoluteUrl)}');
        } else {
          rewritten.add(absoluteUrl);
        }
      } else {
        rewritten.add(line);
      }
    }

    return rewritten.join('\n');
  }

  List<String> parseSegments(String m3u8Content) {
    final lines = m3u8Content.split('\n');
    final segments = <String>[];
    
    for (final line in lines) {
      if (line.endsWith('.ts')) {
        segments.add(line);
      }
    }
    
    return segments;
  }

  String? extractMasterPlaylistUrl(String m3u8Content) {
    final lines = m3u8Content.split('\n');
    for (final line in lines) {
      if (line.contains('.m3u8') && !line.startsWith('#')) {
        return line;
      }
    }
    return null;
  }
}
