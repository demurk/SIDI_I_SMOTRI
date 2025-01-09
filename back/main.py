from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import aiohttp

import re
import logging

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_headers=["*"],
)

LINKS = {}


# @app.on_event("startup")
# async def app_startup():
#     asyncio.create_task(run_main())


# async def run_main():
#     while True:
#         await asyncio.sleep(3600)
#         LINKS.clear()


@app.get("/get_url")
async def get_url():
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("https://www.kinopoisk.cx") as resp:
                r_text = await resp.text()
                # logging.exception(r_text)
                # url = re.search("document.location.href='(.+?)'", r_text).group(1)
                return JSONResponse({"url": r_text}, status_code=status.HTTP_200_OK)

    except Exception as e:
        logging.exception(e)
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.get("/get_films/{film_name}")
async def get_films(film_name: str):
    try:
        url = "https://graphql.kinopoisk.ru/graphql/?operationName=SuggestSearch"
        payload = (
            '{"query":"query SuggestSearch($keyword: String!, $yandexCityId: Int, $limit: Int) { suggest(keyword: $keyword) { top(yandexCityId: $yandexCityId, limit: $limit) { topResult { global { ...SuggestMovieItem ...SuggestPersonItem ...SuggestCinemaItem ...SuggestMovieListItem __typename } __typename } movies { movie { ...SuggestMovieItem __typename } __typename } persons { person { ...SuggestPersonItem __typename } __typename } cinemas { cinema { ...SuggestCinemaItem __typename } __typename } movieLists { movieList { ...SuggestMovieListItem __typename } __typename } __typename } __typename } } fragment SuggestMovieItem on Movie { id contentId title { russian original __typename } rating { kinopoisk { isActive value __typename } __typename } poster { avatarsUrl fallbackUrl __typename } viewOption { buttonText isAvailableOnline: isWatchable(filter: {anyDevice: false, anyRegion: false}) purchasabilityStatus contentPackageToBuy { billingFeatureName __typename } type availabilityAnnounce { groupPeriodType announcePromise availabilityDate type __typename } __typename } ... on Film { type productionYear __typename } ... on TvSeries { releaseYears { end start __typename } __typename } ... on TvShow { releaseYears { end start __typename } __typename } ... on MiniSeries { releaseYears { end start __typename } __typename } __typename } fragment SuggestPersonItem on Person { id name originalName birthDate poster { avatarsUrl fallbackUrl __typename } __typename } fragment SuggestCinemaItem on Cinema { id ctitle: title city { id name geoId __typename } __typename } fragment SuggestMovieListItem on MovieListMeta { id cover { avatarsUrl __typename } coverBackground { avatarsUrl __typename } name url description movies(limit: 0) { total __typename } __typename } ","variables":{"keyword":"'
            + film_name
            + '","yandexCityId":213,"limit":5}}'
        )
        headers = {
            "accept": "*/*",
            "content-type": "application/json",
            "origin": "https://www.kinopoisk.ru",
            "service-id": "25",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 YaBrowser/24.6.0.0 Safari/537.36",
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, data=payload) as resp:
                r_json = await resp.json()
                response_json = r_json["data"]["suggest"]["top"]

                if response_json["topResult"]:
                    return JSONResponse(
                        [
                            {
                                "id": x["id"],
                                "title": x["title"].get("russian") or x["title"].get("original"),
                                "rating": x["rating"]["kinopoisk"]["value"]
                                and round(x["rating"]["kinopoisk"]["value"], 1)
                                or "?",
                            }
                            for x in [
                                response_json["topResult"]["global"],
                                *[y["movie"] for y in response_json["movies"]],
                            ]
                            if x.get("title")
                        ]
                    )
                return JSONResponse([])

    except Exception as e:
        logging.exception(e)
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# @app.post("/set_film_id")
# async def set_film_id(request: Request):
#     try:
#         r_json = await request.json()
#         LINKS.update({r_json["key"]: r_json["link"]})
#         return JSONResponse(status_code=status.HTTP_201_CREATED)
#         # return JSONResponse(status_code=status.HTTP_403_FORBIDDEN)

#     except Exception as e:
#         logging.exception(e)
#         return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# @app.post("/get_film_id")
# async def get_film_id(request: Request):
#     try:
#         r_json = await request.json()
#         return JSONResponse({"link": LINKS.get(r_json["key"])}, status_code=status.HTTP_200_OK)

#     except Exception as e:
#         logging.exception(e)
#         return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
