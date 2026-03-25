const stringSimilarity = require('string-similarity');

function extractFingerprint(str) {
    const s = str.toLowerCase();
    const subtitleMatch = s.match(/[:：]\s*(.+)/);
    const subtitle = subtitleMatch ? subtitleMatch[1].trim() : '';
    return {
        numbers: s.match(/\d+/g) || [],
        hasFinal: /final|kanketsu|last/i.test(s),
        hasMovie: /movie|gekijouban|film/i.test(s),
        hasOva: /ova|oad|special/i.test(s),
        hasSeason: /season|s[\s-]?\d/i.test(s),
        hasPart: /part|cour/i.test(s),
        subtitle: subtitle,
        baseName: s.split(/[:：]/)[0].trim(),
        fullText: s,
    };
}

function calculatePenalty(dbFp, scrapeFp) {
    let penalty = 0;
    if (dbFp.hasFinal && !scrapeFp.hasFinal) penalty += 0.4;
    if (!dbFp.hasFinal && scrapeFp.hasFinal) penalty += 0.4;
    if (dbFp.numbers.length > 0 && scrapeFp.numbers.length > 0) {
        const intersection = dbFp.numbers.filter(n => scrapeFp.numbers.includes(n));
        if (intersection.length === 0) penalty += 0.4;
    } else if (dbFp.numbers.length > 0 && scrapeFp.numbers.length === 0) {
        penalty += 0.3;
    } else if (dbFp.numbers.length === 0 && scrapeFp.numbers.length > 0) {
        penalty += 0.05;
    }
    if (dbFp.subtitle && !scrapeFp.subtitle) {
        const subtitleWords = dbFp.subtitle.split(/\s+/).filter(w => w.length > 2);
        const scrapedHasSubtitleWord = subtitleWords.some(w => scrapeFp.fullText.includes(w));
        if (!scrapedHasSubtitleWord) penalty += 0.4;
    }
    if (!dbFp.subtitle && scrapeFp.subtitle) {
        const subtitleWords = scrapeFp.subtitle.split(/\s+/).filter(w => w.length > 2);
        const dbHasSubtitleWord = subtitleWords.some(w => dbFp.fullText.includes(w));
        if (!dbHasSubtitleWord) penalty += 0.4;
    }
    return penalty;
}

function testCase(label, dbTitles, scrapedEntries) {
    console.log(`\n=== ${label} ===`);
    for (const entry of scrapedEntries) {
        let best = -1;
        let bestPair = '';
        const scrapeFp = extractFingerprint(entry.title + ' ' + (entry.jp || ''));
        for (const dbT of dbTitles) {
            let score = stringSimilarity.compareTwoStrings(entry.title.toLowerCase(), dbT.toLowerCase());
            const dbFp = extractFingerprint(dbT);
            score -= calculatePenalty(dbFp, scrapeFp);
            if (score > best) {
                best = score;
                bestPair = `DB: "${dbT}" vs Scraped: "${entry.title}"`;
            }
        }
        console.log(`  ${entry.label}: ${(best * 100).toFixed(1)}% (${bestPair})`);
    }
}

testCase('NARUTO: Shippuuden (DB) mapping test', 
    ["NARUTO: Shippuuden", "Naruto: Shippuden", "NARUTO -ナルト- 疾風伝", "Naruto Shippuuden", "Naruto Shippuden"],
    [
        { label: "9anime Naruto (wrong)", title: "Naruto", jp: "Naruto" },
        { label: "9anime Shippuden (correct)", title: "Naruto: Shippuden", jp: "Naruto: Shippuuden" }
    ]
);

testCase('Shingeki no Kyojin: The Final Season (DB) mapping test',
    ["Shingeki no Kyojin: The Final Season", "Attack on Titan Final Season", "Shingeki no Kyojin 4", "Attack on Titan Season 4"],
    [
        { label: "9anime S1 (wrong)", title: "Attack on Titan", jp: "Shingeki no Kyojin" },
        { label: "9anime S3 (wrong)", title: "Attack on Titan Season 3", jp: "Shingeki no Kyojin Season 3" },
        { label: "9anime S4P1 (correct)", title: "Attack on Titan: Final Season, Part 1", jp: "Shingeki no Kyojin: Final Season, Part 1" },
        { label: "9anime S4P2 (correct)", title: "Attack on Titan: Final Season, Part 2", jp: "Shingeki no Kyojin: The Final Season Part 2" }
    ]
);

testCase('NARUTO (original DB) mapping test',
    ["NARUTO", "Naruto", "NARUTO -ナルト-"],
    [
        { label: "9anime Naruto (correct)", title: "Naruto", jp: "Naruto" },
        { label: "9anime Shippuden (wrong)", title: "Naruto: Shippuden", jp: "Naruto: Shippuuden" }
    ]
);
