/* Codito · MVP
 * Cuentas, metas y gastos se guardan en el navegador del celular (localStorage).
 * Es una versión de prueba: no hay servidor y nunca se piden claves del banco.
 */
(function () {
  'use strict';

  const USERS = 'codito-users';
  const SESSION = 'codito-session';
  const dataKey = email => 'codito-data-' + email;
  const $ = id => document.getElementById(id);

  // ---------- Utilidades ----------
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const sol = n => 'S/ ' + (Math.round(n * 100) / 100).toLocaleString('es-PE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const dkey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const uid = () => Math.random().toString(36).slice(2, 10);

  async function hashPin(email, pin) {
    const text = 'codito:' + email + ':' + pin;
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { // navegador sin crypto.subtle
      let h = 5381; for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
      return 'f' + (h >>> 0).toString(16);
    }
  }

  // ---------- Datos de ejemplo ----------
  function ejemplo() {
    const hoy = new Date(); const f = new Date(hoy); f.setMonth(f.getMonth() + 4);
    const g = [];
    const ad = (dias, m, c, h) => { const d = new Date(hoy); d.setDate(d.getDate() - dias); d.setHours(h || 13, 0, 0, 0); g.push({ id: uid(), t: d.getTime(), m, c, y: true }); };
    ad(0, 2, 'Pasaje', 8); ad(0, 3.5, 'Comida', 13); ad(1, 12, 'Comida'); ad(2, 5, 'Otros'); ad(3, 25, 'Salidas', 21); ad(5, 8, 'Comida');
    return { meta: { nombre: '✈️ Viaje a Cusco', monto: 1200, fecha: dkey(f), ingreso: 1200, fijos: 750, ahorrado: 420 }, gastos: g };
  }

  // ---------- Estado ----------
  let user = null;   // { name, email, demo }
  let S = null;      // { meta, gastos }
  const save = () => { if (user && !user.demo) store.set(dataKey(user.email), S); };

  // ---------- Cálculo del día ----------
  function calc() {
    const m = S.meta, hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fin = new Date(m.fecha + 'T00:00:00');
    const meses = Math.max(1, (fin - hoy) / (1000 * 60 * 60 * 24 * 30.44));
    const falta = Math.max(0, m.monto - m.ahorrado);
    const ahorroMes = falta / meses;
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const diasRest = ultimo - hoy.getDate() + 1;
    const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
    const hk = dkey(hoy);
    let antes = 0, hoyG = 0;
    S.gastos.forEach(g => { if (g.t >= ini) { if (dkey(new Date(g.t)) === hk) hoyG += g.m; else if (g.t < hoy.getTime()) antes += g.m; } });
    const diario = (m.ingreso - m.fijos - ahorroMes - antes) / diasRest;
    return { falta, ahorroSemana: ahorroMes / 4.345, diario, hoyG, puedes: diario - hoyG, pct: Math.min(100, m.ahorrado / m.monto * 100), fin };
  }

  // ---------- Pintar ----------
  function render() {
    const first = (user.name || '').split(' ')[0];
    $('hello').textContent = user.demo ? 'Hola 👋' : 'Hola, ' + first + ' 👋';
    $('helloSub').textContent = user.demo ? 'Estás viendo un ejemplo' : 'Sé codito con tus gastos';
    $('demoChip').hidden = !user.demo;
    $('btnLogout').textContent = user.demo ? 'Crear cuenta' : 'Salir';

    if (!S.meta) { // cuenta nueva: primero la meta
      $('metaCard').hidden = true; $('formMetaTitle').textContent = 'Paso 1 · Crea tu primera meta';
      return;
    }
    $('metaCard').hidden = false; $('formMetaTitle').textContent = 'Editar mi meta y mi mes';
    const m = S.meta, c = calc(), hoy = new Date();
    $('hoyFecha').textContent = hoy.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    $('hoyPuedes').textContent = sol(Math.max(0, c.puedes));
    $('hoyPuedes').classList.toggle('neg', c.puedes < 0);
    $('hoyMsg').textContent = c.puedes < 0
      ? 'Hoy te pasaste ' + sol(-c.puedes) + '. Tranqui: mañana Codito reparte la diferencia en los días que quedan.'
      : 'Tu límite de hoy es ' + sol(Math.max(0, c.diario)) + ' y llevas ' + sol(c.hoyG) + '. Si te mantienes así, llegas a tu meta.';
    $('metaNombreMini').textContent = m.nombre; $('metaPctMini').textContent = Math.round(c.pct) + '%';
    $('fillMini').style.width = c.pct + '%'; $('fillMeta').style.width = c.pct + '%';
    $('metaFaltaMini').textContent = c.falta > 0 ? 'Te faltan ' + sol(c.falta) + ' · esta semana aparta ' + sol(c.ahorroSemana) : '¡Llegaste a tu meta! 🎉';
    $('metaNombre').textContent = m.nombre; $('metaAhorrado').textContent = sol(m.ahorrado);
    $('metaDe').textContent = 'de ' + sol(m.monto) + ' · ' + Math.round(c.pct) + '%';
    $('metaSemana').textContent = sol(c.ahorroSemana);
    $('metaLlegas').textContent = c.fin.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
    ['fNombre', 'fMonto', 'fFecha', 'fIngreso', 'fFijos'].forEach((id, i) => { $(id).value = [m.nombre, m.monto, m.fecha, m.ingreso, m.fijos][i]; });

    // Gastos de hoy
    const hk = dkey(hoy), lista = $('listaHoy'); lista.textContent = '';
    const deHoy = S.gastos.filter(g => dkey(new Date(g.t)) === hk).sort((a, b) => b.t - a.t);
    if (!deHoy.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Aún no anotas nada hoy. Anota tu primer gasto en 2 toques.'; lista.append(p); }
    const ic = { Comida: '🍔', Pasaje: '🚌', Salidas: '🎉', Otros: '🛍' };
    deHoy.forEach(g => {
      const d = document.createElement('div'); d.className = 'item';
      const l = document.createElement('div'); l.textContent = ic[g.c] + ' ' + g.c;
      const s = document.createElement('small'); s.textContent = new Date(g.t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + (g.y ? ' · Yape' : ''); l.append(s);
      const r = document.createElement('div'); r.style.display = 'flex'; r.style.alignItems = 'center';
      const v = document.createElement('b'); v.textContent = sol(g.m); v.style.fontVariantNumeric = 'tabular-nums';
      const x = document.createElement('button'); x.className = 'del'; x.textContent = '×'; x.setAttribute('aria-label', 'Borrar gasto de ' + sol(g.m));
      x.onclick = () => { S.gastos = S.gastos.filter(z => z.id !== g.id); save(); render(); toast('Gasto borrado'); };
      r.append(v, x); d.append(l, r); lista.append(d);
    });

    // Semana
    const dias = new Set(S.gastos.map(g => dkey(new Date(g.t))));
    const dots = $('dots'); dots.textContent = ''; let n = 0, peq = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); const on = dias.has(dkey(d)); if (on) n++;
      const w = document.createElement('div'); w.className = 'dot';
      const b = document.createElement('i'); if (on) b.className = 'on';
      w.append(b, d.toLocaleDateString('es-PE', { weekday: 'short' }).slice(0, 2)); dots.append(w);
    }
    const hace7 = new Date(); hace7.setHours(0, 0, 0, 0); hace7.setDate(hace7.getDate() - 6);
    S.gastos.forEach(g => { if (g.t >= hace7.getTime() && g.m <= 10) peq += g.m; });
    $('stDias').textContent = n + ' de 7'; $('stPeq').textContent = sol(peq);
    $('stMsg').textContent = n >= 5 ? '¡Eres todo un codito! 🐷' : n >= 3 ? '¡Vas bien, sigue así!' : 'Anota cada día y mira la magia ✨';
  }

  // ---------- Navegación ----------
  let tt;
  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 1900); }
  function go(v) {
    if (!S.meta && v !== 'meta') { v = 'meta'; toast('Primero crea tu meta 🐷'); }
    ['hoy', 'meta', 'anotar'].forEach(k => { $('v-' + k).hidden = k !== v; });
    document.querySelectorAll('nav button').forEach(b => { if (b.dataset.go === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (v === 'anotar') setTimeout(() => $('gMonto').focus(), 60);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

  // ---------- Sesión ----------
  function enter(u) {
    user = u;
    S = u.demo ? ejemplo() : store.get(dataKey(u.email), { meta: null, gastos: [] });
    if (!u.demo) store.set(SESSION, u.email);
    $('auth').hidden = true; $('main').hidden = false; $('nav').hidden = false;
    render(); restoreReset(); go(S.meta ? 'hoy' : 'meta');
  }
  function leave() {
    store.del(SESSION); user = null; S = null;
    $('main').hidden = true; $('nav').hidden = true; $('auth').hidden = false;
    ['lEmail', 'lPin', 'sName', 'sEmail', 'sPin'].forEach(id => { $(id).value = ''; }); $('sOk').checked = false;
    window.scrollTo(0, 0);
  }
  function tab(signup) {
    $('tabLogin').setAttribute('aria-selected', !signup); $('tabSignup').setAttribute('aria-selected', signup);
    $('formLogin').hidden = signup; $('formSignup').hidden = !signup; $('lErr').hidden = true; $('sErr').hidden = true;
  }
  $('tabLogin').onclick = () => tab(false);
  $('tabSignup').onclick = () => tab(true);
  const err = (id, t) => { $(id).textContent = t; $(id).hidden = false; };
  const okEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  $('formSignup').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('sName').value.trim(), email = $('sEmail').value.trim().toLowerCase(), pin = $('sPin').value;
    if (!name) return err('sErr', 'Escribe tu nombre.');
    if (!okEmail(email)) return err('sErr', 'Revisa tu correo: falta algo como @gmail.com.');
    if (!/^\d{4}$/.test(pin)) return err('sErr', 'El PIN debe tener 4 números.');
    if (!$('sOk').checked) return err('sErr', 'Para continuar, acepta que guardemos tus datos en este celular.');
    const users = store.get(USERS, {});
    if (users[email]) return err('sErr', 'Ese correo ya tiene cuenta. Inicia sesión.');
    users[email] = { name, pin: await hashPin(email, pin), at: Date.now() };
    store.set(USERS, users);
    enter({ name, email });
    toast('¡Bienvenido, ' + name.split(' ')[0] + '! Crea tu meta');
  });
  $('formLogin').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('lEmail').value.trim().toLowerCase(), pin = $('lPin').value;
    const u = store.get(USERS, {})[email];
    if (!u) return err('lErr', 'No encontramos ese correo. ¿Creamos tu cuenta?');
    if (u.pin !== await hashPin(email, pin)) return err('lErr', 'El PIN no coincide. Inténtalo otra vez.');
    enter({ name: u.name, email });
  });
  $('btnDemo').onclick = () => enter({ name: 'Carlos', email: '', demo: true });
  $('btnLogout').onclick = () => { if (user && user.demo) { leave(); tab(true); } else { leave(); tab(false); toast('Sesión cerrada'); } };

  // ---------- Acciones ----------
  let cat = 'Comida';
  $('cats').addEventListener('click', e => { const b = e.target.closest('.cat'); if (!b) return; cat = b.dataset.cat; document.querySelectorAll('.cat').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('formGasto').addEventListener('submit', e => {
    e.preventDefault(); const m = parseFloat($('gMonto').value); if (!(m > 0)) return;
    S.gastos.push({ id: uid(), t: Date.now(), m, c: cat, y: $('gYape').checked });
    save(); $('gMonto').value = ''; $('gYape').checked = false; render(); go('hoy'); toast('Gasto anotado ✓');
  });
  $('formMeta').addEventListener('submit', e => {
    e.preventDefault();
    const nuevo = !S.meta;
    S.meta = { nombre: $('fNombre').value.trim(), monto: +$('fMonto').value, fecha: $('fFecha').value, ingreso: +$('fIngreso').value, fijos: +$('fFijos').value, ahorrado: S.meta ? S.meta.ahorrado : 0 };
    save(); render(); go('hoy'); toast(nuevo ? '¡Meta creada! 🎯' : 'Meta actualizada ✓');
  });
  $('btnAporte').addEventListener('click', () => {
    const v = parseFloat($('aporte').value); if (!(v > 0)) return;
    S.meta.ahorrado += v; save(); $('aporte').value = ''; render(); toast('¡Bien! +' + sol(v) + ' para tu meta 🐷');
  });
  function askReset() {
    const box = $('resetBox'); box.textContent = '';
    const s = document.createElement('span'); s.textContent = '¿Seguro?';
    const y = document.createElement('button'); y.className = 'btn danger'; y.textContent = 'Sí, borrar';
    const n = document.createElement('button'); n.className = 'btn ghost'; n.textContent = 'Cancelar';
    y.onclick = () => { S = user.demo ? ejemplo() : { meta: null, gastos: [] }; save(); render(); restoreReset(); go(S.meta ? 'hoy' : 'meta'); toast('Listo, empieza de nuevo'); };
    n.onclick = restoreReset; box.append(s, y, n);
  }
  function restoreReset() { const box = $('resetBox'); box.textContent = ''; const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = 'Borrar todo'; b.onclick = askReset; box.append(b); }

  // ---------- Inicio ----------
  const last = store.get(SESSION, null), users = store.get(USERS, {});
  if (last && users[last]) enter({ name: users[last].name, email: last });
  else tab(Object.keys(users).length === 0);
})();
