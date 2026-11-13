/* Interactive demo of the Investment app: same demo data and splitting rules as the app
   (DemoData.kt, Rules.kt, Portfolio.kt). Everything stays in this page; nothing is saved. */
(function () {
  'use strict';
  var root = document.getElementById('demo-app');
  if (!root) return;

  var COLORS = ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var TAKA = 100;

  var today = new Date();
  var NOW = today.getFullYear() * 12 + today.getMonth(); // month index: year*12 + month(0-11)
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(ym, d) { return Math.floor(ym / 12) + '-' + pad(ym % 12 + 1) + '-' + pad(d); }
  var TODAY = iso(NOW, today.getDate());
  function ymOf(isoDate) { var p = isoDate.split('-'); return +p[0] * 12 + (+p[1] - 1); }
  function mName(ym) { return MONTHS[ym % 12] + ' ' + Math.floor(ym / 12); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function money(paisa, decimals) {
    if (decimals === undefined) decimals = true;
    var neg = paisa < 0, v = Math.abs(paisa) / 100;
    var s = v.toLocaleString('en-US', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 });
    return (neg ? '-' : '') + '৳' + s;
  }
  function pct(r, d) { return isFinite(r) ? (r * 100).toFixed(d === undefined ? 1 : d) + '%' : '–'; }
  function short(paisa) {
    var t = paisa / 100;
    if (Math.abs(t) >= 1e5) return '৳' + (t / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (Math.abs(t) >= 1e3) return '৳' + (t / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return '৳' + Math.round(t);
  }

  // ---------- Data ----------
  var S;
  function seed() {
    S = {
      investors: [{ id: 1, name: 'Arif' }, { id: 2, name: 'Nadia' }, { id: 3, name: 'Samir' }],
      investments: [{ id: 1, name: 'Bus-DEMO-0001' }, { id: 2, name: 'Bus-DEMO-0002' }],
      contributions: [
        { inv: 1, who: 1, date: iso(NOW - 13, 5), amt: 300000 * TAKA },
        { inv: 1, who: 2, date: iso(NOW - 13, 18), amt: 200000 * TAKA },
        { inv: 2, who: 1, date: iso(NOW - 9, 10), amt: 200000 * TAKA },
        { inv: 2, who: 3, date: iso(NOW - 9, 10), amt: 100000 * TAKA },
        { inv: 2, who: 2, date: iso(NOW - 6, 14), amt: 100000 * TAKA },
      ],
      returns: [],
    };
    var b1 = [9850, 10420, 9310, 11200, 10050, 9780, 10960, 11480, 10240, 9620, 10870, 11150];
    var b2 = [6120, 5840, 6480, 6950, 6210, 5990, 6730, 7040];
    b1.forEach(function (t, i) { var m = NOW - (12 - i); S.returns.push({ inv: 1, start: m, end: m, date: iso(m + 1, 10), amt: t * TAKA, cap: false }); });
    b2.forEach(function (t, i) { var m = NOW - (8 - i); S.returns.push({ inv: 2, start: m, end: m, date: iso(m + 1, 10), amt: t * TAKA, cap: false }); });
    S.returns = S.returns.filter(function (r) { return r.date <= TODAY; });
  }

  // ---------- Rules (as in Rules.kt) ----------
  function capitalOn(inv, date) {
    var caps = {};
    S.contributions.forEach(function (c) { if (c.inv === inv && c.date <= date) caps[c.who] = (caps[c.who] || 0) + c.amt; });
    return caps;
  }
  function split(inv, date, amt, withCap) {
    var caps = capitalOn(inv, date), ids = Object.keys(caps).map(Number), base = 0;
    ids.forEach(function (id) { base += caps[id]; });
    if (base <= 0) return null;
    var capBack = withCap ? base : 0, profit = amt - capBack, shares = {}, sum = 0, top = ids[0];
    ids.forEach(function (id) {
      var v = profit * caps[id] / base;
      shares[id] = v >= 0 ? Math.floor(v + 0.5) : -Math.floor(-v + 0.5);
      sum += shares[id];
      if (caps[id] > caps[top]) top = id;
    });
    if (profit - sum !== 0) shares[top] += profit - sum; // rounding leftover to the largest holder
    return { base: base, capBack: capBack, profit: profit, caps: caps, shares: shares };
  }
  function isClosed(inv) { return S.returns.some(function (r) { return r.inv === inv && r.cap; }); }
  function name(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name; return '?'; }
  function color(id) { for (var i = 0; i < S.investors.length; i++) if (S.investors[i].id === id) return COLORS[i % COLORS.length]; return '#999'; }

  // ---------- Portfolio (as in Portfolio.kt) ----------
  function portfolio() {
    var P = { capital: 0, paid: 0, splits: [], byInv: {}, byWho: {}, months: [] };
    S.contributions.forEach(function (c) {
      P.capital += c.amt;
      P.byWho[c.who] = P.byWho[c.who] || { cap: 0, pay: 0 }; P.byWho[c.who].cap += c.amt;
      P.byInv[c.inv] = P.byInv[c.inv] || { cap: 0, profit: 0 }; P.byInv[c.inv].cap += c.amt;
    });
    var monthMap = {};
    S.returns.forEach(function (r) {
      var sp = split(r.inv, r.date, r.amt, r.cap);
      P.splits.push({ r: r, sp: sp });
      if (!sp) return;
      P.paid += sp.profit;
      P.byInv[r.inv].profit += sp.profit;
      var n = r.end - r.start + 1;
      Object.keys(sp.shares).forEach(function (k) {
        var id = +k;
        P.byWho[id] = P.byWho[id] || { cap: 0, pay: 0 }; P.byWho[id].pay += sp.shares[id];
        for (var m = r.start; m <= r.end; m++) { monthMap[m] = monthMap[m] || {}; monthMap[m][id] = (monthMap[m][id] || 0) + sp.shares[id] / n; }
      });
    });
    var keys = Object.keys(monthMap).map(Number);
    if (keys.length) {
      var lo = Math.min.apply(null, keys), hi = Math.max.apply(null, keys);
      for (var m = lo; m <= hi; m++) P.months.push({ ym: m, by: monthMap[m] || {} });
    }
    P.splits.sort(function (a, b) { return a.r.date < b.r.date ? 1 : -1; });
    return P;
  }
  function total(by) { var t = 0; for (var k in by) t += by[k]; return t; }
  function periods(P, kind) {
    var groups = {}, order = [];
    P.months.forEach(function (m) {
      var y = Math.floor(m.ym / 12), mo = m.ym % 12;
      var key = kind === 'm' ? m.ym : kind === 'h' ? y * 12 + (mo < 6 ? 0 : 6) : y * 12;
      if (!groups[key]) { groups[key] = {}; order.push(key); }
      for (var id in m.by) groups[key][id] = (groups[key][id] || 0) + m.by[id];
    });
    return order.sort(function (a, b) { return b - a; }).map(function (key) {
      var y = Math.floor(key / 12), label = kind === 'm' ? mName(key) : kind === 'h' ? (key % 12 === 0 ? 'Jan–Jun ' : 'Jul–Dec ') + y : String(y);
      var by = {}; for (var id in groups[key]) by[id] = Math.round(groups[key][id]);
      return { label: label, by: by, total: total(by) };
    });
  }

  // ---------- UI state ----------
  var tab = 'dash', kind = 'h', bar = null, showAll = false, toastTimer = null;
  var form, cform;
  function resetForms() {
    form = { inv: 2, month: NOW - 1, amt: '19,800', cap: false, date: TODAY };
    cform = { who: 1, inv: 'new', amt: '50,000', date: TODAY, newWho: '', newInv: 'Shop-DEMO-0001' };
  }
  resetForms();

  function toast(msg) {
    var t = root.querySelector('.d-toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }
  function parseAmt(s) { var v = parseFloat(String(s).replace(/[,৳\s]/g, '')); return isFinite(v) && v > 0 ? Math.round(v * 100) : null; }

  // ---------- Views ----------
  function tile(label, value, sub) {
    return '<div class="d-tile"><div class="d-tl">' + label + '</div><div class="d-tv">' + value + '</div><div class="d-ts">' + sub + '</div></div>';
  }
  function legend() {
    return '<div class="d-legend">' + S.investors.map(function (v, i) {
      return '<span><i style="background:' + COLORS[i % COLORS.length] + '"></i>' + esc(v.name) + '</span>';
    }).join('') + '</div>';
  }
  function chart(P) {
    var months = P.months.slice(-12);
    if (!months.length) return '<p class="d-muted">No returns yet.</p>';
    var max = 0; months.forEach(function (m) { max = Math.max(max, total(m.by)); });
    max = max || 1;
    var W = 300, H = 130, bw = W / months.length, out = '';
    months.forEach(function (m, i) {
      var y = H, x = i * bw + bw * 0.18, w = bw * 0.64;
      S.investors.forEach(function (v) {
        var val = m.by[v.id] || 0; if (val <= 0) return;
        var h = val / max * (H - 6); y -= h;
        out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + color(v.id) + '"' + (bar !== null && bar !== m.ym ? ' opacity=".35"' : '') + '/>';
      });
      out += '<rect class="d-hit" data-bar="' + m.ym + '" x="' + (i * bw) + '" y="0" width="' + bw + '" height="' + (H + 16) + '" fill="transparent"/>';
      out += '<text x="' + (i * bw + bw / 2) + '" y="' + (H + 12) + '" text-anchor="middle">' + MONTHS[m.ym % 12][0] + '</text>';
    });
    var sel = bar !== null ? months.filter(function (m) { return m.ym === bar; })[0] : months[months.length - 1];
    var detail = '<div class="d-bar-detail"><b>' + mName(sel.ym) + '</b><b>' + money(Math.round(total(sel.by))) + '</b>' +
      S.investors.map(function (v) { var a = Math.round(sel.by[v.id] || 0); return a ? '<span><i style="background:' + color(v.id) + '"></i>' + esc(v.name) + '</span><span>' + money(a) + '</span>' : ''; }).join('') + '</div>';
    return '<svg class="d-chart" viewBox="0 0 ' + W + ' ' + (H + 16) + '" role="img" aria-label="Monthly income chart">' + out + '</svg>' + detail;
  }
  function periodPanel(P) {
    var list = periods(P, kind), shown = showAll ? list : list.slice(0, 4);
    var seg = [['m', 'Monthly'], ['h', 'Half-yearly'], ['y', 'Yearly']].map(function (k) {
      return '<button type="button" data-kind="' + k[0] + '" aria-pressed="' + (kind === k[0]) + '">' + k[1] + '</button>';
    }).join('');
    var rows = shown.map(function (p) {
      var idx = list.indexOf(p), prev = list[idx + 1], ch = '';
      if (prev && prev.total) {
        var r = (p.total - prev.total) / Math.abs(prev.total);
        ch = '<small class="' + (r >= 0 ? 'up' : 'down') + '">' + (r >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(r)) + ' vs previous</small>';
      }
      var who = S.investors.map(function (v) { var a = p.by[v.id] || 0; return a ? '<span><i style="background:' + color(v.id) + '"></i>' + esc(v.name) + ' ' + money(a) + '</span>' : ''; }).join('');
      return '<div class="d-period"><div class="d-prow"><b>' + p.label + '</b><div class="d-pr"><b class="' + (p.total < 0 ? 'down' : 'up') + '">' +
        (p.total < 0 ? 'Loss ' + money(-p.total) : money(p.total)) + '</b>' + ch + '</div></div><div class="d-who">' + who + '</div></div>';
    }).join('');
    var more = list.length > 4 ? '<button type="button" class="d-link" data-act="more">' + (showAll ? 'Show less' : 'Show all ' + list.length) + '</button>' : '';
    return '<div class="d-card"><h4>Profit by period</h4><p class="d-muted">Profit or loss in each period, for everyone and per partner.</p>' +
      '<div class="d-seg">' + seg + '</div>' + (rows || '<p class="d-muted">Add a return to see profit by period.</p>') + more + '</div>';
  }
  function dashboard() {
    var P = portfolio(), open = S.investments.filter(function (i) { return !isClosed(i.id); }).length, closed = S.investments.length - open;
    var last = P.months[P.months.length - 1];
    return '<div class="d-tiles">' +
      tile('Capital invested', money(P.capital, false), open + ' open' + (closed ? ' · ' + closed + ' closed' : '')) +
      tile('Paid to partners', money(P.paid), S.returns.length + ' returns') +
      tile('Cash yield so far', P.capital ? pct(P.paid / P.capital, 2) : '–', 'not annualised') +
      tile(last ? 'Income, ' + mName(last.ym) : 'Latest income', last ? money(Math.round(total(last.by)), false) : '–', 'latest month') +
      '</div><div class="d-card"><h4>Monthly income by partner</h4><p class="d-muted">Tap a bar to see its amounts.</p>' + legend() + chart(P) + '</div>' +
      periodPanel(P);
  }
  function summary() {
    var P = portfolio();
    var partners = S.investors.map(function (v) {
      var w = P.byWho[v.id] || { cap: 0, pay: 0 };
      return '<div class="d-row"><div><b><i style="background:' + color(v.id) + '"></i>' + esc(v.name) + '</b><small>' + money(w.cap, false) + ' · ' + pct(P.capital ? w.cap / P.capital : 0) + ' equity</small></div>' +
        '<div class="d-r"><b>' + money(w.pay) + '</b><small>ROI ' + pct(w.cap ? w.pay / w.cap : 0, 2) + '</small></div></div>';
    }).join('');
    var invs = S.investments.map(function (i) {
      var x = P.byInv[i.id] || { cap: 0, profit: 0 };
      return '<div class="d-row"><div><b>' + esc(i.name) + '</b><small>' + money(x.cap, false) + ' capital · ' + (isClosed(i.id) ? 'closed' : 'open') + '</small></div>' +
        '<div class="d-r"><b>' + money(x.profit) + '</b><small>yield ' + pct(x.cap ? x.profit / x.cap : 0, 2) + '</small></div></div>';
    }).join('');
    var pays = P.splits.slice(0, 5).map(function (s) {
      var r = s.r, sp = s.sp; if (!sp) return '';
      return '<div class="d-pay"><div class="d-prow"><b>' + (r.start === r.end ? mName(r.start) : mName(r.start) + '–' + mName(r.end)) + '</b><b>' + money(r.amt) + '</b></div>' +
        '<small>' + esc(name(S.investments, r.inv)) + ' · received ' + r.date + (r.cap ? ' · with capital' : '') + '</small>' +
        S.investors.map(function (v) { var a = sp.shares[v.id]; return a !== undefined ? '<div class="d-line"><span>' + esc(v.name) + '</span><span>' + money(a + (r.cap ? sp.caps[v.id] : 0)) + '</span></div>' : ''; }).join('') + '</div>';
    }).join('');
    return '<div class="d-card"><h4>Partners</h4>' + partners + '</div><div class="d-card"><h4>Investments</h4>' + invs + '</div>' +
      '<div class="d-card"><h4>Latest payouts</h4>' + pays + '</div>';
  }
  function opts(list, sel, filter) {
    return list.filter(filter || function () { return true; }).map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.name) + '</option>';
    }).join('');
  }
  function newOpt(sel, what) { return '<option value="new"' + (sel === 'new' ? ' selected' : '') + '>+ New ' + what + '…</option>'; }
  function findOrAdd(list, wanted) {
    var n = String(wanted || '').trim().replace(/\s+/g, ' ');
    if (!n) return null;
    for (var i = 0; i < list.length; i++) if (list[i].name.toLowerCase() === n.toLowerCase()) return list[i].id;
    var id = 1; list.forEach(function (x) { id = Math.max(id, x.id + 1); });
    list.push({ id: id, name: n.slice(0, 30) });
    return id;
  }
  function addInvestment() {
    return '<div class="d-card"><h4>Add investment</h4><p class="d-muted">Record money a partner put in.</p>' +
      '<label>Date<input type="date" data-c="date" value="' + cform.date + '" max="' + TODAY + '"></label>' +
      '<label>Partner<select data-c="who">' + opts(S.investors, cform.who) + newOpt(cform.who, 'partner') + '</select></label>' +
      (cform.who === 'new' ? '<label>New partner name<input data-c="newWho" placeholder="e.g. Rina" value="' + esc(cform.newWho) + '"></label>' : '') +
      '<label>Amount (৳)<input inputmode="decimal" data-c="amt" value="' + esc(cform.amt) + '"></label>' +
      '<label>Investment<select data-c="inv">' + opts(S.investments, cform.inv, function (i) { return !isClosed(i.id); }) + newOpt(cform.inv, 'investment') + '</select></label>' +
      (cform.inv === 'new' ? '<label>New investment name<input data-c="newInv" placeholder="e.g. Shop-0001" value="' + esc(cform.newInv) + '"></label>' : '') +
      '<button type="button" class="d-primary" data-act="save-c">Save investment</button></div>';
  }
  function returnPreview() {
    var amt = parseAmt(form.amt), box = '';
    if (!amt) return '<p class="d-muted">Enter an amount to see the split.</p>';
    var sp = split(form.inv, form.date, amt, form.cap);
    if (!sp) return '<p class="d-bad">No money was in this investment on ' + form.date + '. Pick a later date received.</p>';
    box += '<div class="d-preview"><div class="d-prow"><b>Split preview</b><small>by capital on ' + form.date + '</small></div>';
    S.investors.forEach(function (v) {
      if (sp.shares[v.id] === undefined) return;
      var share = sp.caps[v.id] / sp.base;
      var val = form.cap ? money(sp.caps[v.id], false) + ' + ' + money(sp.shares[v.id]) : money(sp.shares[v.id]);
      box += '<div class="d-line"><span><i style="background:' + color(v.id) + '"></i>' + esc(v.name) + ' · ' + pct(share) + '</span><span>' + val + '</span></div>';
    });
    if (form.cap) box += '<div class="d-line d-tot"><span>' + (sp.profit < 0 ? 'Loss' : 'Profit') + '</span><span class="' + (sp.profit < 0 ? 'down' : 'up') + '">' + money(sp.profit) + '</span></div>';
    return box + '</div>';
  }
  function addReturn() {
    var months = []; for (var m = NOW; m >= NOW - 11; m--) months.push({ id: m, name: mName(m) });
    return '<div class="d-card"><h4>Add return</h4><p class="d-muted">Income for a month. Watch the split update as you type.</p>' +
      '<label>Investment<select data-f="inv">' + opts(S.investments, form.inv, function (i) { return !isClosed(i.id); }) + '</select></label>' +
      '<label>Month<select data-f="month">' + opts(months, form.month) + '</select></label>' +
      '<label>Date received<input type="date" data-f="date" value="' + form.date + '" max="' + TODAY + '"></label>' +
      '<label>Total return (৳)<input inputmode="decimal" data-f="amt" value="' + esc(form.amt) + '"></label>' +
      '<label class="d-check"><input type="checkbox" data-f="cap"' + (form.cap ? ' checked' : '') + '> With capital <small>(pays the capital back and closes the investment)</small></label>' +
      '<div class="d-live">' + returnPreview() + '</div>' +
      '<button type="button" class="d-primary" data-act="save-r">Save return</button></div>';
  }

  function render() {
    var body = root.querySelector('.d-body');
    var html = tab === 'dash' ? dashboard() : tab === 'sum' ? summary() : tab === 'inv' ? addInvestment() : addReturn();
    body.innerHTML = html;
    root.querySelectorAll('.d-tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
  }

  // ---------- Events ----------
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-kind],[data-bar],[data-act]');
    if (!t || !root.contains(t)) return;
    if (t.dataset.tab) { tab = t.dataset.tab; bar = null; render(); root.querySelector('.d-body').scrollTop = 0; return; }
    if (t.dataset.kind) { kind = t.dataset.kind; showAll = false; render(); return; }
    if (t.dataset.bar) { var b = +t.dataset.bar; bar = bar === b ? null : b; render(); return; }
    var act = t.dataset.act;
    if (act === 'more') { showAll = !showAll; render(); }
    else if (act === 'reset') { seed(); resetForms(); tab = 'dash'; bar = null; render(); toast('Demo data reset'); }
    else if (act === 'save-c') {
      var a = parseAmt(cform.amt);
      if (!a) { toast('Enter an amount'); return; }
      if (cform.who === 'new' && !String(cform.newWho).trim()) { toast('Enter the new partner\'s name'); return; }
      if (cform.inv === 'new' && !String(cform.newInv).trim()) { toast('Enter the new investment\'s name'); return; }
      if (!cform.date || cform.date > TODAY) { toast('Pick a date up to today'); return; }
      var isNewInv = cform.inv === 'new';
      var who = cform.who === 'new' ? findOrAdd(S.investors, cform.newWho) : cform.who;
      var inv = isNewInv ? findOrAdd(S.investments, cform.newInv) : cform.inv;
      S.contributions.push({ inv: inv, who: who, date: cform.date, amt: a });
      toast((isNewInv ? 'New investment ' + name(S.investments, inv) + ': ' : 'Saved: ') + name(S.investors, who) + ' ' + money(a, false));
      cform.who = who; cform.inv = inv; cform.newWho = ''; cform.newInv = '';
      form.inv = inv; form.cap = false; // Return tab now defaults to this investment
      tab = 'sum'; render();
    } else if (act === 'save-r') {
      var amt = parseAmt(form.amt);
      if (!amt) { toast('Enter an amount'); return; }
      if (!form.date || form.date > TODAY) { toast('Pick a date up to today'); return; }
      if (!split(form.inv, form.date, amt, form.cap)) { toast('No capital on that date'); return; }
      S.returns.push({ inv: form.inv, start: form.month, end: form.month, date: form.date, amt: amt, cap: form.cap });
      toast(form.cap ? 'Saved. ' + name(S.investments, form.inv) + ' is now closed' : 'Saved return for ' + mName(form.month));
      if (form.cap) { var openOne = S.investments.filter(function (i) { return !isClosed(i.id); })[0]; form.inv = openOne ? openOne.id : form.inv; form.cap = false; }
      tab = 'dash'; render();
    }
  });
  root.addEventListener('input', function (e) {
    var el = e.target, f = el.dataset.f, c = el.dataset.c;
    if (f) {
      form[f] = el.type === 'checkbox' ? el.checked : (f === 'inv' || f === 'month') ? +el.value : el.value;
      root.querySelector('.d-live').innerHTML = returnPreview();
    }
    if (c) {
      if (c === 'who' || c === 'inv') {
        var was = cform[c];
        cform[c] = el.value === 'new' ? 'new' : +el.value;
        if ((was === 'new') !== (cform[c] === 'new')) render(); // show or hide the name field
      } else cform[c] = el.value;
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-reset]'), function (b) {
    b.addEventListener('click', function () { seed(); resetForms(); tab = 'dash'; bar = null; showAll = false; render(); toast('Demo data reset'); });
  });

  seed();
  render();
})();
