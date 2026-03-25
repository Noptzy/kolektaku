const stringSimilarity = require('string-similarity');

// const scrapedTitle = 'one-piece-episode-of-merry-the-tale-of-one-more-friend-293'; Skor Kemiripan: 49.02%
const scrapedTitle = 'one piece episode of merry the tale of one more friend';
// Skor Kemiripan: 59.09%

const anilistData = {
    romaji: 'ONE PIECE: Episode of Merry - Mou   Hitori no Nakama no Monogatari',
    english: 'One Piece: Episode of Merry - The Tale of One More Friend', // Ini kunci nya!
    native: 'ONE PIECE エピソードオブメリー 〜もうひとりの仲間の物語〜',
    synonyms: ['One Piece: Episode of Merry']
};

const targetCandidates = [
    anilistData.romaji,
    anilistData.english,
    anilistData.native,
    ...anilistData.synonyms
].filter(Boolean); 

const matches = stringSimilarity.findBestMatch(scrapedTitle, targetCandidates);

console.log(`Judul Scrape: "${scrapedTitle}"\n`);
console.log(`Tebakan Terbaik: "${matches.bestMatch.target}"`);
console.log(`Skor Kemiripan: ${(matches.bestMatch.rating * 100).toFixed(2)}%`);