(function () {
  "use strict";

  var LS_DELETED = "ca_deleted_v1"; // { "2026-08::2026-08-mp-003": true, ... }
  var state = {
    view: "home", // "home" | "month"
    monthIdx: 0,
    category: "all", // "all" | "madhya-pradesh" | "national" | "short-takes"
    query: ""
  };

  function months() { return window.MONTH_LIST || []; }
  function monthData(key) { return (window.CA_DATA || {})[key]; }

  function getDeleted() {
    try { return JSON.parse(localStorage.getItem(LS_DELETED) || "{}"); }
    catch (e) { return {}; }
  }
  function setDeleted(obj) { localStorage.setItem(LS_DELETED, JSON.stringify(obj)); }
  function isDeleted(monthKey, id) { return !!getDeleted()[monthKey + "::" + id]; }
  function markDeleted(monthKey, id) {
    var d = getDeleted(); d[monthKey + "::" + id] = true; setDeleted(d);
  }
  function restoreAll(monthKey) {
    var d = getDeleted();
    Object.keys(d).forEach(function (k) { if (k.indexOf(monthKey + "::") === 0) delete d[k]; });
    setDeleted(d);
  }
  function countDeleted(monthKey) {
    var d = getDeleted(), n = 0;
    Object.keys(d).forEach(function (k) { if (k.indexOf(monthKey + "::") === 0) n++; });
    return n;
  }

  var CATS = [
    { id: "all", label: "All" },
    { id: "madhya-pradesh", label: "Madhya Pradesh" },
    { id: "national", label: "National" },
    { id: "short-takes", label: "Short Takes" }
  ];

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), v);
      else if (k === "disabled") e.disabled = true;
      else if (k === "selected") e.selected = true;
      else e.setAttribute(k, v);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function renderTopbar() {
    var m = months();
    var cur = m[state.monthIdx];
    var bar = document.getElementById("topbar-controls");
    bar.innerHTML = "";

    bar.appendChild(el("span", { class: "brand", onclick: goHome, text: "MP Current Affairs" }));

    var nav = el("div", { class: "nav-cluster" });
    nav.appendChild(el("button", {
      text: "\u2190 Prev", disabled: state.view !== "month" || state.monthIdx <= 0 ? "disabled" : null,
      onclick: function () { if (state.monthIdx > 0) { state.monthIdx--; state.view = "month"; render(); } }
    }));
    nav.appendChild(el("span", { class: "month-label", text: cur ? cur.label : "No months" }));
    nav.appendChild(el("button", {
      text: "Next \u2192", disabled: state.view !== "month" || state.monthIdx >= m.length - 1 ? "disabled" : null,
      onclick: function () { if (state.monthIdx < m.length - 1) { state.monthIdx++; state.view = "month"; render(); } }
    }));
    bar.appendChild(nav);

    var monthSel = el("select", {
      onchange: function (e) { state.monthIdx = +e.target.value; state.view = "month"; render(); }
    });
    m.forEach(function (mo, i) {
      monthSel.appendChild(el("option", { value: i, text: mo.label, selected: i === state.monthIdx ? "selected" : null }));
    });
    bar.appendChild(monthSel);

    bar.appendChild(el("button", { text: "Home", onclick: goHome }));

    var tabs = document.getElementById("cat-tabs");
    tabs.innerHTML = "";
    if (state.view === "month") {
      CATS.forEach(function (c) {
        tabs.appendChild(el("button", {
          text: c.label,
          class: state.category === c.id ? "active" : "",
          onclick: function () { state.category = c.id; renderMonth(); }
        }));
      });
      tabs.style.display = "flex";
      document.getElementById("search-row").style.display = "block";
    } else {
      tabs.style.display = "none";
      document.getElementById("search-row").style.display = "none";
    }
  }

  function goHome() { state.view = "home"; render(); }

  function eventMatchesQuery(ev, q) {
    if (!q) return true;
    q = q.toLowerCase();
    return (ev.title + " " + ev.intro + " " + ev.facts.join(" ")).toLowerCase().indexOf(q) !== -1;
  }

  function renderHome() {
    var main = document.getElementById("app-main");
    main.innerHTML = "";
    var m = months();
    if (!m.length) {
      main.appendChild(el("div", { class: "empty-state", text: "No months loaded yet." }));
      return;
    }
    main.appendChild(el("div", { class: "section-title", text: "Months" }));
    var grid = el("div", { class: "home-grid" });
    m.forEach(function (mo, i) {
      var data = monthData(mo.key);
      var counts = { "madhya-pradesh": 0, national: 0, "short-takes": 0 };
      var totalDeleted = countDeleted(mo.key);
      if (data) {
        Object.keys(counts).forEach(function (c) {
          var evs = (data.categories[c] && data.categories[c].events) || [];
          counts[c] = evs.filter(function (e) { return !isDeleted(mo.key, e.id); }).length;
        });
      }
      var total = counts["madhya-pradesh"] + counts.national + counts["short-takes"];
      var card = el("div", {
        class: "home-card",
        onclick: function () { state.monthIdx = i; state.view = "month"; state.category = "all"; render(); }
      }, [
        el("div", { class: "m-label", text: mo.label }),
        el("div", { class: "m-counts", text: total + " events \u2014 MP " + counts["madhya-pradesh"] +
            " \u00b7 National " + counts.national + " \u00b7 Short Takes " + counts["short-takes"] +
            (totalDeleted ? " \u00b7 " + totalDeleted + " removed" : "") })
      ]);
      grid.appendChild(card);
    });
    main.appendChild(grid);
  }

  function card(ev, monthKey) {
    var head = el("div", { class: "card-head" }, [
      el("h3", { text: ev.title }),
      el("button", {
        class: "del-btn", title: "Remove this entry", text: "\u2715",
        onclick: function () {
          if (confirm('Remove "' + ev.title + '" from your notes?')) {
            markDeleted(monthKey, ev.id);
            renderMonth();
          }
        }
      })
    ]);
    var body = [head, el("div", { class: "tag", text: ev.section || "" })];
    if (ev.intro) body.push(el("p", { class: "intro", text: ev.intro }));
    if (ev.facts && ev.facts.length) {
      var ul = el("ul", {});
      ev.facts.forEach(function (f) { ul.appendChild(el("li", { text: f })); });
      body.push(ul);
    }
    return el("div", { class: "card" }, body);
  }

  function flattenedEvents(data, monthKey) {
    var out = [];
    ["madhya-pradesh", "national", "short-takes"].forEach(function (secId) {
      var sec = data.categories[secId];
      if (!sec) return;
      sec.events.forEach(function (e) {
        out.push(Object.assign({}, e, { section: sec.label, sectionId: secId }));
      });
    });
    return out;
  }

  function renderMonth() {
    var main = document.getElementById("app-main");
    main.innerHTML = "";
    var mo = months()[state.monthIdx];
    if (!mo) { renderHome(); return; }
    var data = monthData(mo.key);
    if (!data) {
      main.appendChild(el("div", { class: "empty-state", text: "Data for " + mo.label + " not loaded." }));
      return;
    }
    var all = flattenedEvents(data, mo.key);
    var visible = all.filter(function (e) {
      if (isDeleted(mo.key, e.id)) return false;
      if (state.category !== "all" && e.sectionId !== state.category) return false;
      if (!eventMatchesQuery(e, state.query)) return false;
      return true;
    });

    var delCount = countDeleted(mo.key);
    var meta = el("div", { class: "meta-row" }, [
      el("span", { text: visible.length + " item" + (visible.length === 1 ? "" : "s") }),
      delCount ? el("span", { class: "hidden-note" }, [
        document.createTextNode(delCount + " removed \u2014 "),
        el("a", { text: "restore all", onclick: function () { restoreAll(mo.key); renderMonth(); } })
      ]) : null
    ]);
    main.appendChild(meta);

    if (!visible.length) {
      main.appendChild(el("div", { class: "empty-state", text: "Nothing here." }));
    } else {
      visible.forEach(function (e) { main.appendChild(card(e, mo.key)); });
    }
  }

  function renderFooter() {
    var footer = document.getElementById("app-footer");
    footer.innerHTML = "";
    if (state.view !== "month") return;
    var mo = months()[state.monthIdx];
    footer.appendChild(el("button", {
      text: "Export cleaned JSON for " + mo.label,
      onclick: function () { exportMonth(mo.key); }
    }));
  }

  function exportMonth(monthKey) {
    var data = monthData(monthKey);
    if (!data) return;
    var clean = JSON.parse(JSON.stringify(data));
    ["madhya-pradesh", "national", "short-takes"].forEach(function (sec) {
      clean.categories[sec].events = clean.categories[sec].events.filter(function (e) {
        return !isDeleted(monthKey, e.id);
      });
    });
    var blob = new Blob([JSON.stringify(clean, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = monthKey + "-cleaned.json";
    a.click();
  }

  function render() {
    renderTopbar();
    if (state.view === "home") renderHome(); else renderMonth();
    renderFooter();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var search = document.getElementById("search-input");
    search.addEventListener("input", function (e) {
      state.query = e.target.value;
      renderMonth();
    });
    if (months().length) { state.view = "month"; state.monthIdx = months().length - 1; }
    render();
  });
})();
