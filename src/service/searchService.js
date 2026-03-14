const searchRepository = require('../repository/searchRepository');

class SearchService {
    async searchAll(query, take = 5) {
        if (!query || query.trim() === '') {
            return {
                koleksi: [],
                studios: [],
                voiceActors: [],
                characters: []
            };
        }
        return await searchRepository.searchAll(query, take);
    }
}

module.exports = new SearchService();
