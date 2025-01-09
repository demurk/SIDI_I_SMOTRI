// import nock from "nock";

// nock("*", {
//     filteringScope: (scope) => true,
// }).reply(200);

var KPFR_LINK = "https://k1.kpfr.fun/";
const DETA_LINK = "https://sidi_i_smotri-1-r2592718.deta.app";
var current_search_type = 2;
const search_type_map = {
    1: {
        type: "kinobox/index.php?title",
        changeToText: "Переключиться на поиск по ID",
        placeholder: "Поиск по названию...",
    },
    2: {
        type: "kinobox/index.php?kinopoisk",
        changeToText: "Переключиться на поиск по Названию",
        placeholder: "Поиск по ID...",
    },
};

const PLAYER = document.getElementById("player");
const CURRENT_FILM_NAME = document.getElementById("film_name");
const SEARCH_BAR = document.getElementById("search");
const TYPE_BTN = document.getElementById("type_btn");
const HISTORY_DROPDOWN = document.getElementById("history_dropdown");
const PLAYERS = document.getElementById("players");
const SEARCH_LIST = document.getElementById("search_list");

function set_loading(is_loading) {
    const loader = document.getElementById("loader");
    loader.style.display = is_loading ? "inline-block" : "none";
}

function toggle_type() {
    current_search_type = current_search_type === 1 ? 2 : 1;
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

function get_players(specific_search_type = null, specific_input = null) {
    set_loading(true);
    PLAYER.removeAttribute("src");
    CURRENT_FILM_NAME.innerText = "";

    const head = new Headers();
    head.append("sec-fetch-mode", "no-cors");

    const requestOptions = {
        method: "GET",
        headers: head,
    };

    const search_type = search_type_map[specific_search_type || current_search_type].type;
    const input = specific_input || SEARCH_BAR.value;

    fetch(`${KPFR_LINK}${search_type}=${input}`, requestOptions)
        .then(function (response) {
            return response.json();
        })
        .then(function (resp) {
            render_player_buttons(resp.success ? resp.data : []);
        });
}

function render_player_buttons(players_data) {
    set_loading(false);
    const players_buttons = players_data
        .filter((data) => data.iframeUrl)
        .map((data, i) => {
            const button = document.createElement("button");
            button.textContent = `${data.quality ? `(${data.quality}) ` : ""}${
                data.translation ? data.translation : ""
            }`;
            button.onclick = () => {
                PLAYER.removeAttribute("src");
                set_player_src(data.iframeUrl);
            };
            if (i === 0 && PLAYER.getAttribute("src") == null) {
                set_player_src(data.iframeUrl);
            }
            return button;
        });
    PLAYERS.replaceChildren(...players_buttons);
}

function set_player_src(url) {
    if (PLAYER.getAttribute("src") !== url) {
        hide_history();
        set_loading(true);
        PLAYER.removeAttribute("src");
        PLAYER.setAttribute("src", url);

        const input = SEARCH_BAR.value.toLowerCase();
        CURRENT_FILM_NAME.innerText = input;
        update_search_list(url);
    }
}

function update_search_list(url) {
    const cur_search_list = JSON.parse(localStorage.getItem("search-list")) || [];
    const input = SEARCH_BAR.value.toLowerCase();
    if (input) {
        const existing_index = cur_search_list.findIndex((data) => data.title === input);
        if (existing_index === -1) {
            localStorage.setItem(
                "search-list",
                JSON.stringify([{ url, title: input }, ...cur_search_list.splice(0, 4)])
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
        set_loading(false);
    }
    const history_buttons = search_list.map((data, i) => {
        function action() {
            set_player_src(data.url);
            CURRENT_FILM_NAME.innerText = data.title;
            PLAYERS.replaceChildren();
        }
        const button = document.createElement("a");
        button.textContent = data.title;
        button.href = "#";
        button.className = "history-btn";
        if (i === 0 && PLAYER.getAttribute("src") == null) action();
        button.onclick = action;
        return button;
    });
    HISTORY_DROPDOWN.replaceChildren(...history_buttons);
}

function suggest_film_name() {
    open_search_list();
    const value = document.getElementById("search").value;
    fetch(`${DETA_LINK}/get_films/${value}`)
        .then((response) => {
            return response.json();
        })
        .then((result) => {
            const search_list_buttons = result.map((movie) => {
                function action() {
                    SEARCH_BAR.value = movie.title;
                    get_players((specific_search_type = 2), (specific_input = movie.id));
                }
                const button = document.createElement("a");
                button.href = "#";
                button.classList.add("history-btn");
                button.classList.add("option");

                const title = document.createElement("span");
                title.innerText = movie.title;
                button.appendChild(title);
                const rating = document.createElement("span");
                rating.innerText = movie.rating;
                button.appendChild(rating);

                button.onclick = action;
                return button;
            });
            SEARCH_LIST.replaceChildren(...search_list_buttons);
        })
        .catch((error) => console.error(error));
}

function on_load() {
    toggle_type();
    const form = document.getElementById("form");
    function handleForm(event) {
        event.preventDefault();
    }
    form.addEventListener("submit", handleForm);
    update_history();
    //fetch_kprf_link();

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

function fetch_kprf_link() {
    fetch(`${DETA_LINK}/get_url`)
        .then((response) => response.json())
        .then((r_json) => {
            KPFR_LINK = r_json.url;
        });
}

on_load();
