class Translator {
  static const Map<String, String> _indonesiaLabels = {
    'English': 'Inggris',
    'French - Francais(France)': 'Prancis',
    'German - Deutsch': 'Jerman',
    'Italian - Italiano': 'Italia',
    'Portuguese - Portugues(Brasil)': 'Portugis (Brasil)',
    'Russian': 'Rusia',
    'Spanish - Espanol': 'Spanyol',
    'Spanish - Espanol(Espana)': 'Spanyol (Spanyol)'
  };

  static String translate(String label) {
    return _indonesiaLabels[label] ?? label;
  }

  static String applyInformalStyle(String text) {
    if (text.isEmpty) return text;
    
    String styled = text;

    // Mapping from proxy_server.js
    final replacements = {
      // Pronouns
      r'\bSaya\b': 'Aku',
      r'\bAnda\b': 'Kamu',
      r'\bKami\b': 'Kita',
      r'\bBeliau\b': 'Dia',
      
      // Question words
      r'\bApakah\b': 'Apa',
      r'\bBagaimana\b': 'Gimana',
      r'\bMengapa\b': 'Kenapa',
      r'\bDi mana\b': 'Dimana',
      r'\bKe mana\b': 'Kemana',
      r'\bDari mana\b': 'Darimana',
      
      // Negations
      r'\bTidak\b': 'gak',
      r'\bTidak ada\b': 'Gak ada',
      r'\bBelum\b': 'Belom',
      
      // Conjunctions
      r'\bTetapi\b': 'Tapi',
      r'\bNamun\b': 'Tapi',
      r'\bKemudian\b': 'Terus',
      r'\bLalu\b': 'Terus',
      r'\bKarena\b': 'Soalnya',
      r'\bSebab\b': 'Soalnya',
      
      // Adverbs
      r'\bSangat\b': 'Banget',
      r'\bAmat\b': 'Banget',
      r'\bBenar\b': 'Bener',
      r'\bSedang\b': 'Lagi',
      r'\bHanya\b': 'Cuma',
      r'\bSaja\b': 'Aja',
      r'\bSudah\b': 'Udah',
      
      // Verbs
      r'\bMengatakan\b': 'Bilang',
      r'\bBerkata\b': 'Bilang',
      r'\bMemberitahu\b': 'Kasih tau',
      r'\bMengetahui\b': 'Tau',
      r'\bMelihat\b': 'Liat',
      r'\bMemakan\b': 'Makan',
      r'\bMeminum\b': 'Minum',
      r'\bMengambil\b': 'Ambil',
      
      // Phrases
      r'\bSeperti apa\b': 'Kayak gimana',
      r'\bSeperti\b': 'Kayak',
      r'\bTerima kasih\b': 'Makasih',
    };

    replacements.forEach((pattern, replacement) {
      styled = styled.replaceAll(RegExp(pattern, caseSensitive: false), replacement);
    });

    return styled;
  }
}
