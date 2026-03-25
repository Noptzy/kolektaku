import 'package:translator/translator.dart';
import '../utils/translation.dart';

class TranslationService {
  final GoogleTranslator _translator = GoogleTranslator();

  Future<String?> translateBatch(String text, {String from = 'en', String to = 'id'}) async {
    try {
      final translated = await _translator.translate(text, from: from, to: to);
      return Translator.applyInformalStyle(translated.text);
    } catch (e) {
      return null;
    }
  }
}
