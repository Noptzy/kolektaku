const stringSimilarity = require('string-similarity');

class StringSimilarityService {
    static AUTO_MAP_THRESHOLD = 0.95;
    static CANDIDATE_THRESHOLD = 0.70;

    // ────────────────────────────────────────────
    //  Normalization
    // ────────────────────────────────────────────

    /**
     * Normalizes a title for comparison by removing special characters, brackets, and extra spaces.
     * @param {string} value 
     * @returns {string}
     */
    static normalizeTitle(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\(.*?\)/g, ' ')
            .replace(/\[.*?\]/g, ' ')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Normalizes a format/type string for comparison.
     * Maps common variations to a canonical form.
     * @param {string} value 
     * @returns {string}
     */
    static normalizeFormat(value) {
        const v = String(value || '').toUpperCase().trim();
        const map = {
            'TV': 'TV', 'TV_SHORT': 'TV',
            'MOVIE': 'MOVIE',
            'OVA': 'OVA',
            'ONA': 'ONA',
            'SPECIAL': 'SPECIAL',
            'MUSIC': 'MUSIC',
        };
        return map[v] || v;
    }

    /**
     * Parses episode text from 9anime like "Ep 12/12", "Ep Full", "Ep 4/?" into a number.
     * @param {string} episodeText 
     * @returns {number|null}
     */
    static parseEpisodeCount(episodeText) {
        if (!episodeText) return null;
        const text = String(episodeText).trim();

        // "Ep Full" → treat as 1 (typically for movies)
        if (/full/i.test(text)) return 1;

        // "Ep 12/12" → use the total (second number)
        const slashMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (slashMatch) return parseInt(slashMatch[2], 10);

        // "Ep 12/?" → use the current count
        const partialMatch = text.match(/(\d+)\s*\/\s*\?/);
        if (partialMatch) return parseInt(partialMatch[1], 10);

        // "Ep 12" → just a number
        const singleMatch = text.match(/(\d+)/);
        if (singleMatch) return parseInt(singleMatch[1], 10);

        return null;
    }

    // ────────────────────────────────────────────
    //  Core Scoring
    // ────────────────────────────────────────────

    /**
     * Calculates multi-factor similarity score.
     * 
     * Title similarity forms the base score (0–1), then bonuses/penalties are applied:
     * - altTitles + romaji: expands the candidate pool for title matching
     * - format match: +0.03 bonus  
     * - episode count match: +0.02 bonus
     * 
     * @param {string} sourceTitle The original title from our DB.
     * @param {Object} result The search result object from 9anime.
     * @param {Object} [sourceMetadata={}] Extra metadata from our DB (altTitles, format, totalEpisodes, romaji).
     * @returns {number} The composite similarity score (0 to ~1.05, capped at 1).
     */
    static calculateSimilarity(sourceTitle, result, sourceMetadata = {}) {
        const { altTitles = [], format: sourceFormat, totalEpisodes: sourceEpisodes, romaji } = sourceMetadata;

        // ── Build source candidates (titles from our DB to compare against) ──
        const sourceTitles = [sourceTitle];
        if (Array.isArray(altTitles)) {
            sourceTitles.push(...altTitles);
        }
        if (romaji) sourceTitles.push(romaji);

        const normalizedSourceTitles = sourceTitles
            .map(this.normalizeTitle)
            .filter(Boolean);

        // ── Build target candidates (titles from 9anime) ──
        const targetCandidates = [result.title, result.japaneseTitle, result.slugBase, result.slug]
            .map(this.normalizeTitle)
            .filter(Boolean);

        if (normalizedSourceTitles.length === 0 || targetCandidates.length === 0) {
            return 0;
        }

        // ── Best title match (cross-product of source × target) ──
        let bestTitleScore = 0;
        for (const src of normalizedSourceTitles) {
            for (const tgt of targetCandidates) {
                const score = stringSimilarity.compareTwoStrings(src, tgt);
                if (score > bestTitleScore) bestTitleScore = score;
                if (bestTitleScore >= 1) break;
            }
            if (bestTitleScore >= 1) break;
        }

        // ── Metadata bonuses (only applied when title is already a decent match) ──
        let metadataBonus = 0;

        if (bestTitleScore >= 0.50) {
            // Format/type bonus: +0.03 if both sides have format info and they match
            if (sourceFormat && result.type) {
                const normSource = this.normalizeFormat(sourceFormat);
                const normTarget = this.normalizeFormat(result.type);
                if (normSource && normTarget && normSource === normTarget) {
                    metadataBonus += 0.03;
                }
            }

            // Episode count bonus: +0.02 if episode counts are close
            if (sourceEpisodes && result.episodeText) {
                const targetEps = this.parseEpisodeCount(result.episodeText);
                if (targetEps !== null) {
                    const diff = Math.abs(sourceEpisodes - targetEps);
                    if (diff === 0) {
                        metadataBonus += 0.02;
                    } else if (diff <= 1) {
                        metadataBonus += 0.01;
                    }
                }
            }
        }

        return Math.min(bestTitleScore + metadataBonus, 1);
    }

    /**
     * Scores a list of results against the source title and sorts them by score descending.
     * @param {string} sourceTitle 
     * @param {Array} results 
     * @param {Object} [sourceMetadata={}] Extra metadata from our DB.
     * @returns {Array} List of results with an added `score` property, sorted from best to worst.
     */
    static scoreAndSortResults(sourceTitle, results, sourceMetadata = {}) {
        if (!Array.isArray(results) || results.length === 0) return [];

        return results
            .map((entry) => ({
                ...entry,
                score: this.calculateSimilarity(sourceTitle, entry, sourceMetadata)
            }))
            .filter((entry) => entry.nineanimeId)
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Determines what action to take based on the best match and the item's release status.
     * @param {Object} bestMatch The highest scoring result.
     * @param {string} status The general release status of the anime (e.g. 'NOT_YET_RELEASED').
     * @returns {string} 'AUTO_MAP', 'CANDIDATE', or 'LOW_CONFIDENCE'.
     */
    static evaluateMatchAction(bestMatch, status) {
        const isNotYetReleased = String(status || '').toUpperCase() === 'NOT_YET_RELEASED';

        if (!bestMatch) {
            return 'NO_RESULT';
        }

        if (isNotYetReleased) {
            // Always force to candidate if not yet released, regardless of score
            return 'CANDIDATE_FORCED';
        }

        if (bestMatch.score > this.AUTO_MAP_THRESHOLD) {
            return 'AUTO_MAP';
        }

        if (bestMatch.score >= this.CANDIDATE_THRESHOLD) {
            return 'CANDIDATE';
        }

        return 'LOW_CONFIDENCE';
    }
}

module.exports = StringSimilarityService;
