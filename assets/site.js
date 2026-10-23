/* Irad League · Football Federation of Irad. Header, menu, footer, language and the data-driven parts.
   Tables, form and the title race are computed from data/season-2026.json. */
(function () {
  "use strict";
  var I = window.IL_I18N, LANGS = ["en", "ir", "ru"], LANG = "en";
  var qs = new URLSearchParams(location.search);
  try { var saved = localStorage.getItem("iradleague_lang"); if (LANGS.indexOf(saved) >= 0) LANG = saved; } catch (e) {}
  if (LANGS.indexOf(qs.get("lang")) >= 0) LANG = qs.get("lang");
  var BODY = document.body, PAGE = BODY.getAttribute("data-page"), NAVKEY = BODY.getAttribute("data-nav") || PAGE;
  var SEASON_FILE = "data/season-2026.json";

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function raw(k) { var u = I.ui[LANG]; return u && u[k] != null && u[k] !== "" ? u[k] : I.ui.en[k]; }
  function t(k, v) {
    var s = raw(k); if (s == null) return k;
    if (v) Object.keys(v).forEach(function (x) { s = s.split("{" + x + "}").join(v[x]); });
    return s;
  }
  function L(o) { if (o == null) return ""; if (typeof o === "string") return o; return o[LANG] || o.en || ""; }
  function plural(n, en1, enN, ru) {
    if (LANG === "ru") { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? ru[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? ru[1] : ru[2]; }
    if (LANG === "ir") return enN === "points" ? "upay" : enN;
    return n === 1 ? en1 : enN;
  }
  function ptsWord(n) { return plural(n, "point", "points", ["очко", "очка", "очков"]); }
  function signed(n) { return n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0"; }
  function score(s) { return s[0] + "–" + s[1]; }

  var cache = {};
  function load(path) {
    if (!cache[path]) cache[path] = fetch(path, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(path + " " + r.status); return r.json(); });
    return cache[path];
  }

  /* ---------- dates (Irad Time, UTC+6) ---------- */
  var NOW = new Date(Date.now() + 6 * 3600000);
  var TODAY = NOW.toISOString().slice(0, 10), NOWMIN = NOW.getUTCHours() * 60 + NOW.getUTCMinutes();
  function pd(s) { var p = s.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function fmtDate(s, o) {
    o = o || {}; var d = pd(s), U = I.ui[LANG], day = d.getUTCDate(), mo = d.getUTCMonth(), wd = d.getUTCDay(), y = d.getUTCFullYear();
    if (o.short) {
      if (LANG === "ru") return (o.day ? U.daysShort[wd] + ", " : "") + day + " " + U.monthsShort[mo] + (o.year ? " " + y : "");
      if (LANG === "ir") return (o.year ? y + "-j., " : "") + day + "-" + U.monthsShort[mo] + (o.day ? ", " + U.daysShort[wd] : "");
      return (o.day ? U.daysShort[wd] + " " : "") + day + " " + U.monthsShort[mo] + (o.year ? " " + y : "");
    }
    if (LANG === "ru") return (o.day ? U.days[wd] + ", " : "") + day + " " + U.months[mo] + (o.year ? " " + y + " г." : "");
    if (LANG === "ir") return (o.year ? y + "-jılı " : "") + day + "-" + U.months[mo] + (o.day ? ", " + U.days[wd].toLowerCase() : "");
    return (o.day ? U.days[wd] + " " : "") + day + " " + U.months[mo] + (o.year ? " " + y : "");
  }
  function daysUntil(s) { return Math.round((pd(s) - pd(TODAY)) / 86400000); }
  function untilText(s) {
    var n = daysUntil(s);
    if (n === 0) return t("today"); if (n === 1) return t("tomorrow"); if (n < 0) return "";
    return LANG === "ru" ? "через " + n + " " + plural(n, "", "", ["день", "дня", "дней"]) : t("inDays", { n: n });
  }
  function minutes(hm) { var p = (hm || "00:00").split(":"); return +p[0] * 60 + +p[1]; }
  function status(m, date) {
    if (m.score) return "played";
    if (date < TODAY || (date === TODAY && NOWMIN >= minutes(m.time) + 115)) return "wait";
    return "next";
  }

  /* ---------- clubs ---------- */
  var CLUBS = {}, GROUNDS = {};
  function clubLink(id, o) {
    o = o || {}; var c = CLUBS[id];
    if (!c) return '<span class="cl"><span class="nm">' + esc(id) + "</span></span>";
    var inner = '<img src="assets/crests/' + id + (o.big ? "" : "-small") + '.svg" alt="" width="22" height="22" loading="lazy">' +
      '<span class="nm nm-f">' + esc(L(c.name)) + '</span><span class="nm nm-s">' + esc(L(c.short)) + "</span>";
    return o.nolink ? '<span class="cl">' + inner + "</span>" : '<a class="cl" href="club-' + id + '.html">' + inner + "</a>";
  }
  function groundName(id) { return GROUNDS[id] ? L(GROUNDS[id].name) : id; }

  /* ---------- table ---------- */
  function lastRound(season) {
    var n = 0; season.rounds.forEach(function (r) { if (r.matches.some(function (m) { return m.score; })) n = r.round; }); return n;
  }
  function computeTable(season, upto) {
    var rows = {};
    Object.keys(CLUBS).forEach(function (id) { rows[id] = { id: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, res: [], left: 0 }; });
    var h2h = {};
    season.rounds.forEach(function (r) {
      r.matches.forEach(function (m) {
        var H = rows[m.home], A = rows[m.away]; if (!H || !A) return;
        if (!m.score || r.round > upto) { if (!m.score) { H.left++; A.left++; } return; }
        var hg = m.score[0], ag = m.score[1];
        [[H, hg, ag, A, true], [A, ag, hg, H, false]].forEach(function (x) {
          var T = x[0], f = x[1], g = x[2], res = f > g ? "W" : f === g ? "D" : "L";
          T.p++; T.gf += f; T.ga += g; T.pts += res === "W" ? 3 : res === "D" ? 1 : 0; T[res === "W" ? "w" : res === "D" ? "d" : "l"]++;
          T.res.push({ r: r.round, date: r.date, opp: x[3].id, home: x[4], s: res, score: [f, g] });
          var k = T.id + ">" + x[3].id; h2h[k] = (h2h[k] || 0) + (res === "W" ? 3 : res === "D" ? 1 : 0);
        });
      });
    });
    var list = Object.keys(rows).map(function (k) { var x = rows[k]; x.gd = x.gf - x.ga; return x; });
    list.sort(function (a, b) {
      return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || (h2h[b.id + ">" + a.id] || 0) - (h2h[a.id + ">" + b.id] || 0) || L(CLUBS[a.id].name).localeCompare(L(CLUBS[b.id].name));
    });
    return list;
  }
  function formHtml(res, n) {
    return '<span class="form">' + res.slice(-(n || 5)).map(function (x) {
      var tip = (x.home ? "" : "@ ") + L(CLUBS[x.opp].short) + " " + score(x.score) + " · " + t("round", { n: x.r });
      return '<i class="' + x.s + '" title="' + esc(tip) + '">' + esc(t("f" + x.s)) + "</i>";
    }).join("") + "</span>";
  }
  function tableHtml(rows, o) {
    o = o || {};
    var cols = o.mini ? ["p", "gd", "pts"] : ["p", "w", "d", "l", "gf", "ga", "gd", "pts"];
    var h = '<div class="tbl"><table class="lt' + (o.mini ? "" : " lt-full") + '"><thead><tr><th>' + esc(t("pos")) + '</th><th class="l">' + esc(t("club")) + "</th>" +
      cols.map(function (c) { return '<th class="' + c + '" title="' + esc(t(c + "_t")) + '"><abbr title="' + esc(t(c + "_t")) + '" style="text-decoration:none">' + esc(t(c)) + "</abbr></th>"; }).join("") +
      (o.form === false ? "" : "<th>" + esc(t("form")) + "</th>") + "</tr></thead><tbody>";
    rows.forEach(function (r, i) {
      var cls = (i === 0 ? "champ" : i === rows.length - 1 ? "rel" : "") + (o.hl === r.id ? " hl" : "");
      h += '<tr class="' + cls + '"><td class="pos">' + (i + 1) + '</td><td class="l cl-td">' + clubLink(r.id) + "</td>" +
        cols.map(function (c) { return '<td class="' + c + '">' + (c === "gd" ? signed(r.gd) : r[c]) + "</td>"; }).join("") +
        (o.form === false ? "" : "<td>" + formHtml(r.res) + "</td>") + "</tr>";
    });
    h += "</tbody></table></div>";
    if (o.legend) h += '<div class="legend"><span class="lg-c">' + esc(t("legChamp")) + '</span><span class="lg-r">' + esc(t("legRel")) + "</span></div>";
    return h;
  }

  /* ---------- matches ---------- */
  function matchHtml(m, date, o) {
    o = o || {};
    var st = status(m, date), derby = (m.home === "neftchi" && m.away === "tulpar") || (m.home === "tulpar" && m.away === "neftchi");
    var sc = st === "played" ? '<div class="sc">' + score(m.score) + "</div>" :
      st === "wait" ? '<div class="sc wait">' + esc(t("awaiting")) + "</div>" : '<div class="sc time">' + esc(m.time || "") + "</div>";
    var meta = [];
    if (o.date) meta.push(esc(fmtDate(date, { short: true, day: true })));
    meta.push(esc(groundName(m.venue)) + (m.neutral ? " (" + esc(t("neutral")) + ")" : ""));
    if (st === "played" && (m.aet || m.pens)) meta.push("<b>" + esc(m.pens ? t("pens", { a: m.pens[0], b: m.pens[1] }) : t("aet")) + "</b>");
    if (m.referee && st !== "played") meta.push(esc(t("referee")) + ": <b>" + esc(L(m.referee)) + "</b>");
    if (m.tv && st !== "played") meta.push(m.tv.map(function (x) { return '<span class="tvb">' + esc(x) + "</span>"; }).join(""));
    return '<li class="m' + (derby ? " derby" : "") + (o.hl && (m.home === o.hl || m.away === o.hl) ? " hl" : "") + '"><div class="h">' + clubLink(m.home) + "</div>" + sc +
      '<div class="a">' + clubLink(m.away) + '</div><div class="meta">' + meta.join(" · ") + "</div></li>";
  }
  function roundHtml(r, o) {
    o = o || {};
    var ms = o.club ? r.matches.filter(function (m) { return m.home === o.club || m.away === o.club; }) : r.matches;
    if (!ms.length) return "";
    return '<div class="day-h"><span>' + esc(t("round", { n: r.round })) + "</span><span>" + esc(fmtDate(r.date, { day: true })) + "</span></div>" +
      '<ul class="mlist">' + ms.map(function (m) { return matchHtml(m, r.date, o); }).join("") + "</ul>";
  }
  function nextRoundOf(season) {
    for (var i = 0; i < season.rounds.length; i++) {
      var r = season.rounds[i];
      if (r.matches.some(function (m) { return !m.score; })) return r;
    }
    return null;
  }
  function findDerby(season, pred) {
    for (var i = 0; i < season.rounds.length; i++) {
      var r = season.rounds[i];
      for (var j = 0; j < r.matches.length; j++) {
        var m = r.matches[j];
        if ([m.home, m.away].sort().join() === "neftchi,tulpar" && pred(m, r)) return { m: m, r: r };
      }
    }
    return null;
  }

  /* a club's or the league's channel on Tulpar: opens the app's subscribe sheet */
  function tulparLink(handle, label) {
    return '<a class="tulpar-ch" href="https://tulparapp.com/app/#sub=' + encodeURIComponent(handle) + '" rel="noopener"><img src="assets/tulpar.svg" alt="" width="18" height="18"><span>' + esc(label) + "</span></a>";
  }
  /* ---------- header and footer ---------- */
  var NAV = [["home", "index.html"], ["table", "table.html"], ["fixtures", "fixtures.html"], ["clubs", "clubs.html"], ["champions", "champions.html"],
    ["derby", "derby.html"], ["cup", "cup.html"], { g: "more", items: [["news", "news.html"], ["stadiums", "stadiums.html"], ["first", "first-league.html"], ["women", "womens-league.html"], ["about", "about.html"]] }];
  function navLabel(k) { var s = I.ui[LANG]["navS_" + k] || I.ui.en["navS_" + k]; return s ? s : t("nav_" + k); }
  function renderChrome() {
    var top = $("#top");
    if (top) {
      var li = NAV.map(function (n) {
        if (n.g) {
          var act = n.items.some(function (x) { return x[0] === NAVKEY; });
          return '<li class="has-sub"><button type="button" class="more-btn" aria-expanded="false"' + (act ? ' style="color:#fff"' : "") + ">" + esc(t("nav_" + n.g)) + '</button><ul class="sub">' +
            n.items.map(function (x) { return '<li><a href="' + x[1] + '"' + (x[0] === NAVKEY ? ' aria-current="page"' : "") + ">" + esc(t("nav_" + x[0])) + "</a></li>"; }).join("") + "</ul></li>";
        }
        return '<li><a href="' + n[1] + '"' + (n[0] === NAVKEY ? ' aria-current="page"' : "") + ' title="' + esc(t("nav_" + n[0])) + '">' + esc(navLabel(n[0])) + "</a></li>";
      }).join("");
      top.innerHTML = '<a class="skip" href="#main">' + esc(t("skip")) + "</a>" +
        '<header class="hdr"><div class="wrap hdr-in"><a class="brand" href="index.html"><img src="assets/ffi-mark.svg" alt="" width="40" height="43">' +
        '<span class="brand-t"><span class="brand-n">' + esc(t("league")) + '</span><span class="brand-s">' + esc(t("leagueSub")) + " · FFI</span></span></a>" +
        '<div class="hdr-r"><div class="langs" role="group" aria-label="' + esc(t("langLabel")) + '">' +
        LANGS.map(function (l) { return '<button type="button" data-lang="' + l + '" lang="' + I.htmlLang[l] + '" title="' + esc(I.langNames[l]) + '" aria-pressed="' + (l === LANG) + '">' + I.langs[l] + "</button>"; }).join("") +
        '</div><button type="button" class="menu-btn" aria-expanded="false" aria-controls="nav">' + esc(t("menu")) + "</button></div></div></header>" +
        '<nav class="nav" id="nav" aria-label="' + esc(t("navLabel")) + '"><div class="wrap"><ul>' + li + "</ul></div></nav>";
      $$("[data-lang]", top).forEach(function (b) { b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); }); });
      var mb = $(".menu-btn", top), nav = $(".nav", top);
      mb.addEventListener("click", function () { var o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); });
      $$(".has-sub", top).forEach(function (h) {
        var b = $(".more-btn", h);
        b.addEventListener("click", function (e) { e.stopPropagation(); var o = h.classList.toggle("open"); b.setAttribute("aria-expanded", o); });
      });
      document.addEventListener("click", function () { $$(".has-sub.open").forEach(function (h) { h.classList.remove("open"); }); });
    }
    var foot = $("#foot");
    if (foot) {
      foot.innerHTML = '<footer class="foot"><div class="wrap"><div class="foot-g"><div><div class="brand-f"><img src="assets/ffi-mark.svg" alt="" width="30" height="32">' + esc(t("league")) + "</div><p>" + esc(t("footAbout")) + "</p><p>" + esc(t("footTv")) + "</p>" + tulparLink("iradleague", t("footTulpar")) + "</div>" +
        "<div><h4>" + esc(t("footComp")) + '</h4><ul><li><a href="table.html">' + esc(t("nav_table")) + '</a></li><li><a href="fixtures.html">' + esc(t("nav_fixtures")) + '</a></li><li><a href="cup.html">' + esc(t("nav_cup")) + '</a></li><li><a href="first-league.html">' + esc(t("nav_first")) + '</a></li><li><a href="womens-league.html">' + esc(t("nav_women")) + "</a></li></ul></div>" +
        "<div><h4>" + esc(t("footFed")) + '</h4><ul><li><a href="about.html">' + esc(t("nav_about")) + '</a></li><li><a href="news.html">' + esc(t("nav_news")) + '</a></li><li><a href="clubs.html">' + esc(t("nav_clubs")) + '</a></li><li><a href="stadiums.html">' + esc(t("nav_stadiums")) + '</a></li><li><a href="champions.html">' + esc(t("nav_champions")) + "</a></li></ul></div></div>" +
        '<div class="foot-b"><span>' + esc(t("footCopy", { y: NOW.getUTCFullYear() })) + "</span><span>" + esc(t("footTime")) + "</span></div></div></footer>";
    }
  }

  /* ---------- static page text ---------- */
  function applyText() {
    var P = I.pages[LANG] || {};
    $$("[data-i18n]").forEach(function (el) {
      if (el._en == null) el._en = el.innerHTML;
      var k = el.getAttribute("data-i18n");
      el.innerHTML = LANG !== "en" && P[k] != null ? P[k] : el._en;
    });
    $$(".ml").forEach(function (g) {
      var kids = $$(":scope > [data-l]", g), has = kids.some(function (k) { return k.getAttribute("data-l") === LANG; }), show = has ? LANG : "en";
      kids.forEach(function (k) { k.hidden = k.getAttribute("data-l") !== show; });
      var note = $(":scope > .ir-note", g);
      if (!has && LANG === "ir") { if (!note) { note = document.createElement("p"); note.className = "ir-note"; g.insertBefore(note, g.firstChild); } note.textContent = t("irNote"); note.hidden = false; }
      else if (note) note.hidden = true;
    });
    var h1 = $("h1");
    document.title = PAGE === "home" ? t("league") + " | " + t("fed") : (h1 ? h1.textContent.trim() + " | " + t("league") : t("league"));
  }
  function mlBlock(obj) {
    var en = (obj.en || []).map(function (p) { return "<p>" + p + "</p>"; }).join(""), ru = (obj.ru || []).map(function (p) { return "<p>" + p + "</p>"; }).join("");
    var ir = (obj.ir || []).map(function (p) { return "<p>" + p + "</p>"; }).join("");
    if (LANG === "ru" && ru) return ru;
    if (LANG === "ir" && ir) return ir;
    return (LANG === "ir" ? '<p class="ir-note">' + esc(t("irNote")) + "</p>" : "") + en;
  }
  function fail(el) { if (el) el.innerHTML = '<p class="err">' + esc(t("loadFail")) + "</p>"; }

  /* ---------- pages ---------- */
  var R = {};

  R.home = function (D) {
    var s = D.season, last = lastRound(s), rows = computeTable(s, 99), nr = nextRoundOf(s);
    var a = rows[0], b = rows[1], gap = a.pts - b.pts;
    var contenders = rows.filter(function (r) { return r.pts + 3 * r.left >= a.pts; });
    var decided = contenders.length === 1 && (rows[1].pts + 3 * rows[1].left < a.pts);
    var hero = $("#hero");
    if (hero) {
      var title = decided ? t("champsDecided", { c: L(CLUBS[a.id].name), y: s.season }) : gap === 0 ? t("level") :
        t("leadBy", { c: L(CLUBS[a.id].name), n: gap, u: ptsWord(gap) });
      var side = function (r, right) {
        return '<div class="side' + (right ? " r" : "") + '"><a class="t' + (right ? " r" : "") + '" href="club-' + r.id + '.html"><img src="assets/crests/' + r.id + '.svg" alt="" width="56" height="56"><div><b>' + esc(L(CLUBS[r.id].name)) +
          "</b><span>" + esc(t("p")) + " " + r.p + " · " + esc(t("gd")) + " " + signed(r.gd) + "</span></div></a>" + '<div class="pts">' + r.pts + "</div></div>";
      };
      var left = a.left, derby = findDerby(s, function (m, r) { return !m.score; });
      var foot = [];
      if (!decided && left) foot.push("<b>" + esc(left === 1 ? t("roundLeft") : t("roundsLeft", { n: left })) + "</b>");
      if (!decided) foot.push(esc(t("maxPts")) + ": " + contenders.slice(0, 3).map(function (r) { return esc(L(CLUBS[r.id].short)) + " <b>" + (r.pts + 3 * r.left) + "</b>"; }).join(", "));
      if (!decided && contenders.length > 1) foot.push(esc(t("contention")) + ": " + contenders.map(function (r) { return esc(L(CLUBS[r.id].name)); }).join(", "));
      if (derby) foot.push(esc(t("endsWith", { d: fmtDate(derby.r.date, { day: true }), v: groundName(derby.m.venue) })));
      hero.innerHTML = '<div class="k">' + esc(t("titleRace")) + " · " + esc(t("season", { y: s.season })) + " · " + esc(t("tableAfter", { n: last })) + "</div><h2>" + esc(title) + "</h2>" +
        '<div class="race">' + side(a) + '<div class="mid"><strong>' + (gap > 0 ? "+" + gap : "=") + "</strong>" + esc(ptsWord(Math.abs(gap) || 2)) + "</div>" + side(b, true) + "</div>" +
        '<div class="race-foot">' + foot.map(function (x) { return "<span>" + x + "</span>"; }).join("") + "</div>";
    }
    var dc = $("#derby");
    if (dc) {
      var dd = findDerby(s, function (m, r) { return !m.score; }) || findDerby(s, function (m, r) { return r.round === 27; });
      if (dd) {
        var played = !!dd.m.score, cd = untilText(dd.r.date);
        dc.innerHTML = '<div class="k">' + esc(t("derbyK")) + " · " + esc(t("round", { n: dd.r.round })) + "</div><h3>" + esc(t("derbyCard")) + "</h3>" +
          '<div class="vs"><img src="assets/crests/' + dd.m.home + '.svg" alt="' + esc(L(CLUBS[dd.m.home].name)) + '" width="64" height="64"><span>' + (played ? score(dd.m.score) : esc(dd.m.time)) +
          '</span><img src="assets/crests/' + dd.m.away + '.svg" alt="' + esc(L(CLUBS[dd.m.away].name)) + '" width="64" height="64"></div>' +
          "<p><b>" + esc(L(CLUBS[dd.m.home].name)) + " – " + esc(L(CLUBS[dd.m.away].name)) + "</b></p><p>" + esc(fmtDate(dd.r.date, { day: true })) + " · " + esc(dd.m.time) + " · " + esc(groundName(dd.m.venue)) + "</p>" +
          (!played && cd ? '<div class="cd">' + esc(cd) + "</div>" : "") +
          (!played ? "<p>" + esc(t("tickets")) + "</p><p>" + esc(t("liveOn")) + "</p>" : "") + '<p style="margin-top:8px"><a href="derby.html">' + esc(t("nav_derby")) + " →</a></p>";
      }
    }
    var nx = $("#next");
    if (nx) {
      if (nr) nx.innerHTML = '<div class="card-h"><h2>' + esc(t("nextRound")) + '</h2><a href="fixtures.html#r' + nr.round + '">' + esc(t("allFixS")) + "</a></div>" + roundHtml(nr);
      else nx.hidden = true;
    }
    var lr = $("#latest");
    if (lr) {
      var rr = s.rounds.filter(function (r) { return r.round === last; })[0];
      lr.innerHTML = rr ? '<div class="card-h"><h2>' + esc(t("latestResults")) + '</h2><a href="fixtures.html#r' + rr.round + '">' + esc(t("allFixS")) + "</a></div>" + roundHtml(rr) : "";
    }
    var mt = $("#minitable");
    if (mt) mt.innerHTML = '<div class="card-h"><h2>' + esc(t("leagueTable")) + '</h2><a href="table.html">' + esc(t("fullTable")) + "</a></div>" + tableHtml(rows, { mini: true, legend: false });
    var nw = $("#news");
    if (nw) nw.innerHTML = '<div class="card-h"><h2>' + esc(t("news")) + '</h2><a href="news.html">' + esc(t("allNews")) + "</a></div>" + newsList(D.news, 4);
    var cf = $("#cupfinal");
    if (cf && D.cup) {
      var fin = D.cup.rounds.filter(function (r) { return r.key === "final"; })[0], fm = fin && fin.matches[0];
      if (fm) cf.innerHTML = '<div class="card-h"><h3>' + esc(t("cupFinalK")) + '</h3><a href="cup.html">' + esc(t("nav_cup")) + "</a></div>" +
        '<ul class="mlist">' + matchHtml(fm, fin.date, { date: true }) + "</ul>";
    }
  };

  function newsList(news, n) {
    var items = news.items.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).slice(0, n || 99);
    return '<ul class="news-l">' + items.map(function (x) {
      return '<li><div class="dt"><span>' + esc(fmtDate(x.date, { year: false })) + '</span><span class="chip' + (x.tag === "league" ? " navy" : x.tag === "cup" ? " red" : x.tag === "women" ? " green" : "") + '">' + esc(t("tag_" + x.tag)) + "</span></div>" +
        '<a class="t" href="news.html#' + x.id + '">' + esc(L(x.title)) + "</a><p>" + esc(L(x.summary)) + "</p></li>";
    }).join("") + "</ul>";
  }

  R.table = function (D) {
    var s = D.season, last = lastRound(s), box = $("#table");
    var sel = $("#upto"), upto = last;
    if (sel) {
      var m = /#after-(\d+)/.exec(location.hash); if (m && +m[1] >= 1 && +m[1] <= last) upto = +m[1];
      sel.innerHTML = s.rounds.filter(function (r) { return r.round <= last; }).map(function (r) {
        return '<option value="' + r.round + '"' + (r.round === upto ? " selected" : "") + ">" + esc(t("round", { n: r.round })) + " · " + esc(fmtDate(r.date, { short: true })) + (r.round === last ? " (" + esc(t("latestRound")) + ")" : "") + "</option>";
      }).join("");
      sel.onchange = function () { history.replaceState(null, "", +sel.value === last ? location.pathname + location.search : "#after-" + sel.value); draw(+sel.value); };
    }
    function draw(n) {
      box.innerHTML = '<div class="card-h"><h2>' + esc(t("tableAfter", { n: n })) + '</h2><span class="sub">' + esc(fmtDate(s.rounds[n - 1].date, { day: true, year: true })) + "</span></div>" +
        tableHtml(computeTable(s, n), { legend: true }) ;
    }
    draw(upto);
    var tb = $("#tiebreak"); if (tb) tb.textContent = t("tiebreak");
  };

  R.fixtures = function (D) {
    var s = D.season, chips = $("#rounds"), list = $("#fixtures"), csel = $("#clubsel");
    var nr = nextRoundOf(s), cur = nr ? nr.round : 27, club = "";
    var m = /#r(\d+)/.exec(location.hash); if (m && +m[1] >= 1 && +m[1] <= s.rounds.length) cur = +m[1];
    var mc = /#club-([a-z]+)/.exec(location.hash); if (mc && CLUBS[mc[1]]) club = mc[1];
    csel.innerHTML = '<option value="">' + esc(t("allClubs")) + "</option>" + Object.keys(CLUBS).map(function (id) { return '<option value="' + id + '"' + (id === club ? " selected" : "") + ">" + esc(L(CLUBS[id].name)) + "</option>"; }).join("");
    function draw() {
      chips.hidden = !!club;
      chips.innerHTML = s.rounds.map(function (r) {
        var played = r.matches.every(function (x) { return x.score; });
        return '<button type="button" data-r="' + r.round + '" class="' + (played ? "played" : "") + '" aria-pressed="' + (r.round === cur) + '" title="' + esc(fmtDate(r.date, { short: true })) + '">' + r.round + "</button>";
      }).join("");
      $$("button", chips).forEach(function (b) { b.onclick = function () { cur = +b.getAttribute("data-r"); history.replaceState(null, "", "#r" + cur); draw(); }; });
      var on = $('button[aria-pressed="true"]', chips); if (on && on.scrollIntoView && !club) { chips.scrollLeft = on.offsetLeft - chips.clientWidth / 2; }
      var notes = s.notes || {}, h = "";
      if (club) {
        s.rounds.forEach(function (r, i) {
          var prev = i ? s.rounds[i - 1].date : "0000";
          Object.keys(notes).forEach(function (d) { if (d > prev && d < r.date) h += '<div class="day-h"><span>' + esc(fmtDate(d, { day: true })) + "</span><span>" + esc(L(notes[d])) + "</span></div>"; });
          h += roundHtml(r, { club: club, hl: club });
        });
      } else {
        var r = s.rounds[cur - 1], prev = cur > 1 ? s.rounds[cur - 2].date : "0000";
        h = roundHtml(r);
        Object.keys(notes).forEach(function (d) { if (d > prev && d < r.date) h = '<div class="day-h"><span>' + esc(fmtDate(d, { day: true })) + "</span><span>" + esc(L(notes[d])) + "</span></div>" + h; });
      }
      list.innerHTML = h || '<p class="loading">' + esc(t("noMatches")) + "</p>";
    }
    csel.onchange = function () { club = csel.value; history.replaceState(null, "", club ? "#club-" + club : "#r" + cur); draw(); };
    draw();
  };

  R.clubs = function (D) {
    var g = $("#clubgrid"), rows = computeTable(D.season, 99), pos = {};
    rows.forEach(function (r, i) { pos[r.id] = i + 1; });
    g.innerHTML = D.clubs.clubs.map(function (c) {
      return '<a class="card club-card" href="club-' + c.id + '.html" style="--c1:' + c.colour[0] + '"><img src="assets/crests/' + c.id + '.svg" alt="" width="96" height="96" loading="lazy"><b>' + esc(L(c.name)) +
        "</b><span>" + esc(L(c.city)) + " · " + esc(t("founded")) + " " + c.founded + '</span><span class="tt">' + esc(c.titles === 0 ? t("titleNone") : c.titles === 1 ? t("titleOne") : t("titlesCount", { n: c.titles })) + " · " + esc(t("position")) + " " + pos[c.id] + "</span></a>";
    }).join("");
  };

  R.club = function (D) {
    var id = BODY.getAttribute("data-club"), c = CLUBS[id], box = $("#club");
    if (!c) return fail(box);
    var s = D.season, rows = computeTable(s, 99), me = null, pos = 0;
    rows.forEach(function (r, i) { if (r.id === id) { me = r; pos = i + 1; } });
    var champs = D.champions.seasons.filter(function (x) { return x.champion === id; }).map(function (x) { return x.year; });
    var runners = D.champions.seasons.filter(function (x) { return x.runner_up === id; }).map(function (x) { return x.year; });
    var g = GROUNDS[c.ground];
    var alt = LANGS.filter(function (l) { return l !== LANG; }).map(function (l) { return c.name[l]; }).filter(function (n, i, a) { return n !== L(c.name) && a.indexOf(n) === i; }).join(" · ");
    var facts = [
      [t("founded"), c.founded], [t("city"), L(c.city)],
      [t("ground"), '<a href="stadiums.html#' + c.ground + '">' + esc(L(g.name)) + "</a>" + (g.capacity ? ' <span class="muted">(' + esc(t("seats", { n: g.capacity.toLocaleString(LANG === "ru" ? "ru-RU" : "en-GB") })) + ")</span>" : "")],
      [t("owner"), esc(L(c.owner))],
      [t("colours"), c.colour.map(function (h) { return '<span class="swatch" style="background:' + h + '"></span>'; }).join("") + " " + esc(L(c.colours))],
      [t("titles"), c.titles]
    ];
    if (c.former) facts.push([t("former"), esc(L(c.former))]);
    if (c.tulpar) facts.push([t("tulparCh"), tulparLink(c.tulpar, "@" + c.tulpar)]);
    var next = null;
    s.rounds.some(function (r) { return r.matches.some(function (m) { if (!m.score && (m.home === id || m.away === id)) { next = { m: m, r: r }; return true; } }); });
    var html = '<div class="card club-head" style="--c1:' + c.colour[0] + '"><img src="assets/crests/' + id + '.svg" alt="' + esc(L(c.name)) + '" width="170" height="170"><div><div class="page-h" style="margin:0"><div class="k">' + esc(t("league")) + " · " + esc(t("season", { y: s.season })) + "</div><h1>" + esc(L(c.name)) + '</h1><p class="muted" style="margin:0">' + esc(alt) + "</p></div>" +
      '<p style="margin:10px 0 0">' + esc(L(c.about)) + '</p><dl class="facts">' + facts.map(function (f) { return "<div><dt>" + esc(f[0]) + "</dt><dd>" + f[1] + "</dd></div>"; }).join("") + "</dl></div></div>";
    html += '<div class="grid g-home sect"><div>';
    html += '<div class="card"><h2>' + esc(t("season26")) + '</h2><div class="stat-row"><div class="stat"><b>' + pos + "</b><span>" + esc(t("position")) + '</span></div><div class="stat"><b>' + me.pts + "</b><span>" + esc(t("pts_t")) + '</span></div><div class="stat"><b>' + me.w + "–" + me.d + "–" + me.l + "</b><span>" + esc(t("w")) + "–" + esc(t("d")) + "–" + esc(t("l")) + '</span></div><div class="stat"><b>' + signed(me.gd) + "</b><span>" + esc(t("gd_t")) + "</span></div></div>" +
      '<p class="note">' + esc(t("form")) + ": " + formHtml(me.res, 5) + "</p></div>";
    if (next) html += '<div class="card flush sect"><div class="card-h"><h2>' + esc(t("nextMatch")) + '</h2><span class="sub">' + esc(t("round", { n: next.r.round })) + '</span></div><ul class="mlist">' + matchHtml(next.m, next.r.date, { date: true }) + "</ul></div>";
    html += '<div class="card flush sect"><div class="card-h"><h2>' + esc(t("results")) + '</h2><a href="fixtures.html#club-' + id + '">' + esc(t("allFixtures")) + '</a></div><ul class="mlist">' +
      s.rounds.slice().reverse().map(function (r) { return r.matches.filter(function (m) { return m.score && (m.home === id || m.away === id); }).map(function (m) { return matchHtml(m, r.date, { date: true, hl: null }); }).join(""); }).join("") + "</ul></div>";
    html += '</div><div><div class="card"><h2>' + esc(t("history")) + '</h2><div class="prose">' + mlBlock(c.history) + "</div></div>";
    html += '<div class="card sect"><h2>' + esc(t("honours")) + "</h2><h3 class=\"small muted\" style=\"font-family:var(--body)\">" + esc(t("champYears")) + "</h3>" +
      (champs.length ? '<div class="years">' + champs.map(function (y) { return "<span>" + y + "</span>"; }).join("") + "</div>" : '<p class="muted">' + esc(t("noTitles")) + "</p>") +
      (runners.length ? '<h3 class="small muted" style="font-family:var(--body);margin-top:14px">' + esc(t("runnerUp")) + '</h3><div class="years">' + runners.map(function (y) { return '<span style="background:#eef1f5;color:#2c3a4f">' + y + "</span>"; }).join("") + "</div>" : "") + "</div>";
    html += '<div class="card flush sect"><div class="card-h"><h2>' + esc(t("leagueTable")) + '</h2><a href="table.html">' + esc(t("fullTable")) + "</a></div>" + tableHtml(rows, { mini: true, hl: id }) + "</div>";
    html += '<p class="sect"><a href="clubs.html">← ' + esc(t("backClubs")) + "</a></p></div></div>";
    box.innerHTML = html;
  };

  R.stadiums = function (D) {
    var g = $("#stadiums"), byGround = {};
    D.clubs.clubs.forEach(function (c) { (byGround[c.ground] = byGround[c.ground] || []).push(c.id); });
    var order = Object.keys(GROUNDS).sort(function (a, b) { return GROUNDS[b].capacity - GROUNDS[a].capacity; });
    g.innerHTML = order.map(function (k) {
      var x = GROUNDS[k], others = LANGS.filter(function (l) { return l !== LANG; }).map(function (l) { return x.name[l]; }).filter(function (n) { return n !== L(x.name); });
      return '<div class="card std" id="' + k + '"><h3>' + esc(L(x.name)) + '</h3><div class="alt">' + esc(others.join(" · ")) + '</div><div class="cap">' + x.capacity.toLocaleString(LANG === "ru" ? "ru-RU" : "en-GB") + '</div><div class="small muted">' + esc(t("capacity")) +
        '</div><div class="row"><span>' + esc(L(x.city)) + "</span><span>" + esc(t("opened")) + " " + x.opened + "</span>" + (x.rebuilt ? "<span>" + esc(t("rebuilt")) + " " + x.rebuilt + "</span>" : "") +
        (x.map ? '<span><a href="https://maps.attelkom.net/#map=16/' + x.map[0] + "/" + x.map[1] + '" rel="noopener">' + esc(t("onMap")) + " ↗</a></span>" : "") + "</div><p>" + esc(L(x.note)) + '</p><div class="clubs">' + (byGround[k] || []).map(function (id) { return clubLink(id); }).join("") + "</div></div>";
    }).join("");
    if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  };

  R.champions = function (D) {
    var ch = D.champions, cnt = {};
    ch.seasons.forEach(function (x) { if (x.champion) cnt[x.champion] = (cnt[x.champion] || 0) + 1; });
    var ids = Object.keys(CLUBS).sort(function (a, b) { return (cnt[b] || 0) - (cnt[a] || 0) || L(CLUBS[a].name).localeCompare(L(CLUBS[b].name)); });
    var max = Math.max.apply(null, ids.map(function (k) { return cnt[k] || 0; }));
    $("#counts").innerHTML = '<div class="card-h"><h2>' + esc(t("titles")) + '</h2><span class="sub">1994–' + ch.seasons[ch.seasons.length - 1].year + '</span></div><ul class="bars">' + ids.map(function (k) {
      var n = cnt[k] || 0;
      return "<li>" + clubLink(k) + '<div><div class="bar" style="width:' + (n ? Math.max(2, n / max * 100) : 0) + "%;--c1:" + CLUBS[k].colour[0] + '"></div></div><div class="n">' + n + "</div></li>";
    }).join("") + "</ul>";
    var rows = ch.seasons.slice().reverse().map(function (x) {
      if (!x.champion) return '<tr class="cx"><td>' + x.year + '</td><td class="l" colspan="2">' + esc(t("cancelled")) + " · " + esc(L(x.note)) + "</td></tr>";
      return "<tr><td><b>" + x.year + '</b></td><td class="l cl-td">' + clubLink(x.champion) + '</td><td class="l cl-td">' + (x.runner_up ? clubLink(x.runner_up) : "") + "</td></tr>";
    }).join("");
    $("#years").innerHTML = '<div class="card-h"><h2>' + esc(t("champYears")) + '</h2></div><div class="tbl"><table class="lt short"><thead><tr><th>' + esc(t("year")) + '</th><th class="l">' + esc(t("champion")) + '</th><th class="l">' + esc(t("runnerUp")) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
    $("#format").innerHTML = "<ul>" + ch.format.map(function (f) { return "<li><b>" + f.from + "–" + (f.to || "") + "</b>: " + esc(L(f.text)) + "</li>"; }).join("") + "</ul>";
  };

  R.derby = function (D) {
    var base = D.champions.derby_to_2025, s = D.season, add = { played: 0, neftchi: 0, tulpar: 0, draws: 0 }, meet = [];
    s.rounds.forEach(function (r) { r.matches.forEach(function (m) {
      if ([m.home, m.away].sort().join() !== "neftchi,tulpar") return;
      meet.push({ m: m, r: r });
      if (!m.score) return;
      add.played++; var hn = m.home === "neftchi", n = hn ? m.score[0] : m.score[1], tt = hn ? m.score[1] : m.score[0];
      if (n > tt) add.neftchi++; else if (tt > n) add.tulpar++; else add.draws++;
    }); });
    var tot = { played: base.played + add.played, neftchi: base.neftchi + add.neftchi, tulpar: base.tulpar + add.tulpar, draws: base.draws + add.draws };
    $("#record").innerHTML = '<div class="card-h"><h2>' + esc(t("record")) + '</h2><span class="sub">' + esc(t("played")) + ": <b>" + tot.played + "</b> (" + esc(add.played ? t("incl2026") : t("to2025")) + ")</span></div>" +
      '<div class="rec"><div class="n"><b>' + tot.neftchi + "</b><span>" + esc(t("winsOf", { c: L(CLUBS.neftchi.short) })) + "</span></div><div><b>" + tot.draws + "</b><span>" + esc(t("draws")) + '</span></div><div class="t"><b>' + tot.tulpar + "</b><span>" + esc(t("winsOf", { c: L(CLUBS.tulpar.short) })) + "</span></div></div>" +
      '<div class="recbar"><i style="width:' + (tot.neftchi / tot.played * 100) + '%;background:#141414"></i><i style="width:' + (tot.draws / tot.played * 100) + '%;background:#b9c2ce"></i><i style="width:' + (tot.tulpar / tot.played * 100) + '%;background:#b3132d"></i></div>' +
      '<p class="note" style="padding:0 18px 14px;margin:0">' + esc(t("to2025")) + ": " + base.played + " · " + base.neftchi + "–" + base.draws + "–" + base.tulpar + "</p>";
    $("#meet").innerHTML = '<div class="card-h"><h2>' + esc(t("meetings2026")) + '</h2></div><ul class="mlist">' + meet.map(function (x) { return matchHtml(x.m, x.r.date, { date: true }); }).join("") + "</ul>";
  };

  function cupWinner(m) {
    var a = m.score[0], b = m.score[1];
    if (a === b && m.pens) { a = m.pens[0]; b = m.pens[1]; }
    return a > b ? m.home : m.away;
  }
  R.cup = function (D) {
    var c = D.cup, h = "";
    c.rounds.slice().reverse().forEach(function (r) {
      h += '<div class="card flush sect"><div class="card-h"><h2>' + esc(t(r.key === "final" ? "final" : "semi")) + '</h2><span class="sub">' + esc(fmtDate(r.date, { day: true, year: true })) + '</span></div><ul class="mlist">' +
        r.matches.map(function (m) { return matchHtml(m, r.date); }).join("") + "</ul>" +
        (r.key === "final" && r.matches[0] && r.matches[0].score ? '<p class="note" style="padding:0 18px 14px;margin:0"><b>' + esc(t("cupWon", { c: L(CLUBS[cupWinner(r.matches[0])].name) })) + "</b></p>" : "") + "</div>";
    });
    $("#cup").innerHTML = h;
  };

  function simpleTable(data, clubsList, o) {
    var names = {}; clubsList.forEach(function (c) { names[c.id] = c; });
    var h = '<div class="tbl"><table class="lt"><thead><tr><th>' + esc(t("pos")) + '</th><th class="l">' + esc(t("club")) + "</th>" + ["p", "w", "d", "l", "gf", "ga", "gd", "pts"].map(function (c) { return '<th class="' + c + '" title="' + esc(t(c + "_t")) + '">' + esc(t(c)) + "</th>"; }).join("") + "</tr></thead><tbody>";
    data.table.forEach(function (r, i) {
      var nm = names[r.club], crest = o.crests && CLUBS[r.club] ? '<img src="assets/crests/' + r.club + '-small.svg" alt="" width="22" height="22">' : '<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#dfe5ee;flex:none"></span>';
      h += '<tr class="' + (i === 0 && o.top ? "champ" : "") + '"><td class="pos">' + (i + 1) + '</td><td class="l cl-td"><span class="cl">' + crest + '<span class="nm">' + esc(L(nm.name)) + "</span></span></td>" +
        ["p", "w", "d", "l", "gf", "ga"].map(function (c) { return "<td>" + r[c] + "</td>"; }).join("") + "<td>" + signed(r.gf - r.ga) + '</td><td class="pts">' + r.pts + "</td></tr>";
    });
    return h + "</tbody></table></div>";
  }

  R.first = function (D) {
    var f = D.first;
    var hasFx = f.next && f.next.matches && f.next.matches.length;
    $("#fltable").innerHTML = '<div class="card-h"><h2>' + esc(t("nav_first")) + " " + f.season + '</h2><span class="sub">' + esc(t("afterRound", { n: f.after_round, m: f.rounds, d: fmtDate(f.after_date, { short: true }) })) + "</span></div>" + simpleTable(f, f.clubs, { top: true }) +
      (f.next && !hasFx ? '<p class="note" style="padding:0 18px 14px">' + esc(t("nextRoundOn", { n: f.next.round, d: fmtDate(f.next.date, { day: true }) })) + "</p>" : "");
    var nm = {}; f.clubs.forEach(function (c) { nm[c.id] = c; });
    var line = function (m, time) { return '<li class="m"><div class="h"><span class="cl">' + esc(L(nm[m.home].name)) + "</span></div>" + (m.score ? '<div class="sc">' + score(m.score) + "</div>" : '<div class="sc time">' + esc(time || "") + "</div>") + '<div class="a"><span class="cl">' + esc(L(nm[m.away].name)) + "</span></div></li>"; };
    var block = function (r) {
      var done = r.matches.every(function (m) { return m.score; });
      return '<div class="card-h"><h2>' + esc(done ? t("roundResults", { n: r.round }) : t("round", { n: r.round })) + '</h2><span class="sub">' + esc(fmtDate(r.date, { day: true })) + '</span></div><ul class="mlist">' + r.matches.map(function (m) { return line(m, r.time); }).join("") + "</ul>";
    };
    var rounds = [];
    if (f.last_round && f.last_round.matches) rounds.push(f.last_round);
    if (hasFx) rounds.push(f.next);
    (f.upcoming || []).forEach(function (r) { if (r.matches && r.matches.length) rounds.push(r); });
    var fx = $("#flfixtures");
    if (fx) { fx.innerHTML = rounds.map(block).join(""); fx.hidden = !rounds.length; }
    $("#flclubs").innerHTML = f.clubs.map(function (c) { return "<li><b>" + esc(L(c.name)) + "</b> · " + esc(L(c.city)) + (c.note ? '<br><span class="small muted">' + esc(L(c.note)) + "</span>" : "") + "</li>"; }).join("");
  };

  R.women = function (D) {
    var w = D.women, nm = {}; w.clubs.forEach(function (c) { nm[c.id] = c; });
    $("#wltable").innerHTML = '<div class="card-h"><h2>' + esc(t("nav_women")) + " " + w.season + '</h2><span class="sub">' + esc(t("afterRound", { n: w.after_round, m: w.rounds, d: fmtDate(w.after_date, { short: true }) })) + "</span></div>" + simpleTable(w, w.clubs, { crests: true, top: true });
    var lt = w.latest, nx = w.next;
    var line = function (h, a, mid) { return '<li class="m"><div class="h"><span class="cl">' + esc(L(nm[h].name)) + "</span></div>" + mid + '<div class="a"><span class="cl">' + esc(L(nm[a].name)) + "</span></div></li>"; };
    $("#wllatest").innerHTML = '<div class="card-h"><h2>' + esc(t("latestResult")) + '</h2><span class="sub">' + esc(fmtDate(lt.date, { day: true })) + '</span></div><ul class="mlist">' + line(lt.home, lt.away, '<div class="sc">' + score(lt.score) + "</div>") + "</ul>";
    var done = nx.matches.every(function (m) { return m.score; });
    $("#wlnext").innerHTML = '<div class="card-h"><h2>' + esc(done ? t("roundResults", { n: nx.round }) : t("round", { n: nx.round })) + '</h2><span class="sub">' + esc(fmtDate(nx.date, { day: true })) + '</span></div><ul class="mlist">' + nx.matches.map(function (m) { return line(m.home, m.away, m.score ? '<div class="sc">' + score(m.score) + "</div>" : '<div class="sc time">' + esc(nx.time) + "</div>"); }).join("") + "</ul>";
  };

  R.news = function (D) {
    var items = D.news.items.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    $("#articles").innerHTML = items.map(function (x) {
      return '<article class="card article sect" id="' + x.id + '"><div class="dt"><span>' + esc(fmtDate(x.date, { day: true, year: true })) + '</span><span class="chip">' + esc(t("tag_" + x.tag)) + "</span></div><h2>" + esc(L(x.title)) + '</h2><p class="lead">' + esc(L(x.summary)) + '</p><div class="prose">' + mlBlock(x.body) + "</div></article>";
    }).join("");
    if (location.hash) { var el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) setTimeout(function () { el.scrollIntoView(); }, 30); }
  };

  /* ---------- run ---------- */
  var NEEDS = {
    home: ["season", "news", "cup"], table: ["season"], fixtures: ["season"], clubs: ["season"], club: ["season", "champions"], stadiums: [],
    champions: ["champions"], derby: ["season", "champions"], cup: ["cup"], first: ["first"], women: ["women"], news: ["news"]
  };
  var FILES = { season: SEASON_FILE, news: "data/news.json", cup: "data/cup-2026.json", champions: "data/champions.json", first: "data/first-league-2026.json", women: "data/womens-league-2026.json" };
  var DATA = null;

  function render() {
    document.documentElement.lang = I.htmlLang[LANG];
    renderChrome();
    applyText();
    if (DATA && R[PAGE]) { try { R[PAGE](DATA); } catch (e) { console.error(e); fail($(".data-root")); } }
  }
  function setLang(l) {
    LANG = l;
    try { localStorage.setItem("iradleague_lang", l); } catch (e) {}
    var u = new URL(location.href);
    if (u.searchParams.has("lang")) { u.searchParams.delete("lang"); history.replaceState(null, "", u.pathname + (u.search || "") + u.hash); }
    render();
  }

  function start() {
    render();
    if (!R[PAGE]) return;
    var need = ["clubs"].concat(NEEDS[PAGE] || []);
    Promise.all(need.map(function (k) { return load(k === "clubs" ? "data/clubs.json" : FILES[k]); })).then(function (res) {
      DATA = {}; need.forEach(function (k, i) { DATA[k] = res[i]; });
      DATA.clubs.clubs.forEach(function (c) { CLUBS[c.id] = c; });
      GROUNDS = DATA.clubs.grounds;
      render();
    }).catch(function (e) { console.error(e); $$(".data-root").forEach(fail); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
