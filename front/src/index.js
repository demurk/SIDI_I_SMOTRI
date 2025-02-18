var current_search_type = 2;
const search_type_map = {
    title: {
        fetch: search_by_name,
        changeToText: "Переключиться на поиск по ID",
        placeholder: "Поиск по названию...",
    },
    kinopoisk: {
        fetch: search_by_id,
        changeToText: "Переключиться на поиск по Названию",
        placeholder: "Поиск по ID...",
    },
};

const PLAYER_XPATH = "#player";
const PLAYER = document.getElementById("player");
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
    loader.style.display = is_loading ? "inline-block" : "none";
}

function toggle_type() {
    current_search_type = current_search_type === "title" ? "kinopoisk" : "title";
    TYPE_BTN.innerText = search_type_map[current_search_type].changeToText;
    SEARCH_BAR.placeholder = search_type_map[current_search_type].placeholder;
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

function search_by_id(value) {
    search({ kinopoisk: value });
}

function search_by_name(value) {
    search({ title: value });
}

function search(value) {
    kbox(PLAYER_XPATH, {
        search: value,
        menu: {
            default: "menu_button",
            format: "{N} - {S} : {T} ({Q})",
        },
    });
    update_search_list(value);
}

function fetch_video_players(specific_search_type = null, specific_input = null) {
    set_loading(true, LOADER_PLAYER_ID);
    PLAYER.innerHTML = "";
    const input = specific_input || SEARCH_BAR.value;
    CURRENT_FILM_NAME.innerText = input;

    const search_func = search_type_map[specific_search_type || current_search_type].fetch;

    search_func(input);
}

function update_search_list(value) {
    const [type, titleRaw] = Object.entries(value)[0];
    const cur_search_list = JSON.parse(localStorage.getItem("search-list")) || [];
    const title = titleRaw.toLowerCase();
    if (title) {
        const existing_index = cur_search_list.findIndex((data) => data.title === title);
        if (existing_index === -1) {
            localStorage.setItem(
                "search-list",
                JSON.stringify([{ type, title }, ...cur_search_list.splice(0, 4)])
            );
        } else {
            const element = cur_search_list[existing_index];
            cur_search_list.splice(existing_index, 1);
            cur_search_list.splice(0, 0, element);
            localStorage.setItem("search-list", JSON.stringify(cur_search_list));
        }
        update_history();
    }
}

function update_history() {
    const search_list = JSON.parse(localStorage.getItem("search-list")) || [];
    if (search_list.length === 0) {
        set_loading(false, LOADER_PLAYER_ID);
    }
    const history_buttons = search_list.map((data, i) => {
        function action() {
            FIRST_SEARCH = false;
            search_type = search_type_map[data.type];
            search_type.fetch(data.title);
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
    set_loading(true, LOADER_POPULAR_ID);
    fetch(`https://kinobox.tv/api/films/popular?type=${type}`, {
        headers: {
            accept: "*/*",
            "accept-language": "ru,en;q=0.9",
            "cache-control": "no-cache",
            pragma: "no-cache",
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
            const buttons = response.map((value) => {
                function action() {
                    search_by_id(value.id);
                    CURRENT_FILM_NAME.innerText = value.title;
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
                title.textContent = value.title;

                button.appendChild(title);
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
