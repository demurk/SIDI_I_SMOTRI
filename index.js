var current_search_type = "kinopoisk";
const search_type_map = {
    title: {
        changeToText: "Переключиться на поиск по ID",
        placeholder: "Поиск по названию...",
    },
    kinopoisk: {
        changeToText: "Переключиться на поиск по Названию",
        placeholder: "Поиск по ID...",
    },
};

const PLAYER_XPATH = "#player";
const CURRENT_FILM_NAME = document.getElementById("film_name");
const SEARCH_BAR = document.getElementById("search");
const TYPE_BTN = document.getElementById("type_btn");
const HISTORY_DROPDOWN = document.getElementById("history_dropdown");
const SEARCH_LIST = document.getElementById("search_list");
const POPULAR_CONTAINER = document.getElementById("popular_container");
const LOADER_PLAYER_ID = "loader-player";
const LOADER_POPULAR_ID = "loader-popular";

var FIRST_SEARCH = true;

function set_loading(is_loading, loader_id) {
    const loader = document.getElementById(loader_id);
    if (loader) {
        loader.style.display = is_loading ? "inline-block" : "none";
    }
}

function toggle_type() {
    current_search_type = current_search_type === "title" ? "kinopoisk" : "title";
    TYPE_BTN.innerText = search_type_map[current_search_type].changeToText;
    SEARCH_BAR.placeholder = search_type_map[current_search_type].placeholder;
}

function try_fullscreen() {
    const video = PLAYER.getElementsByClassName("kinobox_iframe")[0];
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
    else if (video.msRequestFullScreen) video.msRequestFullScreen();
}

function open_search_list() {
    SEARCH_LIST.classList.add("show");
}

function toggle_history() {
    HISTORY_DROPDOWN.classList.toggle("show");
}

function hide_history() {
    HISTORY_DROPDOWN.classList.remove("show");
}

function search_wrapper(value) {
    const s = value.kinopoisk ? { kinopoisk: value.kinopoisk } : { title: value.title };

    kbox(PLAYER_XPATH, {
        search: s,
        menu: {
            default: "menu_button",
            format: "{N} - {S} : {T} ({Q})",
        },
    });
    update_search_list(value);
}

function search_video_from_form() {
    set_loading(true, LOADER_PLAYER_ID);
    CURRENT_FILM_NAME.innerText = SEARCH_BAR.value;

    search_wrapper({ [current_search_type]: SEARCH_BAR.value });
}

function update_search_list(value) {
    const cur_search_list = JSON.parse(localStorage.getItem("search-list")) || [];
    const title = value.title.toLowerCase();

    const existing_value_index =
        cur_search_list.findIndex((data) => data.title === title) + 1 ||
        cur_search_list.findIndex((data) => data.kinopoisk === value.kinopoisk) + 1 - 1;

    if (existing_value_index === -1) {
        localStorage.setItem(
            "search-list",
            JSON.stringify([value, ...cur_search_list.splice(0, 4)])
        );
    } else {
        cur_search_list.splice(existing_value_index, 1);
        cur_search_list.splice(0, 0, value);
        localStorage.setItem("search-list", JSON.stringify(cur_search_list));
    }

    update_history();
}

function update_history() {
    const search_list = JSON.parse(localStorage.getItem("search-list")) || [];
    if (search_list.length === 0) {
        set_loading(false, LOADER_PLAYER_ID);
    }
    const history_buttons = search_list.map((data, i) => {
        function action() {
            FIRST_SEARCH = false;
            search_wrapper(data);
            CURRENT_FILM_NAME.innerText = data.title;
        }
        const button = document.createElement("a");
        button.textContent = data.title;
        button.href = "#";
        button.className = "history-btn";
        if (i === 0 && FIRST_SEARCH) action();
        button.onclick = action;
        return button;
    });
    HISTORY_DROPDOWN.replaceChildren(...history_buttons);
}

function fetch_popular(type) {
    const type_to_arg = {
        animation: "genre=animation",
        film: "films=true",
        series: "series=true",
    };

    set_loading(true, LOADER_POPULAR_ID);
    fetch(`https://kp.kinobox.tv/films/popular?released=true&page=1&${type_to_arg[type]}`, {
        headers: {
            accept: "*/*",
            "accept-language": "ru,en;q=0.9",
            priority: "u=1, i",
            "sec-ch-ua":
                '"Chromium";v="130", "YaBrowser";v="24.12", "Not?A_Brand";v="99", "Yowser";v="2.5"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
        },
        referrer: "https://kinomix.web.app/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "omit",
    })
        .then((response) => response.json())
        .then((response) => {
            const buttons = response.data.films.map((value) => {
                function action() {
                    CURRENT_FILM_NAME.innerText = value.title.russian || value.title.original;
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    search_wrapper({
                        kinopoisk: value.id,
                        title: value.title.russian || value.title.original,
                    });
                }

                const button = document.createElement("button");
                button.onclick = action;
                button.className = "popular-btn";

                const poster = document.createElement("img");
                poster.src = value.posterUrl;
                poster.className = "popular-poster";
                button.appendChild(poster);

                const title = document.createElement("div");
                title.className = "popular-title";
                title.textContent = value.title.russian || value.title.original;
                button.appendChild(title);

                const rating = document.createElement("div");
                rating.className = "popular-rating";
                const ratingValue = value.rating.kinopoisk.value || value.rating.imdb.value;
                if (ratingValue) {
                    rating.textContent = ratingValue.toFixed(1);
                } else {
                    rating.textContent = "-";
                }
                button.appendChild(rating);

                const country = document.createElement("div");
                country.className = "popular-country";
                country.textContent = value.countries
                    .map((v) => v.name)
                    .slice(0, 2)
                    .join(", ");
                button.appendChild(country);

                const genre = document.createElement("div");
                genre.className = "popular-genre";
                genre.textContent = value.genres.map((v) => v.name).join(", ");
                button.appendChild(genre);

                return button;
            });
            set_loading(false, LOADER_POPULAR_ID);
            POPULAR_CONTAINER.replaceChildren(...buttons);
        });
}

function on_load() {
    toggle_type();
    const form = document.getElementById("form");
    function handleForm(event) {
        event.preventDefault();
    }
    form.addEventListener("submit", handleForm);
    update_history();
    fetch_popular("film");

    window.onclick = function (event) {
        if (!event.target.matches(".dropbtn")) {
            var dropdowns = document.getElementsByClassName("dropdown-content");
            var i;
            for (i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains("show")) {
                    openDropdown.classList.remove("show");
                }
            }
        }
    };
}

on_load();

function suggest_film_name() {
    // const myHeaders = new Headers();
    // myHeaders.append("accept", " */*");
    // myHeaders.append("content-type", " application/json");
    // myHeaders.append("service-id", " 25");
    // myHeaders.append("origin", " https://www.kinopoisk.ru");
    // myHeaders.append(
    //     "user-agent",
    //     " Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 YaBrowser/24.6.0.0 Safari/537.36"
    // );
    // myHeaders.append(
    //     "Cookie",
    //     "_yasc=zBAHVEoPpaWOPtXSzs6DX/zapiYCNVpyErm1cTN7zKWGAIQGfI5vA62VxdGbAUbB; i=AbUmbG0cG991wAaBae/lyeAGDKFgRm9oeQWx96ZzXnXY70k86YAvnSb146vdjlPZ662sMm+DSPQgKiB3Y39lLezHRCg=; yandexuid=6234747481736448766; yashr=4222809481736448766"
    // );
    // const raw =
    //     '{"query":"query SuggestSearch($keyword: String!, $yandexCityId: Int, $limit: Int) { suggest(keyword: $keyword) { top(yandexCityId: $yandexCityId, limit: $limit) { topResult { global { ...SuggestMovieItem ...SuggestPersonItem ...SuggestCinemaItem ...SuggestMovieListItem __typename } __typename } movies { movie { ...SuggestMovieItem __typename } __typename } persons { person { ...SuggestPersonItem __typename } __typename } cinemas { cinema { ...SuggestCinemaItem __typename } __typename } movieLists { movieList { ...SuggestMovieListItem __typename } __typename } __typename } __typename } } fragment SuggestMovieItem on Movie { id contentId title { russian original __typename } rating { kinopoisk { isActive value __typename } __typename } poster { avatarsUrl fallbackUrl __typename } viewOption { buttonText isAvailableOnline: isWatchable(filter: {anyDevice: false, anyRegion: false}) purchasabilityStatus contentPackageToBuy { billingFeatureName __typename } type availabilityAnnounce { groupPeriodType announcePromise availabilityDate type __typename } __typename } ... on Film { type productionYear __typename } ... on TvSeries { releaseYears { end start __typename } __typename } ... on TvShow { releaseYears { end start __typename } __typename } ... on MiniSeries { releaseYears { end start __typename } __typename } __typename } fragment SuggestPersonItem on Person { id name originalName birthDate poster { avatarsUrl fallbackUrl __typename } __typename } fragment SuggestCinemaItem on Cinema { id ctitle: title city { id name geoId __typename } __typename } fragment SuggestMovieListItem on MovieListMeta { id cover { avatarsUrl __typename } coverBackground { avatarsUrl __typename } name url description movies(limit: 0) { total __typename } __typename } ","variables":{"keyword":"\'a\'","yandexCityId":213,"limit":5}}';
    // const requestOptions = {
    //     method: "POST",
    //     headers: myHeaders,
    //     body: raw,
    //     redirect: "follow",
    // };
    // fetch("https://graphql.kinopoisk.ru/graphql/?operationName=SuggestSearch", requestOptions)
    //     .then((response) => response.text())
    //     .then((result) => console.log(result))
    //     .catch((error) => console.error(error));
    //
    //
    // open_search_list();
    // const value = document.getElementById("search").value;
    // fetch(`${DETA_LINK}/get_films/${value}`)
    //     .then((response) => {
    //         return response.json();
    //     })
    //     .then((result) => {
    //         const search_list_buttons = result.map((movie) => {
    //             function action() {
    //                 SEARCH_BAR.value = movie.title;
    //                 get_players((specific_search_type = 2), (specific_input = movie.id));
    //             }
    //             const button = document.createElement("a");
    //             button.href = "#";
    //             button.classList.add("history-btn");
    //             button.classList.add("option");
    //             const title = document.createElement("span");
    //             title.innerText = movie.title;
    //             button.appendChild(title);
    //             const rating = document.createElement("span");
    //             rating.innerText = movie.rating;
    //             button.appendChild(rating);
    //             button.onclick = action;
    //             return button;
    //         });
    //         SEARCH_LIST.replaceChildren(...search_list_buttons);
    //     })
    //     .catch((error) => console.error(error));
}
