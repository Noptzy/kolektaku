query AmbilDataAnimek($page: Int = 1107, $perPage: Int = 20) {

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



      staff(sort: [RELEVANCE, ID], perPage: 15) {

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

}



jgn buat propmt

keknya ada yg kelupaan deh



"019cdb36-bb78-710d-9394-c0a25cccc6b4"	"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"TV"	25	24			"SPRING 2013"		"Shingeki no Kyojin"	"[{""id"": 8, ""url"": ""http://www.crunchyroll.com/attack-on-titan"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"", ""site"": ""Crunchyroll"", ""type"": ""STREAMING"", ""color"": ""#F88B24"", ""language"": null}, {""id"": 45, ""url"": ""http://shingeki.tv/"", ""icon"": null, ""site"": ""Official Site"", ""type"": ""INFO"", ""color"": null, ""language"": ""Japanese""}, {""id"": 1377, ""url"": ""http://www.hulu.com/attack-on-titan"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}, {""id"": 21862, ""url"": ""https://www.adultswim.com/videos/attack-on-titan"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/28-W1L8AHW0O4xE.png"", ""site"": ""Adult Swim"", ""type"": ""STREAMING"", ""color"": ""#000000"", ""language"": null}, {""id"": 35627, ""url"": ""https://www.iq.com/album/xq12ps94l5"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/122-EPBJ2E0oPt5C.png"", ""site"": ""iQ"", ""type"": ""STREAMING"", ""color"": ""#00CC36"", ""language"": null}, {""id"": 46261, ""url"": ""https://twitter.com/anime_shingeki?t=04jzwzKIHFFQ-Wvg6npMsw&s=09"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""Japanese""}]"	"https://www.youtube.com/watch?v=LHtdKWJdif4	"

"019cdb36-bc55-77ee-9515-be7e9177b6e1"	"019cdb36-bc54-70b4-88b5-25f1bc008aa9"	"TV"	26	24			"SPRING 2019"		"Kimetsu no Yaiba"	"[{""id"": 5814, ""url"": ""https://twitter.com/kimetsu_off"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""Japanese""}, {""id"": 9277, ""url"": ""https://www.crunchyroll.com/demon-slayer-kimetsu-no-yaiba"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"", ""site"": ""Crunchyroll"", ""type"": ""STREAMING"", ""color"": ""#F88B24"", ""language"": null}, {""id"": 9303, ""url"": ""https://www.hulu.com/demon-slayer-kimetsu-no-yaiba"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}, {""id"": 15243, ""url"": ""https://twitter.com/DemonSlayerUSA"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""English""}, {""id"": 21673, ""url"": ""https://www.netflix.com/title/81091393"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"", ""site"": ""Netflix"", ""type"": ""STREAMING"", ""color"": ""#E50914"", ""language"": null}, {""id"": 28564, ""url"": ""https://kimetsu.com/anime/risshihen/"", ""icon"": null, ""site"": ""Official Site"", ""type"": ""INFO"", ""color"": null, ""language"": ""Japanese""}, {""id"": 45307, ""url"": ""https://twitter.com/kimetsu_fr"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""French""}, {""id"": 108093, ""url"": ""https://www.facebook.com/DemonSlayer.anime"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/38-JvMCwgmWvF6Z.png"", ""site"": ""Facebook"", ""type"": ""SOCIAL"", ""color"": ""#4267B2"", ""language"": ""English""}]"	"https://www.youtube.com/watch?v=6vMuWuWlW4I"

"019cdb36-bcd5-751d-890e-c1f90d075e7e"	"019cdb36-bcd4-7522-b75f-2841cbc6948a"	"TV"	37	23			"FALL 2006"		"DEATH NOTE"	"[{""id"": 1455, ""url"": ""http://www.hulu.com/death-note"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}, {""id"": 3025, ""url"": ""http://www.ntv.co.jp/deathnote/"", ""icon"": null, ""site"": ""Official Site"", ""type"": ""INFO"", ""color"": null, ""language"": ""Japanese""}, {""id"": 13936, ""url"": ""https://www.netflix.com/title/70204970"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"", ""site"": ""Netflix"", ""type"": ""STREAMING"", ""color"": ""#E50914"", ""language"": null}, {""id"": 13937, ""url"": ""https://tubitv.com/series/1630/death_note"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/30-RoKDJtmAVpZK.png"", ""site"": ""Tubi TV"", ""type"": ""STREAMING"", ""color"": ""#7408FF"", ""language"": null}, {""id"": 64815, ""url"": ""https://www.amazon.com/Death-Note/dp/B0B6RMGK8Z"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/21-bDoNIomehkOx.png"", ""site"": ""Amazon Prime Video"", ""type"": ""STREAMING"", ""color"": ""#FF9900"", ""language"": null}, {""id"": 66756, ""url"": ""https://youtube.com/playlist?list=PLDDFkfLheQ9hzlWtnCSla1DicLZkllriY"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/13-ZwR1Xwgtyrwa.png"", ""site"": ""YouTube"", ""type"": ""STREAMING"", ""color"": ""#FF0000"", ""language"": null}, {""id"": 101231, ""url"": ""https://www.hoopladigital.com/television/death-note-subbed-season-1-mamoru-miyano/14733965"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/239-ZeBmakU1Zxas.png"", ""site"": ""Hoopla"", ""type"": ""STREAMING"", ""color"": ""#0D69C0"", ""language"": null}, {""id"": 101232, ""url"": ""https://www.hoopladigital.com/television/death-note-dubbed-season-1-mamoru-miyano/14733986"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/239-ZeBmakU1Zxas.png"", ""site"": ""Hoopla"", ""type"": ""STREAMING"", ""color"": ""#0D69C0"", ""language"": null}]"	"https://www.youtube.com/watch?v=NlJZ-YgAt-c"

"019cdb36-bd4f-70fe-82c5-eb365daa28ee"	"019cdb36-bd4e-7611-9e24-581fece8f437"	"TV"	24	24			"FALL 2020"		"Jujutsu Kaisen"	"[{""id"": 13086, ""url"": ""https://jujutsukaisen.jp/"", ""icon"": null, ""site"": ""Official Site"", ""type"": ""INFO"", ""color"": null, ""language"": ""Japanese""}, {""id"": 13087, ""url"": ""https://twitter.com/animejujutsu"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""Japanese""}, {""id"": 23866, ""url"": ""https://www.crunchyroll.com/jujutsu-kaisen"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"", ""site"": ""Crunchyroll"", ""type"": ""STREAMING"", ""color"": ""#F88B24"", ""language"": null}, {""id"": 32771, ""url"": ""https://www.netflix.com/title/81278456"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"", ""site"": ""Netflix"", ""type"": ""STREAMING"", ""color"": ""#E50914"", ""language"": null}, {""id"": 34368, ""url"": ""https://www.iq.com/album/igc33vhvex"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/122-EPBJ2E0oPt5C.png"", ""site"": ""iQ"", ""type"": ""STREAMING"", ""color"": ""#00CC36"", ""language"": null}, {""id"": 41427, ""url"": ""https://www.bilibili.tv/media/37738"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/119-NCwGvCjFADGQ.png"", ""site"": ""Bilibili TV"", ""type"": ""STREAMING"", ""color"": ""#00A1D6"", ""language"": null}, {""id"": 45305, ""url"": ""https://twitter.com/Jujutsu_anime"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""French""}, {""id"": 72914, ""url"": ""https://youtube.com/playlist?list=PLxSscENEp7JisDU6GAJuyNpVwDvCm-f3J"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/13-ZwR1Xwgtyrwa.png"", ""site"": ""YouTube"", ""type"": ""STREAMING"", ""color"": ""#FF0000"", ""language"": null}, {""id"": 73034, ""url"": ""https://twitter.com/Jujutsu_Kaisen_"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""English""}, {""id"": 90013, ""url"": ""https://www.hulu.com/series/jujutsu-kaisen-382ec8bf-3650-4cde-94db-ecd18665f9e0"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}]"	"https://www.youtube.com/watch?v=pkKu9hLT-t8"

"019cdb36-bdb1-766a-a7ef-fcad2a898bc7"	"019cdb36-bdb0-71cf-992d-53237cf92610"	"TV"	13	24			"SPRING 2016"		"Boku no Hero Academia"	"[{""id"": 2342, ""url"": ""http://www.heroaca.com/"", ""icon"": null, ""site"": ""Official Site"", ""type"": ""INFO"", ""color"": null, ""language"": ""Japanese""}, {""id"": 2360, ""url"": ""https://twitter.com/heroaca_anime"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""Japanese""}, {""id"": 2927, ""url"": ""http://www.hulu.com/my-hero-academia"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}, {""id"": 3967, ""url"": ""http://www.crunchyroll.com/my-hero-academia"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"", ""site"": ""Crunchyroll"", ""type"": ""STREAMING"", ""color"": ""#F88B24"", ""language"": null}, {""id"": 28603, ""url"": ""https://www.netflix.com/title/80135674"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"", ""site"": ""Netflix"", ""type"": ""STREAMING"", ""color"": ""#E50914"", ""language"": null}, {""id"": 35636, ""url"": ""https://www.iq.com/album/1djwf83pp09"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/122-EPBJ2E0oPt5C.png"", ""site"": ""iQ"", ""type"": ""STREAMING"", ""color"": ""#00CC36"", ""language"": null}, {""id"": 45300, ""url"": ""https://twitter.com/MHAOfficielFR"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""French""}, {""id"": 46007, ""url"": ""https://twitter.com/MHAOfficial"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""English""}]"	"https://www.youtube.com/watch?v=AhqVltWDqFA"

"019cdb36-be10-73ce-9e54-c502f5feee6e"	"019cdb36-be0f-77ab-a183-95cd7fc81d62"	"TV"	148	24			"FALL 2011"		"HUNTER×HUNTER (2011)"	"[{""id"": 205, ""url"": ""http://www.crunchyroll.com/hunter-x-hunter"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"", ""site"": ""Crunchyroll"", ""type"": ""STREAMING"", ""color"": ""#F88B24"", ""language"": null}, {""id"": 5920, ""url"": ""https://www.hulu.com/hunter-x-hunter"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}, {""id"": 11172, ""url"": ""https://www.netflix.com/title/70300472"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"", ""site"": ""Netflix"", ""type"": ""STREAMING"", ""color"": ""#E50914"", ""language"": null}, {""id"": 21689, ""url"": ""https://tubitv.com/series/1627/hunter_x_hunter"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/30-RoKDJtmAVpZK.png"", ""site"": ""Tubi TV"", ""type"": ""STREAMING"", ""color"": ""#7408FF"", ""language"": null}, {""id"": 41504, ""url"": ""https://www.bilibili.tv/en/play/37603"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/45-6JAD1SYYCHI2.png"", ""site"": ""Bilibili"", ""type"": ""STREAMING"", ""color"": ""#00A1D6"", ""language"": null}, {""id"": 71882, ""url"": ""https://youtube.com/playlist?list=PLwLSw1_eDZl2SdSro00Nvg38MQUf-5ZL8"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/13-ZwR1Xwgtyrwa.png"", ""site"": ""YouTube"", ""type"": ""STREAMING"", ""color"": ""#FF0000"", ""language"": null}, {""id"": 101243, ""url"": ""https://www.hoopladigital.com/series/hunter-x-hunter-dubbed/11834349593"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/239-ZeBmakU1Zxas.png"", ""site"": ""Hoopla"", ""type"": ""STREAMING"", ""color"": ""#0D69C0"", ""language"": null}, {""id"": 101244, ""url"": ""https://www.hoopladigital.com/series/hunter-x-hunter-subbed/11834349354"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/239-ZeBmakU1Zxas.png"", ""site"": ""Hoopla"", ""type"": ""STREAMING"", ""color"": ""#0D69C0"", ""language"": null}, {""id"": 106236, ""url"": ""https://www.amazon.com/Hunter-Japanese-English-Subs/dp/B0B5X87G1P"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/21-bDoNIomehkOx.png"", ""site"": ""Amazon Prime Video"", ""type"": ""STREAMING"", ""color"": ""#FF9900"", ""language"": null}]"	"https://www.youtube.com/watch?v=d6kBeJjTGnY"

"019cdb36-be75-7569-8508-334fd5bb6c58"	"019cdb36-be75-7569-8508-2fa2375280c5"	"TV"	12	24			"FALL 2015"		"One Punch Man"	"[{""id"": 724, ""url"": ""http://onepunchman-anime.net/"", ""icon"": null, ""site"": ""Official Site"", ""type"": ""INFO"", ""color"": null, ""language"": ""Japanese""}, {""id"": 1981, ""url"": ""https://twitter.com/opm_anime"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""Japanese""}, {""id"": 2262, ""url"": ""http://www.hulu.com/onepunch-man"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}, {""id"": 5236, ""url"": ""https://www.netflix.com/title/80117291"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"", ""site"": ""Netflix"", ""type"": ""STREAMING"", ""color"": ""#E50914"", ""language"": null}, {""id"": 33673, ""url"": ""https://www.youtube.com/playlist?list=PLwLSw1_eDZl2XdtLhB9NG2Ch050jWFm9G"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/13-ZwR1Xwgtyrwa.png"", ""site"": ""YouTube"", ""type"": ""STREAMING"", ""color"": ""#FF0000"", ""language"": null}, {""id"": 56075, ""url"": ""https://wetv.vip/id/play/r386s7hzwidwkpv/r0035owmbkx"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/131-5sN08ZCe7HKZ.png"", ""site"": ""WeTV"", ""type"": ""STREAMING"", ""color"": ""#2FA3F9"", ""language"": null}, {""id"": 56076, ""url"": ""https://www.iq.com/album/2ekpp4jtbwt"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/122-EPBJ2E0oPt5C.png"", ""site"": ""iQ"", ""type"": ""STREAMING"", ""color"": ""#00CC36"", ""language"": null}, {""id"": 56077, ""url"": ""https://www.bilibili.tv/media/36279"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/119-NCwGvCjFADGQ.png"", ""site"": ""Bilibili TV"", ""type"": ""STREAMING"", ""color"": ""#00A1D6"", ""language"": null}, {""id"": 75953, ""url"": ""https://www.youtube.com/playlist?list=PLpm1VVK4UL16FvVk0QOffUwXX_vaHVjZP"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/13-ZwR1Xwgtyrwa.png"", ""site"": ""YouTube"", ""type"": ""STREAMING"", ""color"": ""#FF0000"", ""language"": null}]"	"https://www.youtube.com/watch?v=RzmFKUDOUgw"

"019cdb36-bede-74eb-b1b1-1e5921dd707b"	"019cdb36-bedd-73c7-ac8a-4f26d9e19f24"	"TV"	12	24			"SUMMER 2014"		"Tokyo Ghoul"	"[{""id"": 546, ""url"": ""http://www.marv.jp/special/tokyoghoul/"", ""icon"": null, ""site"": ""Official Site"", ""type"": ""INFO"", ""color"": null, ""language"": ""Japanese""}, {""id"": 1880, ""url"": ""http://www.hulu.com/tokyo-ghoul"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}, {""id"": 12753, ""url"": ""https://www.amazon.com/gp/video/detail/B015O6OK4G/"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/21-bDoNIomehkOx.png"", ""site"": ""Amazon Prime Video"", ""type"": ""STREAMING"", ""color"": ""#FF9900"", ""language"": null}, {""id"": 24418, ""url"": ""https://www.crunchyroll.com/en-gb/tokyo-ghoul"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"", ""site"": ""Crunchyroll"", ""type"": ""STREAMING"", ""color"": ""#F88B24"", ""language"": null}, {""id"": 26807, ""url"": ""https://www.netflix.com/title/80023687"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"", ""site"": ""Netflix"", ""type"": ""STREAMING"", ""color"": ""#E50914"", ""language"": null}]"	"https://www.youtube.com/watch?v=XfQUjYsVBrE"

"019cdb36-bf3d-7598-a5ec-409f381a50b7"	"019cdb36-bf3c-750a-ad56-9a0adee945d2"	"TV"	12	25			"SPRING 2017"		"Shingeki no Kyojin Season 2"	"[{""id"": 3174, ""url"": ""http://shingeki.tv/season2/"", ""icon"": null, ""site"": ""Official Site"", ""type"": ""INFO"", ""color"": null, ""language"": ""Japanese""}, {""id"": 3175, ""url"": ""https://twitter.com/anime_shingeki"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/17-R0tMgOvwvhsS.png"", ""site"": ""Twitter"", ""type"": ""SOCIAL"", ""color"": ""#000000"", ""language"": ""Japanese""}, {""id"": 3995, ""url"": ""http://www.crunchyroll.com/attack-on-titan"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"", ""site"": ""Crunchyroll"", ""type"": ""STREAMING"", ""color"": ""#F88B24"", ""language"": null}, {""id"": 14951, ""url"": ""https://www.hulu.com/attack-on-titan"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"", ""site"": ""Hulu"", ""type"": ""STREAMING"", ""color"": ""#1CE783"", ""language"": null}, {""id"": 21861, ""url"": ""https://www.adultswim.com/videos/attack-on-titan"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/28-W1L8AHW0O4xE.png"", ""site"": ""Adult Swim"", ""type"": ""STREAMING"", ""color"": ""#000000"", ""language"": null}, {""id"": 35628, ""url"": ""https://www.iq.com/album/1f7yemxzyr5"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/122-EPBJ2E0oPt5C.png"", ""site"": ""iQ"", ""type"": ""STREAMING"", ""color"": ""#00CC36"", ""language"": null}, {""id"": 37380, ""url"": ""https://www.netflix.com/title/70299043"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"", ""site"": ""Netflix"", ""type"": ""STREAMING"", ""color"": ""#E50914"", ""language"": null}, {""id"": 44658, ""url"": ""https://www.crunchyroll.com/attack-on-titan-dubs"", ""icon"": ""https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"", ""site"": ""Crunchyroll"", ""type"": ""STREAMING"", ""color"": ""#F88B24"", ""language"": null}]"	"https://www.youtube.com/watch?v=zLaVP8IhIuc"



start date, end date, source untuk koleksi detail



"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"Shingeki no Kyojin"	"shingeki-no-kyojin"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg"	"[""Attack on Titan"", ""進撃の巨人"", ""SnK"", ""AoT"", ""Ataque a los Titanes"", ""Ataque dos Titãs"", ""L'Attacco dei Giganti"", ""מתקפת הטיטאנים"", ""进击的巨人"", ""L’Attaque des Titans"", ""الهجوم على العمالقة"", ""ผ่าพิภพไททัน"", ""حمله به تایتان"", ""Ataque de Titãs"", ""Atak Tytanów"", ""Атака титанов""]"	"Several hundred years ago, humans were nearly exterminated by titans. Titans are typically several stories tall, seem to have no intelligence, devour human beings and, worst of all, seem to do it for the pleasure rather than as a food source. A small percentage of humanity survived by walling themselves in a city protected by extremely high walls, even taller than the biggest of titans.<br><br>

Flash forward to the present and the city has not seen a titan in over 100 years. Teenage boy Eren and his foster sister Mikasa witness something horrific as the city walls are destroyed by a colossal titan that appears out of thin air. As the smaller titans flood the city, the two kids watch in horror as their mother is eaten alive. Eren vows that he will murder every single titan and take revenge for all of mankind.<br><br>

(Source: MangaHelpers) "	"TV"	"FINISHED"	2013	"anime"	"published"	false		"2026-03-11 04:45:22.895"

"019cdb36-bc54-70b4-88b5-25f1bc008aa9"	"Kimetsu no Yaiba"	"kimetsu-no-yaiba"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg"	"[""Demon Slayer: Kimetsu no Yaiba"", ""鬼滅の刃"", ""KnY"", ""Kimetsu no Yaiba: Kyoudai no Kizuna"", ""Demon Slayer: Kimetsu no Yaiba: Bonds of Siblings"", ""鬼滅の刃-兄妹の絆-"", ""鬼灭之刃"", ""הלהב קוטל השדים"", ""قاتل الشياطين"", ""ดาบพิฆาตอสูร"", ""Miecz zabójcy demonów – Kimetsu no Yaiba"", "" Guardians de la nit: Kimetsu no Yaiba"", ""İblis Keser"", ""ΚΥΝΗΓΟΣ ΔΑΙΜΟΝΩΝ: KIMETSU NO YAIBA"", ""Zabiják démonů"", ""شیطان کش"", ""귀멸의 칼날"", ""Истребитель демонов"", ""Клинок, рассекающий демонов""]"	"It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon. To make matters worse, his younger sister Nezuko, the sole survivor, has been transformed into a demon herself. Though devastated by this grim reality, Tanjiro resolves to become a “demon slayer” so that he can turn his sister back into a human, and kill the demon that massacred his family.<br>

<br>

(Source: Crunchyroll)"	"TV"	"FINISHED"	2019	"anime"	"published"	false		"2026-03-11 04:45:23.407"

"019cdb36-bcd4-7522-b75f-2841cbc6948a"	"DEATH NOTE"	"death-note"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-kUgkcrfOrkUM.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg"	"[""Death Note"", ""DEATH NOTE"", ""デスノート"", ""死亡笔记"", ""מחברת המוות"", ""Notatnik śmierci"", ""Carnet de la Mort"", ""สมุดโน้ตกระชากวิญญาณ"", ""مذكرة الموت"", ""Тетрадь смерти""]"	"Light Yagami is a genius high school student who is about to learn about life through a book of death. When a bored shinigami, a God of Death, named Ryuk drops a black notepad called a <i>Death Note</i>, Light receives power over life and death with the stroke of a pen. Determined to use this dark gift for the best, Light sets out to rid the world of evil… namely, the people he believes to be evil. Should anyone hold such power?<br>

<br>

The consequences of Light’s actions will set the world ablaze.<br>

<br>

(Source: VIZ Media)"	"TV"	"FINISHED"	2006	"anime"	"published"	false		"2026-03-11 04:45:23.539"

"019cdb36-bd4e-7611-9e24-581fece8f437"	"Jujutsu Kaisen"	"jujutsu-kaisen"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg"	"[""JUJUTSU KAISEN"", ""呪術廻戦"", ""JJK"", ""Sorcery Fight"", ""咒术回战"", ""주술회전"", ""มหาเวทย์ผนึกมาร"", ""جوجوتسو كايسن"", ""Магическая битва"", ""咒術迴戰""]"	"A boy fights... for ""the right death.""<br>

<br>

Hardship, regret, shame: the negative feelings that humans feel become Curses that lurk in our everyday lives. The Curses run rampant throughout the world, capable of leading people to terrible misfortune and even death. What's more, the Curses can only be exorcised by another Curse.<br>

<br>

Itadori Yuji is a boy with tremendous physical strength, though he lives a completely ordinary high school life. One day, to save a friend who has been attacked by Curses, he eats the finger of the Double-Faced Specter, taking the Curse into his own soul. From then on, he shares one body with the Double-Faced Specter. Guided by the most powerful of sorcerers, Gojou Satoru, Itadori is admitted to the Tokyo Metropolitan Technical High School of Sorcery, an organization that fights the Curses... and thus begins the heroic tale of a boy who became a Curse to exorcise a Curse, a life from which he could never turn back.

<br><br>

(Source: Crunchyroll)<br>

<br>

<i>Note: The first episode received an early web premiere on September 19th, 2020. The regular TV broadcast started on October 3rd, 2020.</i>"	"TV"	"FINISHED"	2020	"anime"	"published"	false		"2026-03-11 04:45:23.658"

"019cdb36-bdb0-71cf-992d-53237cf92610"	"Boku no Hero Academia"	"boku-no-hero-academia"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/21459-yeVkolGKdGUV.jpg"	"[""My Hero Academia"", ""僕のヒーローアカデミア"", ""BNHA"", ""MHA"", ""나의 히어로 아카데미아 1기"", ""나히아 1기"", ""אקדמיית הגיבורים שלי"", ""我的英雄学院"", ""มายฮีโร่ อคาเดเมีย"", ""أكاديميتي للأبطال"", ""Η Δική Μου Ακαδημία Ηρώων "", ""Akademia bohaterów "", ""Моя геройская академия""]"	"What would the world be like if 80 percent of the population manifested extraordinary superpowers called “Quirks” at age four? Heroes and villains would be battling it out everywhere! Becoming a hero would mean learning to use your power, but where would you go to study? U.A. High's Hero Program of course! But what would you do if you were one of the 20 percent who were born Quirkless?<br><br>



Middle school student Izuku Midoriya wants to be a hero more than anything, but he hasn't got an ounce of power in him. With no chance of ever getting into the prestigious U.A. High School for budding heroes, his life is looking more and more like a dead end. Then an encounter with All Might, the greatest hero of them all gives him a chance to change his destiny…<br><br>



(Source: VIZ Media)"	"TV"	"FINISHED"	2016	"anime"	"published"	false		"2026-03-11 04:45:23.759"



content rating untuk koleksi

"019cdb36-c04e-7014-89a2-cf5669fb07b5"	"019cdb36-bf95-760b-9e85-6d276ad298d1"	1156	"2026-04-05 14:16:01.809"	false	"2026-03-11 04:45:24.429"	"2026-03-11 04:46:49.936"

genres
"019cdb38-3912-712f-8fec-df42e2bcaf36"	"Mecha"	"mecha"	false
"019cdb36-be7b-704e-820d-946a3073b445"	"Sci-Fi"	"sci-fi"	false
"019cdb36-d4b2-74cb-897e-2d7f5e975be2"	"Sports"	"sports"	false
"019cdb36-bb98-758d-8580-6e8f84f6d03a"	"Mystery"	"mystery"	false
"019cdb36-bb91-72f9-b370-951288c4be41"	"Drama"	"drama"	false
"019cdb36-bee3-706f-bad1-6c5600c64f76"	"Horror"	"horror"	false
"019cdb36-bcdc-7132-8d54-3f30176e1d90"	"Psychological"	"psychological"	false
"019cdb36-bce2-7219-9dcf-2adc99043ba5"	"Thriller"	"thriller"	false
"019cdb36-bb81-7182-a49a-2b319639bba5"	"Action"	"action"	false
"019cdb36-bc5a-7605-a9f4-2b8fe0244f63"	"Adventure"	"adventure"	false
"019cdb38-8ba2-769e-ac52-9f3abb490442"	"Mahou Shoujo"	"mahou-shoujo"	false
"019cdb36-d73e-76d9-b13b-a23698b2aeaa"	"Ecchi"	"ecchi"	true
"019cdb36-bb95-718e-a0e9-7783a1a2e1a0"	"Fantasy"	"fantasy"	false
"019cdb36-bc63-70df-bde5-ee7abf18e501"	"Supernatural"	"supernatural"	false
"019cdb36-bdb5-76ce-a562-d0832cd52837"	"Comedy"	"comedy"	false
"019cdb36-c12e-722b-ba9f-afe70313127f"	"Romance"	"romance"	false
"019cdb36-c1dd-772e-bef0-41d306393dff"	"Slice of Life"	"slice-of-life"	false
"019cdb36-d240-751b-a16e-721247c8283b"	"Music"	"music"	false

koleksi
"019cdb36-bc54-70b4-88b5-25f1bc008aa9"	"Kimetsu no Yaiba"	"kimetsu-no-yaiba"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg"	"[""Demon Slayer: Kimetsu no Yaiba"", ""鬼滅の刃"", ""KnY"", ""Kimetsu no Yaiba: Kyoudai no Kizuna"", ""Demon Slayer: Kimetsu no Yaiba: Bonds of Siblings"", ""鬼滅の刃-兄妹の絆-"", ""鬼灭之刃"", ""הלהב קוטל השדים"", ""قاتل الشياطين"", ""ดาบพิฆาตอสูร"", ""Miecz zabójcy demonów – Kimetsu no Yaiba"", "" Guardians de la nit: Kimetsu no Yaiba"", ""İblis Keser"", ""ΚΥΝΗΓΟΣ ΔΑΙΜΟΝΩΝ: KIMETSU NO YAIBA"", ""Zabiják démonů"", ""شیطان کش"", ""귀멸의 칼날"", ""Истребитель демонов"", ""Клинок, рассекающий демонов""]"	"It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon. To make matters worse, his younger sister Nezuko, the sole survivor, has been transformed into a demon herself. Though devastated by this grim reality, Tanjiro resolves to become a “demon slayer” so that he can turn his sister back into a human, and kill the demon that massacred his family.<br>
<br>
(Source: Crunchyroll)"	"TV"	"FINISHED"	2019	"anime"	"published"	false		"2026-03-11 04:45:23.407"
"019cdb36-bcd4-7522-b75f-2841cbc6948a"	"DEATH NOTE"	"death-note"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-kUgkcrfOrkUM.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg"	"[""Death Note"", ""DEATH NOTE"", ""デスノート"", ""死亡笔记"", ""מחברת המוות"", ""Notatnik śmierci"", ""Carnet de la Mort"", ""สมุดโน้ตกระชากวิญญาณ"", ""مذكرة الموت"", ""Тетрадь смерти""]"	"Light Yagami is a genius high school student who is about to learn about life through a book of death. When a bored shinigami, a God of Death, named Ryuk drops a black notepad called a <i>Death Note</i>, Light receives power over life and death with the stroke of a pen. Determined to use this dark gift for the best, Light sets out to rid the world of evil… namely, the people he believes to be evil. Should anyone hold such power?<br>
<br>
The consequences of Light’s actions will set the world ablaze.<br>
<br>
(Source: VIZ Media)"	"TV"	"FINISHED"	2006	"anime"	"published"	false		"2026-03-11 04:45:23.539"
"019cdb36-bdb0-71cf-992d-53237cf92610"	"Boku no Hero Academia"	"boku-no-hero-academia"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/21459-yeVkolGKdGUV.jpg"	"[""My Hero Academia"", ""僕のヒーローアカデミア"", ""BNHA"", ""MHA"", ""나의 히어로 아카데미아 1기"", ""나히아 1기"", ""אקדמיית הגיבורים שלי"", ""我的英雄学院"", ""มายฮีโร่ อคาเดเมีย"", ""أكاديميتي للأبطال"", ""Η Δική Μου Ακαδημία Ηρώων "", ""Akademia bohaterów "", ""Моя геройская академия""]"	"What would the world be like if 80 percent of the population manifested extraordinary superpowers called “Quirks” at age four? Heroes and villains would be battling it out everywhere! Becoming a hero would mean learning to use your power, but where would you go to study? U.A. High's Hero Program of course! But what would you do if you were one of the 20 percent who were born Quirkless?<br><br>

Middle school student Izuku Midoriya wants to be a hero more than anything, but he hasn't got an ounce of power in him. With no chance of ever getting into the prestigious U.A. High School for budding heroes, his life is looking more and more like a dead end. Then an encounter with All Might, the greatest hero of them all gives him a chance to change his destiny…<br><br>

(Source: VIZ Media)"	"TV"	"FINISHED"	2016	"anime"	"published"	false		"2026-03-11 04:45:23.759"
"019cdb36-be75-7569-8508-2fa2375280c5"	"One Punch Man"	"one-punch-man"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21087-B5DHjqZ3kW4b.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/21087-sHb9zUZFsHe1.jpg"	"[""One-Punch Man"", ""ワンパンマン"", ""OPM"", ""Wanpanman"", ""איש האגרוף הבודד"", ""一拳超人"", ""วันพันช์แมน"", ""Jagoan Sekali Pukul S1"", ""رجل اللكمة الواحدة"", ""ون بنش مان"", ""Ванпанчмен""]"	"Saitama has a rather peculiar hobby, being a superhero, but despite his heroic deeds and superhuman abilities, a shadow looms over his life. He's become much too powerful, to the point that every opponent ends up defeated with a single punch.
<br><br>
The lack of challenge has driven him into a state of apathy, as he watches his life pass by having lost all enthusiasm, at least until he's unwillingly thrust in the role of being a mentor to the young and revenge-driven Genos.   

"	"TV"	"FINISHED"	2015	"anime"	"published"	false		"2026-03-11 04:45:23.956"
"019cdb36-bedd-73c7-ac8a-4f26d9e19f24"	"Tokyo Ghoul"	"tokyo-ghoul"	"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/b20605-k665mVkSug8D.jpg"	"https://s4.anilist.co/file/anilistcdn/media/anime/banner/20605-RCJ7M71zLmrh.jpg"	"[""Tokyo Ghoul"", ""東京喰種 トーキョーグール"", ""Tokyo Kushu"", ""שדי טוקיו"", ""东京食种"", ""طوكيو غول"", ""Токийский гуль""]"	"The suspense horror/dark fantasy story is set in Tokyo, which is haunted by mysterious ""ghouls"" who are devouring humans. People are gripped by the fear of these ghouls whose identities are masked in mystery. An ordinary college student named Kaneki encounters Rize, a girl who is an avid reader like him, at the café he frequents. Little does he realize that his fate will change overnight.
<br><br>
(Source: Anime News Network)"	"TV"	"FINISHED"	2014	"anime"	"published"	false		"2026-03-11 04:45:24.06"

koleksi_characters
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bc06-74a4-8123-f9722124d709"	"019cdb36-bc06-74a4-8123-ff129ef3be39"	"MAIN"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bc08-7658-b219-ea0a789125b6"	"019cdb36-bc09-777f-a9db-9709873317e7"	"MAIN"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bc0b-7303-bb0c-2b5d31540512"	"019cdb36-bc0b-7303-bb0c-2fcb6cb53f45"	"SUPPORTING"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bc0d-755f-a157-e680575eb8bb"	"019cdb36-bc0e-775d-afc3-d78bd475043c"	"SUPPORTING"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bc13-750e-92c7-69ec1f613a8a"	"019cdb36-bc13-750e-92c7-6c3e265e5943"	"SUPPORTING"

koleksi genres
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bb81-7182-a49a-2b319639bba5"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bb91-72f9-b370-951288c4be41"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bb95-718e-a0e9-7783a1a2e1a0"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bb98-758d-8580-6e8f84f6d03a"

koleksi_mappings
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	16498	16498			"2026-03-11 04:46:48.486"
"019cdb36-bc54-70b4-88b5-25f1bc008aa9"	101922	38000			"2026-03-11 04:46:48.967"
"019cdb36-bcd4-7522-b75f-2841cbc6948a"	1535	1535			"2026-03-11 04:46:49.092"
"019cdb36-bd4e-7611-9e24-581fece8f437"	113415	40748			"2026-03-11 04:46:49.206"

koleksi relations
"019cdb36-bc42-71df-9665-5ab0e85638a2"	"019cdb36-bb59-7255-a3df-4498ddee6d2a"	53390	"ADAPTATION"
"019cdb36-bc44-711a-9d39-cd47f342bc1a"	"019cdb36-bb59-7255-a3df-4498ddee6d2a"	20691	"ALTERNATIVE"
"019cdb36-bc45-77fd-9199-970d9d4e725c"	"019cdb36-bb59-7255-a3df-4498ddee6d2a"	20692	"ALTERNATIVE"
"019cdb36-bc46-71ac-a1ec-90739108c91a"	"019cdb36-bb59-7255-a3df-4498ddee6d2a"	20958	"SEQUEL"

koleksi staff
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bbbd-771b-958f-897ea7a4f63f"	"Original Creator"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bbca-7158-9839-fc2e1ede84d1"	"Assistant Director"
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bbd1-702f-a99a-3bde45a7c038"	"Sub Character Design"
"019cdb36-bcd4-7522-b75f-2841cbc6948a"	"019cdb36-bcf6-758b-921b-5ab3874c6967"	"Art Director"

koleksi studios
"019cdb36-c313-7798-abfb-a75d66278af2"	"019cdb36-bd59-702f-933e-d33a3d5485da"	false
"019cdb36-bc54-70b4-88b5-25f1bc008aa9"	"019cdb36-bc6a-7324-8ba8-9e9446082f29"	false
"019cdb36-bedd-73c7-ac8a-4f26d9e19f24"	"019cdb36-beeb-71df-aac9-979190fed05e"	false
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bba7-70d6-b70f-64e18209f641"	false
"019cdb36-bb59-7255-a3df-4498ddee6d2a"	"019cdb36-bba9-738b-83b1-5c1ae5a2e429"	false

pending_mappings
"019cdb36-d734-767c-9897-6d58960ce2c6"	"anilist"	"19815"	"No Game No Life"	"pending"	"019cdb36-d733-7628-bb93-c48592a357e4"	"2026-03-11 04:45:30.288"	
"019cdb38-36a7-778f-b8dc-59b52461a900"	"anilist"	"20789"	"Nanatsu no Taizai"	"pending"	"019cdb38-36a5-70ef-82de-05bebca7c7f0"	"2026-03-11 04:47:00.257"	
"019cdb38-37e5-774e-abb9-442b5f95fefc"	"anilist"	"21202"	"Kono Subarashii Sekai ni Shukufuku wo!"	"pending"	"019cdb38-37e4-70c9-a66a-e059309092ac"	"2026-03-11 04:47:00.578"	
"019cdb38-5037-7428-8434-a045e6774b64"	"anilist"	"108465"	"Mushoku Tensei: Isekai Ittara Honki Dasu"	"pending"	"019cdb38-5036-7183-aeeb-658835eab4df"	"2026-03-11 04:47:06.805"	
"019cdb38-5272-734e-98f4-b483b8fb0b2b"	"anilist"	"18679"	"Kill la Kill"	"pending"	"019cdb38-5271-7079-899d-dd4b4a122ff7"	"2026-03-11 04:47:07.374"	

staff
"019cdb36-bbde-7469-b6b7-84135482624b"	152216	"Kyouhei Tezuka"	"https://s4.anilist.co/file/anilistcdn/staff/large/n152216-O79EIRTW1kZP.png"
"019cdb36-bbef-7465-a77f-7448c4d9380a"	140950	"Kazuhiro Yamada "	"https://s4.anilist.co/file/anilistcdn/staff/large/n140950-y7KxJ03nrX4Z.jpg"
"019cdb36-bbc7-72ed-80ff-80e64c283caa"	100088	"Tetsurou Araki"	"https://s4.anilist.co/file/anilistcdn/staff/large/n100088-tFWlDxGJEPlk.png"
"019cdb36-bbe9-70f3-9e6e-a652b16e8990"	135988	"Satoshi Hashimoto"	"https://s4.anilist.co/file/anilistcdn/staff/large/n135988-LIvNK8J0oe2b.png"
"019cdb36-bbd5-750b-aa66-9ae2d6f7c45c"	106761	"Tomomi Ozaki"	"https://s4.anilist.co/file/anilistcdn/staff/large/n106761-IKgI9pj4B5Ch.jpg"

studios
"019cdb36-c066-772a-962f-274e0357fd38"	58	"Square Enix"	false	
"019cdb36-beee-77d4-8427-1a33c8b4241c"	751	"Marvelous"	false	
"019cdb36-bfac-752c-a2ef-6cbbf792e26d"	416	"TAP"	true	
"019cdb36-bfa3-729e-8a40-4f5706f8849d"	18	"Toei Animation"	true	
"019cdb36-be87-71be-a14b-021823025be4"	142	"Asatsu DK"	false	

voice actors
"019cdb36-bcc8-73b7-b465-ad520df428a7"	96762	"Ryouhei Kimura"	"https://s4.anilist.co/file/anilistcdn/staff/large/n96762-DNKMFBA2vWRr.jpg"
"019cdb36-bc06-74a4-8123-ff129ef3be39"	95672	"Yuuki Kaji"	"https://s4.anilist.co/file/anilistcdn/staff/large/n95672-RN4nm0OFwCyU.png"
"019cdb36-bc36-7161-a132-6e8f642e176e"	95756	"Anri Katsu"	"https://s4.anilist.co/file/anilistcdn/staff/large/n95756-MmmuyQK4Thzl.png"
"019cdb36-bc28-7749-bad6-5d378f45c641"	106236	"Shiori Mikami"	"https://s4.anilist.co/file/anilistcdn/staff/large/n106236-aGhlIhHPPtjc.png"
"019cdb36-bcb8-72b9-9dca-2d94bc9757d3"	95002	"Tomokazu Sugita"	"https://s4.anilist.co/file/anilistcdn/staff/large/n95002-nDIvHaynicEg.png"

