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
    ad(0, 2, 'Pasaje', 8); ad(0, 10, 'Comida', 13); ad(1, 16, 'Comida'); ad(2, 14, 'Otros'); ad(3, 22, 'Salidas', 21); ad(5, 18, 'Comida');
    const st = new Date(hoy); st.setDate(st.getDate() - 7);
    return { start: st.getTime(), meta: { nombre: ' Viaje a Cusco', monto: 1200, ahorroMes: 200, ingreso: 1300, fijos: 500, menu: 12, pasaje: 4, ahorrado: 420 }, gastos: g };
  }

  // ---------- Estado ----------
  let user = null;   // { name, email, demo }
  let S = null;      // { meta, gastos }
  const save = () => { if (user && !user.demo) store.set(dataKey(user.email), S); };

  // ---------- Cálculo del día ----------
  function calc() {
    const m = S.meta, hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const falta = Math.max(0, m.monto - m.ahorrado);
    let ahorroMes;
    if (m.ahorroMes != null) ahorroMes = Math.min(m.ahorroMes, falta);
    else { const f0 = new Date(m.fecha + 'T00:00:00'); ahorroMes = falta / Math.max(1, (f0 - hoy) / (1000 * 60 * 60 * 24 * 30.44)); }
    const fin = new Date(hoy); fin.setDate(fin.getDate() + (ahorroMes > 0 ? Math.ceil(falta / ahorroMes * 30.44) : 0));
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const libre = m.ingreso - m.fijos;
    // Límite parejo por día: lo libre del mes (después de apartar para la meta) entre los días del mes.
    const base = (libre - ahorroMes) / ultimo;
    // La bolsita: lo que NO gastaste los días anteriores de esta semana (lunes a domingo).
    const lunes = new Date(hoy); lunes.setDate(lunes.getDate() - ((hoy.getDay() + 6) % 7));
    const inicio = S.start ? new Date(S.start) : lunes; inicio.setHours(0, 0, 0, 0);
    const desde = Math.max(lunes.getTime(), inicio.getTime());
    const porDia = {}; S.gastos.forEach(g => { const k = dkey(new Date(g.t)); porDia[k] = (porDia[k] || 0) + g.m; });
    let sobra = 0;
    for (let d = new Date(desde); d < hoy; d.setDate(d.getDate() + 1)) sobra += base - (porDia[dkey(d)] || 0);
    const hk = dkey(hoy);
    let movs = 0, usadoHoy = 0;
    (S.mov || []).forEach(x => { if (x.t >= desde) { movs += x.m; if (x.tipo === 'hoy' && dkey(new Date(x.t)) === hk) usadoHoy += x.m; } });
    const bolsa = sobra - movs;
    const diasRestSemana = 7 - ((hoy.getDay() + 6) % 7);
    const diario = base + usadoHoy + (bolsa < 0 ? bolsa / diasRestSemana : 0);
    const hoyG = porDia[hk] || 0;
    let sugerida = null;
    if (falta > 0 && libre > 0 && (libre - ahorroMes) / 30 < 10) sugerida = Math.max(10, Math.floor(libre * 0.2 / 10) * 10);
    return { falta, ahorroSemana: ahorroMes / 4.345, ahorroDia: ahorroMes / 30.44, diario, hoyG, puedes: diario - hoyG, bolsa, base, domingo: hoy.getDay() === 0, pct: Math.min(100, m.ahorrado / m.monto * 100), fin, libre, ahorroMes, sugerida };
  }

  // ---------- Pintar ----------
  function render() {
    const first = (user.name || '').split(' ')[0];
    $('hello').textContent = user.demo ? 'Hola' : 'Hola, ' + first + '';
    $('helloSub').textContent = user.demo ? 'Estás viendo un ejemplo' : 'Sé codito con tus gastos';
    $('demoChip').hidden = !user.demo;
    $('btnLogout').textContent = user.demo ? 'Crear cuenta' : 'Salir';

    if (!S.meta) { // cuenta nueva: primero la meta
      $('metaCard').hidden = true;
      return;
    }
    $('metaCard').hidden = false;
    const m = S.meta, c = calc(), hoy = new Date();
    $('hoyFecha').textContent = hoy.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    $('hoyPuedes').textContent = sol(Math.max(0, c.puedes));
    $('hoyPuedes').classList.toggle('neg', c.puedes < 0);
    $('hoyMsg').textContent = c.libre <= 0
      ? 'Tus gastos fijos son iguales o mayores a lo que ganas. Revisa tus números en "Mi meta".'
      : c.sugerida
      ? 'Ojo: apartando ' + sol(c.ahorroMes) + ' al mes te quedan muy pocos soles para tu día a día. Prueba apartar ' + sol(c.sugerida) + ' en "Mi meta": llegas un poco después, pero sin pasar apuros.'
      : c.puedes < 0
      ? 'Hoy te pasaste ' + sol(-c.puedes) + '. Tranqui: mañana Codito reparte la diferencia en los días que quedan.'
      : 'Llevas ' + sol(c.hoyG) + ' de ' + sol(Math.max(0, c.diario)) + '. Es un límite, no una meta.';
    // Bolsita
    const bx = $('bolsa'), bt = $('bolsaTxt'), ba = $('bolsaBtns');
    bx.textContent = sol(Math.abs(c.bolsa)); bx.classList.toggle('neg', c.bolsa < 0);
    $('bolsaLbl').textContent = c.bolsa < -0.01 ? 'Esta semana te pasaste' : 'Sobrante de la semana';
    ba.hidden = !(c.bolsa >= 1);
    if (c.bolsa >= 1) {
      const dias = Math.max(1, Math.round(c.bolsa / Math.max(0.01, c.ahorroDia)));
      bt.textContent = (c.domingo ? 'Hoy es domingo. ' : '') + 'No lo gastaste esta semana. Si lo envías a tu meta, llegas unos ' + dias + (dias === 1 ? ' día' : ' días') + ' antes.';
    } else if (c.bolsa < -0.01) {
      bt.textContent = 'Se descuenta de los días que quedan de la semana.';
    } else {
      bt.textContent = 'Lo que no gastes cada día se acumula aquí.';
    }
    $('metaNombreMini').textContent = m.nombre; $('metaPctMini').textContent = Math.round(c.pct) + '%';
    $('fillMini').style.width = c.pct + '%'; $('fillMeta').style.width = c.pct + '%';
    $('metaFaltaMini').textContent = c.falta > 0 ? 'Te faltan ' + sol(c.falta) + ' · esta semana aparta ' + sol(c.ahorroSemana) : '¡Llegaste a tu meta!';
    $('metaNombre').textContent = m.nombre; $('metaAhorrado').textContent = sol(m.ahorrado);
    $('metaDe').textContent = 'de ' + sol(m.monto) + ' · ' + Math.round(c.pct) + '%';
    $('metaSemana').textContent = sol(c.ahorroSemana);
    $('metaLlegas').textContent = c.fin.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
    ['fNombre', 'fMonto', 'fAhorro', 'fIngreso', 'fFijos', 'fMenu', 'fPasaje'].forEach((id, i) => { $(id).value = [m.nombre, m.monto, Math.round(c.ahorroMes * 100) / 100, m.ingreso, m.fijos, m.menu != null ? m.menu : '', m.pasaje != null ? m.pasaje : ''][i]; });
    planes();

    // Gastos de hoy
    const hk = dkey(hoy), lista = $('listaHoy'); lista.textContent = '';
    const deHoy = S.gastos.filter(g => dkey(new Date(g.t)) === hk).sort((a, b) => b.t - a.t);
    if (!deHoy.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Aún no anotas nada hoy. Anota tu primer gasto en 2 toques.'; lista.append(p); }
    const ic = { Comida: '', Pasaje: '', Salidas: '', Otros: '' };
    deHoy.forEach(g => {
      const d = document.createElement('div'); d.className = 'item';
      const l = document.createElement('div'); l.textContent = g.c;
      const s = document.createElement('small'); s.textContent = new Date(g.t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (g.p || (g.y ? 'Yape' : 'Efectivo')); l.append(s);
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
    shareLink();

    $('stMsg').textContent = n >= 5 ? 'Anotaste casi todos los días.' : n >= 3 ? 'Vas bien: intenta anotar todos los días.' : 'Anota cada día para que la cifra sea exacta.';
  }

  // ---------- Navegación ----------
  let tt;
  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 1900); }
  function go(v) {
    if (!S.meta && v !== 'meta') { v = 'meta'; toast('Primero crea tu meta'); }
    ['hoy', 'meta', 'anotar', 'mes'].forEach(k => { $('v-' + k).hidden = k !== v; });
    if (v === 'meta') showStep(1);
    if (v === 'mes') { calMonth = new Date(); calMonth.setDate(1); calendar(); }
    document.querySelectorAll('nav button').forEach(b => { if (b.dataset.go === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (v === 'anotar') setTimeout(() => $('gMonto').focus(), 60);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

  // ---------- Sesión ----------
  function enter(u) {
    user = u;
    S = u.demo ? ejemplo() : store.get(dataKey(u.email), { meta: null, gastos: [] });
    S.mov = S.mov || [];
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
    openHelp();
    toast('Cuenta creada. Ahora crea tu meta.');
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


  // ---------- Metas sugeridas y planes de tiempo ----------
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('.chipb'); if (!b) return;
    document.querySelectorAll('.chipb').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('fNombre').value = b.dataset.n; $('fMonto').value = b.dataset.m; planes();
  });
  const mesTxt = d => d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  function llegada(falta, ah) { const m = Math.max(1, Math.ceil(falta / ah)); const f = new Date(); f.setMonth(f.getMonth() + m); return { m, f }; }
  // Lo básico del día (menú + pasajes) × 30 = lo que necesitas sí o sí al mes
  function nums() {
    const ing = +$('fIngreso').value, fix = +$('fFijos').value, menu = +$('fMenu').value || 0, pas = +$('fPasaje').value || 0;
    const monto = +$('fMonto').value, ya = S && S.meta ? S.meta.ahorrado : 0;
    const basico = menu + pas, basicoMes = basico * 30, posible = ing - fix - basicoMes;
    return { ing, fix, menu, pas, basico, basicoMes, posible, monto, falta: Math.max(0, monto - ya), listo: monto > 0 && $('fIngreso').value !== '' && $('fFijos').value !== '' && ($('fMenu').value !== '' || $('fPasaje').value !== '') };
  }
  function planes() {
    syncQuick();
    const n = nums();
    const listoB = $('fMenu').value !== '' || $('fPasaje').value !== '';
    $('basicoTxt').textContent = !listoB ? 'Ejemplo: menú S/ 12 + pasajes S/ 4 = S/ 16 al día.'
      : n.basico > 0 ? 'S/ ' + n.basico + ' al día × 30 = ' + sol(n.basicoMes) + ' al mes.'
      : 'Sin gasto diario en comida ni pasajes.';
    const box = $('sliderBox'), empty = $('sliderEmpty'), sl = $('fSlider');
    if (!n.listo || n.posible < 10) {
      box.hidden = true; empty.hidden = false;
      empty.textContent = !n.listo ? 'Completa los datos de arriba para calcular cuánto puedes apartar.' : 'Con estos montos no queda dinero para apartar. Revisa las sugerencias.';
      resumen(); return;
    }
    const max = Math.max(10, Math.floor(n.posible / 10) * 10);
    sl.min = 10; sl.max = max; sl.step = 10;
    let v = +$('fAhorro').value;
    if (!(v > 0) || v > max) { v = Math.min(max, Math.max(10, Math.floor(n.posible * 0.5 / 10) * 10)); $('fAhorro').value = v; }
    sl.value = Math.min(max, v);
    box.hidden = false; empty.hidden = true;
    $('sliderMax').textContent = sol(max) + ' · más rápido';
    sliderTxt();
    resumen();
  }
  function sliderTxt() {
    const n = nums(), v = +$('fAhorro').value;
    $('sliderMonto').textContent = sol(v || 0);
    if (v > 0 && n.falta > 0) { const L = llegada(n.falta, v); $('sliderMeses').textContent = 'llegas en ' + L.m + (L.m === 1 ? ' mes' : ' meses') + ' (' + mesTxt(L.f) + ')'; }
    else $('sliderMeses').textContent = '';
  }
  $('fSlider').addEventListener('input', () => { $('fAhorro').value = $('fSlider').value; sliderTxt(); resumen(); });
  function resumen() {
    const r = $('resumen'), tips = $('tips'), n = nums(), ah = +$('fAhorro').value;
    if (!n.listo) { r.hidden = true; tips.hidden = true; return; }
    r.hidden = false; r.textContent = '';
    const line = (a, b, cls) => { const p = document.createElement('p'); p.className = 'f-line' + (cls ? ' ' + cls : ''); const x = document.createElement('span'); x.textContent = a; const y = document.createElement('span'); y.textContent = b; p.append(x, y); r.append(p); };
    const lb = document.createElement('p'); lb.className = 'lbl'; lb.textContent = 'Resumen del mes'; r.append(lb);
    line('Lo que ganas', sol(n.ing)); line('− Gastos fijos', sol(n.fix)); line('− Lo básico (S/ ' + n.basico + ' × 30)', sol(n.basicoMes));
    line('= Puedes ahorrar hasta', sol(Math.max(0, n.posible)), 'total');
    const big = document.createElement('p'); big.className = 'big';
    let ajustado = n.posible < 10;
    if (ah > 0 && n.posible >= 10) {
      const extra = n.posible - ah, dia = n.basico + extra / 30;
      line('Apartas para tu meta', sol(ah));
      if (extra >= 0) {
        big.textContent = 'Para gastar: ' + sol(Math.floor(dia * 10) / 10) + ' al día (S/ ' + n.basico + ' básico + ' + sol(Math.floor(extra / 3) / 10) + ' libre)';
        const L = llegada(n.falta, ah), g = document.createElement('p'); g.className = 'goal';
        g.textContent = 'Llegas a tu meta en ' + L.m + (L.m === 1 ? ' mes' : ' meses') + ' (' + mesTxt(L.f) + ')'; r.append(g);
        if (n.basico <= 8) { const k = document.createElement('p'); k.className = 'sub'; k.style.fontSize = '13px'; k.textContent = 'Tu gasto diario es bajo: puedes subir el deslizador y llegar antes.'; r.append(k); }
      } else { big.textContent = 'Apartas ' + sol(-extra) + ' más de lo que te sobra: no te alcanzaría para comer y moverte.'; ajustado = true; }
    } else if (n.posible >= 10) { big.textContent = 'Elige un plan o escribe cuánto apartas.'; }
    else { big.textContent = 'Lo básico y tus gastos fijos ya usan todo lo que ganas.'; }
    const goal = r.querySelector('.goal'); if (goal) r.insertBefore(big, goal); else r.append(big);
    r.classList.toggle('bad', ajustado);
    tips.hidden = !ajustado; tips.textContent = '';
    if (ajustado) {
      const p = document.createElement('p'); p.innerHTML = '<b>Sugerencias para ahorrar:</b>'; tips.append(p);
      const ul = document.createElement('ul'), ideas = [];
      if (n.posible >= 10) ideas.push('Aparta como máximo ' + sol(Math.floor(n.posible / 10) * 10) + ' al mes: es lo que de verdad te sobra.');
      if (n.menu >= 10) ideas.push('Lleva táper 2 días por semana: ahorras unos ' + sol(Math.round(n.menu * 0.6 * 8)) + ' al mes en menús.');
      if (n.pas >= 4) ideas.push('Camina un tramo corto o usa una sola línea cuando puedas: S/ 1 menos al día son S/ 30 al mes.');
      ideas.push('Revisa tu plan de celular e internet: uno más barato te ahorra S/ 20 a 30 al mes.');
      ideas.push('Cancela suscripciones que casi no usas (streaming, apps, juegos).');
      ideas.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
      tips.append(ul);
    }
  }

  // Opciones rápidas: táper, caminando, vivo con mi familia
  document.querySelectorAll('.tog').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true', id = b.dataset.q === 'menu' ? 'fMenu' : 'fPasaje';
    $(id).value = on ? 0 : ''; planes(); if (!on) $(id).focus();
  }));
  function syncQuick() {
    [['menu', 'fMenu', 'lMenu'], ['pasaje', 'fPasaje', 'lPasaje']].forEach(([q, id, l]) => {
      const on = $(id).value !== '' && +$(id).value === 0;
      document.querySelector('.tog[data-q="' + q + '"]').setAttribute('aria-pressed', on);
      $(l).hidden = on;
    });
  }
  ['fMenu', 'fPasaje'].forEach(id => $(id).addEventListener('input', planes));
  ['fMonto', 'fIngreso', 'fFijos'].forEach(id => $(id).addEventListener('input', planes));
  $('fAhorro').addEventListener('input', () => { const v = +$('fAhorro').value; if (v > 0) $('fSlider').value = v; sliderTxt(); resumen(); });

  $('btnBolsaMeta').addEventListener('click', () => {
    const c = calc(); if (c.bolsa < 1) return;
    const v = Math.floor(c.bolsa * 10) / 10, dias = Math.max(1, Math.round(v / Math.max(0.01, c.ahorroDia)));
    S.mov = S.mov || []; S.mov.push({ t: Date.now(), tipo: 'meta', m: v }); S.meta.ahorrado += v;
    save(); render(); toast('+' + sol(v) + ' a tu meta · llegas ~' + dias + (dias === 1 ? ' día' : ' días') + ' antes');
  });
  $('btnBolsaHoy').addEventListener('click', () => {
    const c = calc(); if (c.bolsa < 1) return;
    const v = Math.floor(c.bolsa * 10) / 10;
    S.mov = S.mov || []; S.mov.push({ t: Date.now(), tipo: 'hoy', m: v });
    save(); render(); toast('Hoy tienes ' + sol(v) + ' extra');
  });


  // ---------- Cómo funciona ----------
  function openHelp() { $('help').hidden = false; $('help').scrollTop = 0; $('helpClose').focus(); }
  function closeHelp() { $('help').hidden = true; }
  document.querySelectorAll('[data-help]').forEach(b => b.addEventListener('click', openHelp));
  $('helpClose').onclick = closeHelp; $('helpOk').onclick = closeHelp;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('help').hidden) closeHelp(); });


  // ---------- Meta en 3 pasos ----------
  function showStep(n) {
    document.querySelectorAll('#formMeta .step').forEach(x => { x.hidden = +x.dataset.step !== n; });
    $('stepLbl').textContent = 'Paso ' + n + ' de 3'; $('stepFill').style.width = (n / 3 * 100) + '%';
    if (n === 3) planes();
  }
  document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => {
    const cur = +b.closest('.step').dataset.step, next = +b.dataset.next;
    if (next > cur) {
      const bad = Array.from(b.closest('.step').querySelectorAll('input[required]')).find(i => !i.closest('[hidden]') && !i.checkValidity());
      if (bad) { bad.reportValidity(); bad.focus(); return; }
    }
    showStep(next); $('formMeta').scrollIntoView({ block: 'start' });
  }));

  // ---------- Calendario del mes ----------
  let calMonth = new Date(); calMonth.setDate(1);
  function calendar() {
    if (!S.meta) return;
    const c = calc(), base = c.base, y = calMonth.getFullYear(), mo = calMonth.getMonth();
    const tt = calMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }); $('calTitle').textContent = tt.charAt(0).toUpperCase() + tt.slice(1);
    const porDia = {}; S.gastos.forEach(g => { const k = dkey(new Date(g.t)); porDia[k] = (porDia[k] || 0) + g.m; });
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(S.start || hoy); inicio.setHours(0, 0, 0, 0);
    const cal = $('cal'); cal.textContent = '';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => { const e = document.createElement('span'); e.className = 'dow'; e.textContent = d; cal.append(e); });
    const first = new Date(y, mo, 1), pad = (first.getDay() + 6) % 7, dias = new Date(y, mo + 1, 0).getDate();
    for (let i = 0; i < pad; i++) cal.append(document.createElement('span'));
    let gasto = 0, ahorro = 0;
    for (let d = 1; d <= dias; d++) {
      const f = new Date(y, mo, d), k = dkey(f), g = porDia[k] || 0;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'day';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = d;
      const m = document.createElement('span'); m.className = 'm';
      const activo = f >= inicio && f <= hoy;
      if (activo) {
        gasto += g;
        if (f < hoy) { ahorro += Math.max(0, base - g); b.classList.add(g <= base ? 'ok' : 'over'); }
        m.textContent = g ? 'S/ ' + Math.round(g) : '–';
      } else b.classList.add('off');
      if (f.getTime() === hoy.getTime()) b.classList.add('today');
      b.append(n, m);
      b.onclick = () => dayDetail(f, porDia[k] || 0, base, activo);
      cal.append(b);
    }
    let meta = 0; (S.mov || []).forEach(x => { const t = new Date(x.t); if (x.tipo === 'meta' && t.getFullYear() === y && t.getMonth() === mo) meta += x.m; });
    $('calGasto').textContent = sol(gasto); $('calAhorro').textContent = sol(ahorro); $('calMeta').textContent = sol(meta);
    $('calDay').hidden = true;
  }
  function dayDetail(f, total, base, activo) {
    $('calDay').hidden = false;
    $('calDayTitle').textContent = f.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) + (activo ? ' · ' + sol(total) + ' de ' + sol(base) : '');
    const l = $('calDayList'); l.textContent = '';
    const items = S.gastos.filter(g => dkey(new Date(g.t)) === dkey(f)).sort((a, b) => a.t - b.t);
    if (!items.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = activo ? 'Sin gastos anotados.' : 'Día fuera de tu registro.'; l.append(p); return; }
    items.forEach(g => { const d = document.createElement('div'); d.className = 'item'; const a = document.createElement('div'); a.textContent = g.c; const s = document.createElement('small'); s.textContent = new Date(g.t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (g.p || (g.y ? 'Yape' : 'Efectivo')); a.append(s); const v = document.createElement('b'); v.textContent = sol(g.m); d.append(a, v); l.append(d); });
  }
  $('calPrev').onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); calendar(); };
  $('calNext').onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); calendar(); };


  // ---------- Prueba: resumen + respuestas por WhatsApp ----------
  const resp = {};
  document.querySelectorAll('.qq').forEach(q => q.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    q.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); resp[q.dataset.k] = b.textContent; shareLink();
  })));
  $('q7').addEventListener('input', shareLink);
  function shareLink() {
    if (!S || !S.meta) return;
    const m = S.meta, c = calc(), hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(S.start || Date.now()); inicio.setHours(0, 0, 0, 0);
    const soloHoy = inicio.getTime() >= hoy.getTime();
    const desde = soloHoy ? hoy.getTime() : hoy.getTime() - 6 * 86400000;
    const sel = S.gastos.filter(g => g.t >= desde), total = sel.reduce((a, g) => a + g.m, 0);
    const dias = new Set(sel.map(g => dkey(new Date(g.t)))).size;
    const pagos = {}; sel.forEach(g => { const p = g.p || (g.y ? 'Yape' : 'Efectivo'); pagos[p] = (pagos[p] || 0) + 1; });
    const pTxt = Object.keys(pagos).length ? Object.entries(pagos).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round(v / sel.length * 100) + '%').join(', ') : 'sin gastos';
    const r = k => resp[k] || '-';
    const lines = [
      'Hola Gustavo, ' + (soloHoy ? 'mi día con Codito' : 'mi semana con Codito') + ':',
      soloHoy ? '- Límite de hoy: ' + sol(Math.max(0, c.diario)) + ' | gasté: ' + sol(c.hoyG) : '- Días que anoté: ' + dias + ' de 7',
      '- Gastos anotados: ' + sel.length + ' (total ' + sol(total) + ')',
      '- Cómo pagué: ' + pTxt,
      '- Meta: ' + m.nombre + ' (' + sol(m.monto) + ') | aparto ' + sol(c.ahorroMes) + ' al mes',
      '',
      'Mis respuestas:',
      '1. Entendí "Hoy puedes gastar": ' + r('q1'),
      '2. Anoté en menos de 10 s: ' + r('q2'),
      '3. Me hizo pensar antes de gastar: ' + r('q3'),
      '4. La usaría un mes: ' + r('q4'),
      '5. Pagaría S/ 4.90: ' + r('q5'),
      '6. Facilidad (1-5): ' + r('q6'),
      '7. Cambiaría: ' + ($('q7').value.trim() || '-')
    ];
    $('btnShare').href = 'https://wa.me/?text=' + encodeURIComponent(lines.join('\n'));
    $('testCard').hidden = !!user.demo;
  }

  // ---------- Acciones ----------
  let cat = 'Comida', pay = 'Yape';
  $('pays').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pay = b.dataset.p; document.querySelectorAll('#pays button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('cats').addEventListener('click', e => { const b = e.target.closest('.cat'); if (!b) return; cat = b.dataset.cat; document.querySelectorAll('.cat').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('formGasto').addEventListener('submit', e => {
    e.preventDefault(); const m = parseFloat($('gMonto').value); if (!(m > 0)) return;
    S.gastos.push({ id: uid(), t: Date.now(), m, c: cat, p: pay, y: pay === 'Yape' });
    save(); $('gMonto').value = ''; render(); go('hoy'); toast('Gasto anotado');
  });
  $('formMeta').addEventListener('submit', e => {
    e.preventDefault();
    const nuevo = !S.meta;
    if (nuevo || !S.start) S.start = Date.now();
    S.meta = { nombre: $('fNombre').value.trim(), monto: +$('fMonto').value, ahorroMes: +$('fAhorro').value, ingreso: +$('fIngreso').value, fijos: +$('fFijos').value, menu: +$('fMenu').value || 0, pasaje: +$('fPasaje').value || 0, ahorrado: S.meta ? S.meta.ahorrado : 0 };
    save(); render(); go('hoy'); toast(nuevo ? 'Meta creada' : 'Meta actualizada');
  });
  $('btnAporte').addEventListener('click', () => {
    const v = parseFloat($('aporte').value); if (!(v > 0)) return;
    S.meta.ahorrado += v; save(); $('aporte').value = ''; render(); toast('+' + sol(v) + ' para tu meta');
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
