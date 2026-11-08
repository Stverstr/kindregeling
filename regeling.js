/* ================================================================
   regeling.js — Kindregeling Stijn & Marlies (Robbe & Lore)
   Enige bron van de regeling: basisregel, uitzonderingen, info-events,
   feestdagen en het log. Wordt geladen door:
     - kindregeling/index.html (site voor Stijn & Marlies)
     - planning/index.html (persoonlijke planning van Stijn), via
       https://stverstr.github.io/kindregeling/regeling.js
   Alles is bewust globaal (geen modules), zodat beide pagina's het
   zonder build-stap kunnen gebruiken.
   ================================================================ */

/* ============ SCHEDULE ENGINE ============ */
const CUTOVER = new Date(2027,0,4); // maandag 4 jan 2027 — nieuwe regeling start

// Uitzonderingen op de basisregel (chronologisch). Datums als 'YYYY-MM-DD' (inclusief).
// Elke entry zegt enkel WIE de kinderen die dagen heeft. Of dat "volgens regeling" of "afwijkend"
// is, wordt automatisch bepaald door te vergelijken met de berekende basisregel (zie dayInfo).
const EXCEPTIONS = [
  // Zomerplanning 2026 (definitief, gecorrigeerd)
  {start:'2026-07-06', end:'2026-07-15', who:'marlies', label:'✈️ Op reis met mama'},
  {start:'2026-07-16', end:'2026-07-19', who:'stijn'},
  {start:'2026-07-20', end:'2026-07-23', who:'marlies'},
  {start:'2026-07-24', end:'2026-07-24', who:'marlies', label:'🌙 ’s Avonds naar papa'},
  {start:'2026-07-25', end:'2026-08-02', who:'stijn', label:'✈️ Op reis met papa'},
  {start:'2026-08-03', end:'2026-08-14', who:'marlies'},
  {start:'2026-08-15', end:'2026-08-16', who:'stijn'},
  {start:'2026-08-17', end:'2026-08-23', who:'marlies'},
  // Kerst 2026 — skivakantie St. Anton, verschoven naar 18 t/m 27 december (afgesproken).
  // 18-20 dec valt sowieso in de week van papa (oneven week, oude regeling), dus geen afwijking.
  {start:'2026-12-18', end:'2026-12-18', who:'stijn', label:'🚂 Vertrek trein'},
  {start:'2026-12-19', end:'2026-12-19', who:'stijn', label:'⛷️ St. Anton'},
  {start:'2026-12-20', end:'2026-12-20', who:'stijn', label:'⛷️'},
  {start:'2026-12-21', end:'2026-12-21', who:'stijn', label:'⛷️'},
  {start:'2026-12-22', end:'2026-12-22', who:'stijn', label:'⛷️'},
  {start:'2026-12-23', end:'2026-12-23', who:'stijn', label:'⛷️'},
  {start:'2026-12-24', end:'2026-12-24', who:'stijn', label:'🎄 ½ dag ski'},
  {start:'2026-12-25', end:'2026-12-25', who:'stijn', label:'🎅 Kerstdag'},
  {start:'2026-12-26', end:'2026-12-26', who:'stijn', label:'⛷️'},
  {start:'2026-12-27', end:'2026-12-27', who:'stijn', label:'🚂 Terug'},
  // Wissel terug: 28-30 december naar mama (papa kreeg 18-20 dec) — daarna loopt oud & nieuw
  // en de oneven week van januari door, samen 2 weken bij mama (28 dec t/m 10 jan).
  {start:'2026-12-28', end:'2026-12-30', who:'marlies', label:'Wissel terug'},
  // Oudjaar/nieuwjaar 2026 — contractuele regel per kalenderjaar (even jaar → moeder)
  {start:'2026-12-31', end:'2027-01-03', who:'marlies', label:'🥂 Oud &amp; nieuw'},
  // Weekendwissel jan 2027 (op vraag van Marlies)
  {start:'2027-01-15', end:'2027-01-17', who:'marlies', label:'Gevraagd weekend'},
  {start:'2027-01-22', end:'2027-01-24', who:'stijn', label:'Wissel terug'},
  // Herfstvakantie 2026 (2-8 nov): vrijdag vóór start (30/10) → even-rol → Marlies tot woe 12u
  {start:'2026-11-02', end:'2026-11-04', who:'marlies', label:'Herfstvakantie-regel (tot woe 12u)'},
  // Krokusvakantie 2027 (8-14 feb): vrijdag vóór start (5/2) → oneven-rol (nieuwe regeling = Marlies) tot woe 12u
  {start:'2027-02-08', end:'2027-02-10', who:'marlies', label:'Krokusvakantie-regel (tot woe 12u)'},
  // Fietsreis papa juni 2027 — de bredere vrijdagwissels zijn niet bevestigd door Marlies en
  // teruggedraaid (beslissing 4 aug 2026). Enkel het weekend 5-6 juni is bij mama (definitief);
  // die 2 dagen staan nog te goed voor Stijn — wissel terug later in 2027, datum af te spreken.
  {start:'2027-06-04', end:'2027-06-04', who:'stijn', label:'🌙 ’s Avonds naar mama'},
  {start:'2027-06-05', end:'2027-06-06', who:'marlies', label:'Wissel (2 dagen te goed voor papa)'},
  // Weekendwissel juli 2027 (op vraag van Marlies)
  {start:'2027-07-02', end:'2027-07-04', who:'marlies', label:'Gevraagd weekend'},
  {start:'2027-07-09', end:'2027-07-11', who:'stijn', label:'Wissel terug'},
  // Kerst/nieuwjaar 2027 (oneven jaar): kerst → moeder, oudjaar/nieuwjaar → vader
  {start:'2027-12-24', end:'2027-12-24', who:'marlies', label:'🎄 Kerstavond'},
  {start:'2027-12-25', end:'2027-12-25', who:'marlies', label:'🎅 Kerstdag'},
  {start:'2027-12-31', end:'2028-01-02', who:'stijn', label:'🥂 Oud &amp; nieuw'},
  // Herfstvakantie 2027 (1-7 nov): vrijdag vóór start (29/10) → even-rol → Marlies tot woe 12u
  {start:'2027-11-01', end:'2027-11-03', who:'marlies', label:'Herfstvakantie-regel (tot woe 12u)'},
  // Krokusvakantie 2028 (28 feb-5 mrt): vrijdag vóór start (25/2) → oneven-rol → Stijn tot woe 12u
  {start:'2028-02-28', end:'2028-03-01', who:'stijn', label:'Krokusvakantie-regel (tot woe 12u)'},
  // Kerst/nieuwjaar 2028 (even jaar): kerst → vader, oudjaar/nieuwjaar → moeder
  {start:'2028-12-24', end:'2028-12-24', who:'stijn', label:'🎄 Kerstavond'},
  {start:'2028-12-25', end:'2028-12-25', who:'stijn', label:'🎅 Kerstdag'},
  {start:'2028-12-31', end:'2029-01-02', who:'marlies', label:'🥂 Oud &amp; nieuw'},
  // Herfstvakantie 2028 (30 okt-5 nov): vrijdag vóór start (27/10) → even-rol → Marlies tot woe 12u
  {start:'2028-10-30', end:'2028-11-01', who:'marlies', label:'Herfstvakantie-regel (tot woe 12u)'},
  // Krokusvakantie 2029 (12-18 feb): vrijdag vóór start (9/2) → oneven-rol → Stijn tot woe 12u
  {start:'2029-02-12', end:'2029-02-14', who:'stijn', label:'Krokusvakantie-regel (tot woe 12u)'},
  // Kerst/nieuwjaar 2029 (oneven jaar): kerst → moeder, oudjaar/nieuwjaar → vader
  {start:'2029-12-24', end:'2029-12-24', who:'marlies', label:'🎄 Kerstavond'},
  {start:'2029-12-25', end:'2029-12-25', who:'marlies', label:'🎅 Kerstdag'},
  {start:'2029-12-31', end:'2030-01-02', who:'stijn', label:'🥂 Oud &amp; nieuw'},
  // Herfstvakantie 2029 (29 okt-4 nov): vrijdag vóór start (26/10) → even-rol → Marlies tot woe 12u
  {start:'2029-10-29', end:'2029-10-31', who:'marlies', label:'Herfstvakantie-regel (tot woe 12u)'},
  // Krokusvakantie 2030 (4-10 mrt): vrijdag vóór start (1/3) → even-rol → Marlies tot woe 12u
  {start:'2030-03-04', end:'2030-03-06', who:'marlies', label:'Krokusvakantie-regel (tot woe 12u)'},
  // --- Vanaf hier (schooljaar 2030-2031) zijn de vakantiedata BEREKEND volgens de wettelijke
  // regel (Besluit Vlaamse Regering 31/08/2001, art. 7 / Besluit 17/04/1991, art. 4), niet
  // (nog) officieel gepubliceerd door de Vlaamse overheid (vlaanderen.be publiceert momenteel
  // t.e.m. schooljaar 2029-2030). De regel is geverifieerd tegen alle jaren hierboven (2026-2030)
  // en klopte exact, dus de kans op afwijking is klein — maar herbevestig zodra officieel bekend.
  // Kerst/nieuwjaar 2030-2031 (kerstvakantie 23 dec 2030 - 5 jan 2031): 2030 = even jaar
  // → kerst (24-25 dec) → vader, oudjaar/nieuwjaar (31 dec-2 jan) → moeder
  {start:'2030-12-24', end:'2030-12-24', who:'stijn', label:'🎄 Kerstavond'},
  {start:'2030-12-25', end:'2030-12-25', who:'stijn', label:'🎅 Kerstdag'},
  {start:'2030-12-31', end:'2031-01-02', who:'marlies', label:'🥂 Oud &amp; nieuw'},
  // Herfstvakantie 2030 (28 okt-3 nov): vrijdag vóór start (25/10) → Marlies tot woe 12u
  {start:'2030-10-28', end:'2030-10-30', who:'marlies', label:'Herfstvakantie-regel (tot woe 12u)'},
  // Krokusvakantie 2031 (24 feb-2 mrt): vrijdag vóór start (21/2) → Stijn tot woe 12u
  {start:'2031-02-24', end:'2031-02-26', who:'stijn', label:'Krokusvakantie-regel (tot woe 12u)'},
  // Herfstvakantie 2031 (27 okt-2 nov): vrijdag vóór start (24/10) → Marlies tot woe 12u
  {start:'2031-10-27', end:'2031-10-29', who:'marlies', label:'Herfstvakantie-regel (tot woe 12u)'},
  // Kerst/nieuwjaar 2031 (enkel het december-deel valt nog binnen de tijdlijn t.e.m. 2031):
  // 2031 = oneven jaar → kerst → moeder, oudjaar/nieuwjaar → vader
  {start:'2031-12-24', end:'2031-12-24', who:'marlies', label:'🎄 Kerstavond'},
  {start:'2031-12-25', end:'2031-12-25', who:'marlies', label:'🎅 Kerstdag'},
  {start:'2031-12-31', end:'2032-01-02', who:'stijn', label:'🥂 Oud &amp; nieuw'},
];
// Let op: herfst/krokus/kerst zijn ingevuld t.e.m. eind 2031. T.e.m. schooljaar 2029-2030 zijn
// dit officiële data (vlaanderen.be); vanaf schooljaar 2030-2031 zijn dit berekende data volgens
// de wettelijke regel (zie toelichting hierboven). Zodra de Vlaamse overheid nieuwe schooljaren
// publiceert, of als de tijdlijn ooit verder dan 2031 moet lopen, vraag Stijn me dit aan te vullen/verifiëren.

// Info-labels: wijzigen NIET wie de kinderen heeft, tonen enkel extra context (kampen, vakanties).
// Elke entry heeft een icoon (klein badge op elke dag in de periode) en een titel (tooltip/naam).
const INFO_EVENTS = [
  {start:'2026-08-08', end:'2026-08-13', icon:'🤸', title:'Lore op turnkamp'},
  {start:'2026-11-02', end:'2026-11-08', icon:'🍂', title:'Herfstvakantie'},
  {start:'2026-12-21', end:'2027-01-03', icon:'🎄', title:'Kerstvakantie'},
  {start:'2027-02-08', end:'2027-02-14', icon:'💠', title:'Krokusvakantie'},
  {start:'2027-03-29', end:'2027-04-11', icon:'🐣', title:'Paasvakantie'},
  {start:'2027-06-05', end:'2027-06-12', icon:'🚴', title:'Fietsreis papa'},
  {start:'2027-11-01', end:'2027-11-07', icon:'🍂', title:'Herfstvakantie'},
  {start:'2027-12-27', end:'2028-01-09', icon:'🎄', title:'Kerstvakantie'},
  {start:'2028-02-28', end:'2028-03-05', icon:'💠', title:'Krokusvakantie'},
  {start:'2028-04-03', end:'2028-04-16', icon:'🐣', title:'Paasvakantie'},
  {start:'2028-10-30', end:'2028-11-05', icon:'🍂', title:'Herfstvakantie'},
  {start:'2028-12-25', end:'2029-01-07', icon:'🎄', title:'Kerstvakantie'},
  {start:'2029-02-12', end:'2029-02-18', icon:'💠', title:'Krokusvakantie'},
  {start:'2029-04-02', end:'2029-04-15', icon:'🐣', title:'Paasvakantie'},
  {start:'2029-10-29', end:'2029-11-04', icon:'🍂', title:'Herfstvakantie'},
  {start:'2029-12-24', end:'2030-01-06', icon:'🎄', title:'Kerstvakantie'},
  {start:'2030-03-04', end:'2030-03-10', icon:'💠', title:'Krokusvakantie'},
  {start:'2030-04-08', end:'2030-04-21', icon:'🐣', title:'Paasvakantie'},
  {start:'2030-10-28', end:'2030-11-03', icon:'🍂', title:'Herfstvakantie'},
  {start:'2030-12-23', end:'2031-01-05', icon:'🎄', title:'Kerstvakantie'},
  {start:'2031-02-24', end:'2031-03-02', icon:'💠', title:'Krokusvakantie'},
  {start:'2031-04-07', end:'2031-04-20', icon:'🐣', title:'Paasvakantie'},
  {start:'2031-10-27', end:'2031-11-02', icon:'🍂', title:'Herfstvakantie'},
  {start:'2031-12-22', end:'2032-01-04', icon:'🎄', title:'Kerstvakantie'},
];
// Let op: paasvakantie 2026-2030 zijn officiële data (vlaanderen.be); 2031 is berekend volgens
// de wettelijke regel (Besluit Vlaamse Regering, art. paasvakantie) en geverifieerd tegen de
// officiële jaren — nog niet officieel gepubliceerd. Zelfde voorbehoud als bij herfst/krokus/kerst 2030-2031.

// Losse feestdagen: enkel decoratief icoon, géén invloed op wie de kinderen heeft.
const HOLIDAYS = [
  {date:'2026-01-01', icon:'🎆', title:'Nieuwjaar'},
  {date:'2026-04-05', icon:'🐰', title:'Pasen'},
  {date:'2027-01-01', icon:'🎆', title:'Nieuwjaar'},
  {date:'2027-03-28', icon:'🐰', title:'Pasen'},
  {date:'2028-01-01', icon:'🎆', title:'Nieuwjaar'},
  {date:'2028-04-16', icon:'🐰', title:'Pasen'},
  {date:'2029-01-01', icon:'🎆', title:'Nieuwjaar'},
  {date:'2029-04-01', icon:'🐰', title:'Pasen'},
  {date:'2030-01-01', icon:'🎆', title:'Nieuwjaar'},
  {date:'2030-04-21', icon:'🐰', title:'Pasen'},
  {date:'2031-01-01', icon:'🎆', title:'Nieuwjaar'},
  {date:'2031-04-13', icon:'🐰', title:'Pasen'},
];

function fmt(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function mondayOf(d){ const dt=new Date(d); const day=(dt.getDay()+6)%7; dt.setDate(dt.getDate()-day); dt.setHours(0,0,0,0); return dt; }
function isoWeekNum(d){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum=(t.getUTCDay()+6)%7;
  t.setUTCDate(t.getUTCDate()-dayNum+3);
  const firstThursday=new Date(Date.UTC(t.getUTCFullYear(),0,4));
  const diff=(t-firstThursday)/86400000;
  return 1+Math.round(diff/7);
}
function baseParent(date){
  const monday=mondayOf(date);
  const wk=isoWeekNum(date);
  const isEven=(wk%2===0);
  if(monday<CUTOVER) return isEven?'marlies':'stijn';
  return isEven?'stijn':'marlies';
}
function findException(iso){
  for(const ex of EXCEPTIONS){ if(iso>=ex.start && iso<=ex.end) return ex; }
  return null;
}
function findInfoEvents(iso){
  return INFO_EVENTS.filter(ev=> iso>=ev.start && iso<=ev.end).map(ev=>({icon:ev.icon, title:ev.title}));
}
function findHolidays(iso){
  return HOLIDAYS.filter(h=> h.date===iso).map(h=>({icon:h.icon, title:h.title}));
}
function dayInfo(date){
  const iso=fmt(date);
  const ex=findException(iso);
  const badges=[...findInfoEvents(iso), ...findHolidays(iso)];
  const def=baseParent(date);
  const who = ex ? ex.who : def;
  const afwijkend = ex ? (ex.who !== def) : false;
  const label = ex ? (ex.label||'') : '';
  return {who, afwijkend, label, badges};
}
function cssClass(info){
  return info.who + (info.afwijkend ? '-afwijking' : '-normaal');
}

/* ============ LOG ============ */
const LOG = [
  {
    date:'2026-07-06',
    title:'Zomerplanning 2026',
    q:'Gezamenlijke planning van de zomervakantie, met eigen data los van de gewone weekregeling.',
    a:'Bij papa tot en met 5 juli. Mama reist met Robbe en Lore (6–15 juli). Bij papa (16–19 juli). Bij mama (20–24 juli); op 24 juli komen Robbe en Lore ’s avonds al naar papa. Papa reist met Robbe en Lore van 25 juli tot 2 augustus. Bij mama, incl. turnkamp van Lore (3–14 augustus). Bij papa (15–16 augustus). Bij mama (17–23 augustus).'
  },
  {
    date:'2026-12-18',
    title:'Skivakantie kerst 2026 — nieuwe data (18–27 december)',
    q:'Vraag van Stijn: samen met Robbe en Lore op skivakantie tijdens de kerstvakantie. De timing van de skireis is gewijzigd: de reis loopt nu van 18 tot en met 27 december 2026, in plaats van 21 tot en met 27 december. Eerder was afgesproken dat het weekend van 18–20 december bij mama zou zijn.',
    a:'Robbe en Lore blijven bij papa van vrijdag 18 tot en met zondag 27 december 2026 (skireis St. Anton). Het weekend van 18–20 december gaat dus niet meer naar mama. Vanaf maandag 28 december zijn de kinderen twee weken bij mama: 28 december tot en met 10 januari 2027 (28–30 december als wissel terug, daarna oud &amp; nieuw en de oneven week van januari). Netto blijft alles in evenwicht: papa krijgt 3 dagen extra (18–20 december) en geeft er 3 terug (28–30 december). Vanaf maandag 11 januari 2027 loopt de gewone regeling weer.',
    viz:{ weeks:['2026-12-14','2026-12-21','2026-12-28'] }
  },
  {
    date:'2027-01-04',
    title:'Omwisseling even/oneven weken',
    q:'Vraag van Marlies: de even en oneven weken omwisselen.',
    a:'Vanaf maandag 4 januari 2027: even week bij Stijn, oneven week bij Marlies.'
  },
  {
    date:'2027-01-15',
    title:'Weekendwissel januari 2027',
    q:'Vraag van Marlies: het weekend van 15–17 januari 2027.',
    a:'Gewisseld: Marlies neemt dit weekend, Stijn het weekend van 22–24 januari 2027.'
  },
  {
    date:'2027-07-02',
    title:'Weekendwissel juli 2027',
    q:'Vraag van Marlies: het weekend van 2–4 juli 2027.',
    a:'Gewisseld: Marlies neemt dit weekend, Stijn het weekend van 9–11 juli 2027.'
  },
  {
    date:'2027-06-05',
    title:'Fietsreis papa — weekend 5–6 juni 2027 naar mama',
    q:'Vraag van Stijn: van zaterdag 5 tot zaterdag 12 juni 2027 op fietsreis. Het weekend van 5–6 juni valt in zijn week; de week van 7–13 juni is sowieso bij mama. Eerder stond hier een voorstel met vrijdagwissels van 4 juni tot 9 juli.',
    a:'Beslist op 4 augustus 2026: de voorgestelde vrijdagwissels zijn niet bevestigd door Marlies en zijn teruggedraaid — vanaf maandag 7 juni geldt gewoon weer de normale weekregeling. Enkel het weekend van 5–6 juni gaat naar mama; de kinderen gaan op vrijdagavond 4 juni al naar mama. Die 2 dagen staan daarmee nog te goed voor Stijn: een wissel terug volgt later in 2027, datum nog samen af te spreken.',
    viz:{ weeks:['2027-05-31'] }
  },
];

/* ============ EXPORT VOOR ANDERE PAGINA'S ============ */
// Beschrijvend object voor de planning-site. dayInfo(date) geeft
// {who:'stijn'|'marlies', afwijkend:bool, label:string, badges:[...]}.
window.KINDREGELING = {
  id: 'robbe-lore',
  label: 'Robbe & Lore',
  parents: {
    stijn:   { label: 'Stijn',   bg: '#dbeafe', bgAfwijking: '#93c5fd', border: '#2563eb', text: '#1e3a8a' },
    marlies: { label: 'Marlies', bg: '#fce7f3', bgAfwijking: '#f9a8d4', border: '#db2777', text: '#831843' },
  },
  cutover: CUTOVER,
  dayInfo, baseParent, cssClass,
};
