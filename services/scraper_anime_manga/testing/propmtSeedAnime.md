Act as a Senior Node.js Data Engineer and Prisma Expert. I am building "Kolektaku", a high-performance Anime & Manga aggregator. My database is PostgreSQL, and I have provided my complete `schema.prisma`.

**YOUR TASK:**
Write a production-ready Node.js seeding script to fetch more than 20,000+ Anime and Manga from the AniList GraphQL API and insert them into my database using Prisma.

**CORE REQUIREMENTS & LOGIC:**

1. **Pagination Loop (Crucial):**
   - DO NOT brute-force IDs. Use a `while(hasNextPage)` loop using AniList's `Page` wrapper.
   - Set variables to `$page: 1` and `$perPage: 20` to avoid AniList's "Query Complexity" limits.
   - Implement a mandatory `delay` function (e.g., `await new Promise(res => setTimeout(res, 1500))`) at the end of each loop iteration to prevent IP bans/Rate Limiting (HTTP 429).

2. **The GraphQL Query:**
   Use this exact query structure inside the loop the page can costumize using .env since the max is 1107 and min is 1, iii set the min in .env is 1200 at MAX_ANILIST_PAGE=1200 and PERPAGE_ANILIST_ITEMS=20:
   ```graphql
query AmbilDataSeedAnimek($page: Int = 1107, $perPage: Int = 20) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      currentPage
      hasNextPage
      lastPage
    }
    
    media(type: ANIME, sort: POPULARITY_DESC) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      synonyms
      format
      episodes
      duration
      status
      season
      seasonYear
      genres
      description
      coverImage {
        extraLarge
        color
      }
      bannerImage
      trailer {
        id
        site
        thumbnail
      }
      nextAiringEpisode {
        episode
        timeUntilAiring
      }
      externalLinks {
        id
        site
        url
        type
        icon
        color
        language
      }

      relations {
        edges {
          relationType
          node {
            id
            title {
              romaji
            }
            coverImage {
              large
            }
          }
        }
      }

      studios(sort: [FAVOURITES_DESC]) {
        edges {
          isMain
          node {
            id
            name
            isAnimationStudio
          }
        }
      }

      staff(sort: [RELEVANCE, ID], perPage: 20) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
        }
      }

      characters(sort: [ROLE, ID], perPage: 25) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
          voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
            id
            name {
              full
            }
            image {
              large
            }
          }
        }
      }
    }
  }
} ```
(Note: You can add type: MANGA in a separate pass or parameterize it).

3. Data Transformation & Prisma Upsert:
where: Use { slug: generateSlug(media.title.romaji) }.

altTitles (JSON): Combine title.english, title.native, and synonyms into a single array. Filter out null/undefined values. This is crucial for our future string-similarity matching.

isNsfw (Boolean): Check if the media.genres array includes "Ecchi" or "Hentai". If yes set to true and gave it to PendingMapping.

publishStatus: Default to published, but if isNsfw is true, gave it to PendingMapping.

4. Prisma Nested Writes:
Inside the upsert.create block, use nested writes to populate related tables:

mapping: Create KoleksiMapping with anilistId and myanimelistId.

animeDetail: Create AnimeDetail with format, totalEpisodes, epsDuration, season.

genres: Use connectOrCreate inside a .map() to insert into Genre and pivot table KoleksiGenre. Apply the same NSFW flagging logic to the Genre model.

airingSchedules: If nextAiringEpisode exists, calculate the exact airingAt Date based on timeUntilAiring and insert it into AiringSchedule.

5. Error Handling:
Wrap the inner loop processing in a try-catch block so if one specific anime fails to insert (e.g., strict unique constraint issue), it logs the error but the loop continues to the next item. Log the progress (e.g., "Successfully processed page 1...").

Please write the complete, executable make SOLID script. and check if the @prisma/client and axios (or native fetch) are installed.