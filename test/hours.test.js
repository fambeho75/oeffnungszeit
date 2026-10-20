"use strict";

const fs = require("fs");
const path = require("path");
const hours = require(path.join(__dirname, "..", "hours.js"));
const theme = require(path.join(__dirname, "..", "theme.js"));
const catalog = require(path.join(__dirname, "..", "places.json"));

let failed = 0;
let passed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error("FAIL", msg);
}

function sameSlots(actual, open, close) {
  assert(Array.isArray(actual) && actual.length === 1, `expected one span, got ${JSON.stringify(actual)}`);
  if (!Array.isArray(actual) || !actual[0]) return;
  assert(actual[0].open === open && actual[0].close === close, `expected ${open}–${close}, got ${actual[0].open}–${actual[0].close}`);
}

function byId(id) {
  return catalog.places.find((place) => place.id === id);
}

function partsAt(iso, ymd, key, hhmm) {
  const parts = hours.stockholmParts(new Date(iso));
  const [h, m] = hhmm.split(":").map(Number);
  assert(parts.ymd === ymd, `${iso} date ${parts.ymd} !== ${ymd}`);
  assert(parts.key === key, `${iso} weekday ${parts.key} !== ${key}`);
  assert(parts.minutes === h * 60 + m, `${iso} minutes ${parts.minutes} !== ${hhmm}`);
}

assert(hours.TZ === "Europe/Stockholm", "timezone constant");
assert(catalog.timezone === "Europe/Stockholm", "catalog timezone");
assert(catalog.updated === "2026-10-19", "catalog updated date");
assert(catalog.places.length === 11, "eleven shipped places");
assert(
  JSON.stringify(catalog.places.map((place) => place.id)) ===
    JSON.stringify(["soptippen", "coop-vipan", "stora-coop", "ica-maxi", "lidl", "willys", "biltema", "swedbank", "systembolaget", "systembolaget-nolhaga", "spice-n-rice"]),
  "place order"
);

catalog.places.forEach((place) => {
  assert(!place.placeId, `${place.id} must not invent a Google place id`);
  assert(place.website && place.website.startsWith("https://"), `${place.id} website`);
  hours.WEEKDAYS.forEach((day) => {
    assert(Object.prototype.hasOwnProperty.call(place.hours, day.key), `${place.id} missing ${day.key}`);
  });
});

assert(byId("soptippen").id === "soptippen", "soptippen id stays stable");
assert(byId("soptippen").name === "Risängen", "soptippen name");
assert(byId("soptippen").address === "Komponentvägen, 541 34 Skövde", "soptippen address");
assert(byId("soptippen").source === "avfallskaraborg.se", "soptippen source");
assert(byId("ica-maxi").name === "ICA Maxi Skövde" && byId("ica-maxi").source === "ica.se", "ica name and source");
assert(byId("biltema").address === "Norra Metallvägen 4, 549 37 Skövde", "biltema address");
assert(byId("biltema").source === "biltema.se", "biltema source");
assert(byId("coop-vipan") && byId("stora-coop"), "both coops shipped");

const soptippen = byId("soptippen");
sameSlots(soptippen.hours.mon, "07:00", "19:00");
sameSlots(soptippen.hours.tue, "07:00", "16:30");
sameSlots(soptippen.hours.wed, "07:00", "16:30");
sameSlots(soptippen.hours.thu, "07:00", "19:00");
sameSlots(soptippen.hours.fri, "07:00", "16:30");
sameSlots(soptippen.hours.sat, "08:30", "14:00");
assert(soptippen.hours.sun === "closed", "soptippen sunday");

hours.WEEKDAYS.forEach((day) => {
  sameSlots(byId("coop-vipan").hours[day.key], "06:00", "23:00");
  sameSlots(byId("stora-coop").hours[day.key], "07:00", "22:00");
  sameSlots(byId("ica-maxi").hours[day.key], "07:00", "22:00");
});

const lidl = byId("lidl");
assert(lidl.provisional === true, "lidl provisional");
assert(lidl.name === "Lidl Skövde", "lidl name");
assert(lidl.address === "Gesällgatan 3, 541 50 Skövde", "lidl address");
hours.WEEKDAYS.slice(0, 5).forEach((day) => sameSlots(lidl.hours[day.key], "08:00", "21:00"));
sameSlots(lidl.hours.sat, "08:00", "20:00");
sameSlots(lidl.hours.sun, "09:00", "20:00");

const willys = byId("willys");
assert(willys.name === "Willys Skövde", "willys name");
assert(willys.address === "Jonstorpsgatan 25, 541 66 Skövde", "willys address");
assert(willys.source === "willys.se", "willys source");
hours.WEEKDAYS.forEach((day) => sameSlots(willys.hours[day.key], "08:00", "21:00"));
assert(hours.statusAt(willys, new Date("2026-10-19T05:59:00Z")) === "closed", "willys before 08:00");
assert(hours.statusAt(willys, new Date("2026-10-19T06:00:00Z")) === "open", "willys opens 08:00");
assert(hours.statusAt(willys, new Date("2026-10-19T18:59:00Z")) === "open", "willys 20:59");
assert(hours.statusAt(willys, new Date("2026-10-19T19:00:00Z")) === "closed", "willys closes 21:00");
assert(hours.statusAt(willys, new Date("2026-12-24T12:59:00Z")) === "open", "willys Julafton 13:59");
assert(hours.statusAt(willys, new Date("2026-12-24T13:00:00Z")) === "closed", "willys Julafton closes 14:00");
assert(hours.statusAt(willys, new Date("2026-12-31T17:59:00Z")) === "open", "willys Nyårsafton 18:59");
assert(hours.statusAt(willys, new Date("2026-12-31T18:00:00Z")) === "closed", "willys Nyårsafton closes 19:00");
assert(hours.statusAt(willys, new Date("2027-01-01T07:59:00Z")) === "closed", "willys Nyårsdagen before 09:00");
assert(hours.statusAt(willys, new Date("2027-01-01T08:00:00Z")) === "open", "willys Nyårsdagen 09:00");
assert(hours.resolveDay(willys, new Date("2026-10-31T08:00:00Z")).label === "Alla helgons dag", "willys holiday label");

const biltema = byId("biltema");
hours.WEEKDAYS.slice(0, 5).forEach((day) => sameSlots(biltema.hours[day.key], "07:00", "20:00"));
sameSlots(biltema.hours.sat, "09:00", "18:00");
sameSlots(biltema.hours.sun, "09:00", "18:00");

const swedbank = byId("swedbank");
assert(swedbank.name === "Swedbank Skövde", "swedbank name");
assert(swedbank.address === "Storgatan 15, 541 30 Skövde", "swedbank address");
assert(swedbank.source === "swedbank.se", "swedbank source");
assert(swedbank.provisional !== true, "swedbank hours are from the branch record");
["mon", "tue", "wed"].forEach((key) => sameSlots(swedbank.hours[key], "13:00", "16:00"));
sameSlots(swedbank.hours.thu, "13:00", "17:00");
sameSlots(swedbank.hours.fri, "13:00", "15:00");
assert(swedbank.hours.sat === "closed" && swedbank.hours.sun === "closed", "swedbank weekend");
assert(hours.statusAt(swedbank, new Date("2026-10-19T10:59:00Z")) === "closed", "swedbank before 13:00");
assert(hours.statusAt(swedbank, new Date("2026-10-19T11:00:00Z")) === "open", "swedbank opens 13:00");
assert(hours.statusAt(swedbank, new Date("2026-10-19T13:59:00Z")) === "open", "swedbank Monday 15:59");
assert(hours.statusAt(swedbank, new Date("2026-10-19T14:00:00Z")) === "closed", "swedbank Monday closes 16:00");
assert(hours.statusAt(swedbank, new Date("2026-10-22T14:59:00Z")) === "open", "swedbank Thursday 16:59");
assert(hours.statusAt(swedbank, new Date("2026-10-22T15:00:00Z")) === "closed", "swedbank Thursday closes 17:00");
assert(hours.statusAt(swedbank, new Date("2026-10-23T12:59:00Z")) === "open", "swedbank Friday 14:59");
assert(hours.statusAt(swedbank, new Date("2026-10-23T13:00:00Z")) === "closed", "swedbank Friday closes 15:00");
assert(hours.statusAt(swedbank, new Date("2026-10-24T10:00:00Z")) === "closed", "swedbank Saturday");
assert(hours.todayLine(swedbank, new Date("2026-10-19T11:00:00Z")) === "13:00–16:00", "swedbank today line");
assert(hours.statusAt(swedbank, new Date("2026-10-30T11:00:00Z")) === "closed", "swedbank closed the day before Alla helgons dag");
assert(hours.resolveDay(swedbank, new Date("2026-10-30T11:00:00Z")).label === "Dag före alla helgons dag", "swedbank eve label");
assert(hours.statusAt(swedbank, new Date("2027-01-05T12:00:00Z")) === "closed", "swedbank Trettondagsafton");
assert(hours.statusAt(swedbank, new Date("2027-05-05T12:00:00Z")) === "closed", "swedbank day before Kristi himmelsfärd");
assert(hours.statusAt(swedbank, new Date("2027-06-25T12:00:00Z")) === "closed", "swedbank Midsommarafton");
const swedbankDates = new Set(swedbank.exceptions.map((ex) => ex.date));
["2026-10-30", "2026-10-31", "2026-12-24", "2026-12-31", "2027-01-01", "2027-01-05", "2027-01-06", "2027-03-25", "2027-03-28", "2027-04-30", "2027-05-01", "2027-05-05", "2027-05-06", "2027-06-06", "2027-06-25", "2027-06-26", "2027-11-05", "2027-11-06", "2027-12-24", "2027-12-31"].forEach((date) => {
  assert(swedbankDates.has(date), `swedbank closed ${date}`);
});
assert(!swedbankDates.has("2026-01-01"), "past Nyårsdagen is not repeated");
assert(swedbank.exceptions.every((ex) => ex.hours === "closed"), "swedbank exceptions are closed");

const systembolaget = byId("systembolaget");
assert(systembolaget.name === "Systembolaget Centrum", "systembolaget name");
assert(systembolaget.address === "Hertig Johans Torg 4, 541 30 Skövde", "systembolaget address");
assert(systembolaget.source === "systembolaget.se", "systembolaget source");
["mon", "tue", "wed", "thu"].forEach((key) => sameSlots(systembolaget.hours[key], "10:00", "18:00"));
sameSlots(systembolaget.hours.fri, "10:00", "19:00");
sameSlots(systembolaget.hours.sat, "10:00", "15:00");
assert(systembolaget.hours.sun === "closed", "systembolaget sunday");
assert(hours.statusAt(systembolaget, new Date("2026-10-19T07:59:00Z")) === "closed", "systembolaget before 10:00");
assert(hours.statusAt(systembolaget, new Date("2026-10-19T08:00:00Z")) === "open", "systembolaget opens 10:00");
assert(hours.statusAt(systembolaget, new Date("2026-10-19T15:59:00Z")) === "open", "systembolaget Monday 17:59");
assert(hours.statusAt(systembolaget, new Date("2026-10-19T16:00:00Z")) === "closed", "systembolaget Monday closes 18:00");
assert(hours.statusAt(systembolaget, new Date("2026-10-23T16:59:00Z")) === "open", "systembolaget Friday 18:59");
assert(hours.statusAt(systembolaget, new Date("2026-10-23T17:00:00Z")) === "closed", "systembolaget Friday closes 19:00");
assert(hours.statusAt(systembolaget, new Date("2026-10-24T12:59:00Z")) === "open", "systembolaget Saturday 14:59");
assert(hours.statusAt(systembolaget, new Date("2026-10-24T13:00:00Z")) === "closed", "systembolaget Saturday closes 15:00");
assert(hours.statusAt(systembolaget, new Date("2026-10-25T08:00:00Z")) === "closed", "systembolaget Sunday");
assert(hours.statusAt(systembolaget, new Date("2026-10-31T08:00:00Z")) === "closed", "systembolaget Alla helgons dag");
assert(hours.resolveDay(systembolaget, new Date("2026-10-31T08:00:00Z")).label === "Alla helgons dag", "systembolaget holiday label");
assert(hours.statusAt(systembolaget, new Date("2026-12-22T17:30:00Z")) === "open", "systembolaget 22 Dec stays open until 19:00");
assert(hours.statusAt(systembolaget, new Date("2026-12-22T18:00:00Z")) === "closed", "systembolaget 22 Dec closes 19:00");
assert(hours.statusAt(systembolaget, new Date("2026-12-24T10:00:00Z")) === "closed", "systembolaget Julafton");
assert(hours.statusAt(systembolaget, new Date("2026-12-31T13:59:00Z")) === "open", "systembolaget Nyårsafton 14:59");
assert(hours.statusAt(systembolaget, new Date("2026-12-31T14:00:00Z")) === "closed", "systembolaget Nyårsafton closes 15:00");
assert(hours.statusAt(systembolaget, new Date("2027-01-05T11:00:00Z")) === "open", "systembolaget Trettondagsafton follows Tuesday hours");
assert(hours.statusAt(systembolaget, new Date("2027-01-06T11:00:00Z")) === "closed", "systembolaget Trettondagen");
assert(hours.statusAt(systembolaget, new Date("2027-03-27T13:59:00Z")) === "open", "systembolaget Påskafton 14:59");
assert(hours.statusAt(systembolaget, new Date("2027-03-27T14:00:00Z")) === "closed", "systembolaget Påskafton closes 15:00");
assert(hours.statusAt(systembolaget, new Date("2027-06-25T10:00:00Z")) === "closed", "systembolaget Midsommarafton");
assert(hours.todayLine(systembolaget, new Date("2026-12-31T12:00:00Z")) === "10:00–15:00", "systembolaget Nyårsafton line");

const nolhaga = byId("systembolaget-nolhaga");
assert(nolhaga.name === "Systembolaget Nolhaga", "nolhaga name");
assert(nolhaga.address === "Nolhagavägen 1, 549 38 Skövde", "nolhaga address");
assert(nolhaga.source === "systembolaget.se", "nolhaga source");
assert(nolhaga.website.endsWith("/nolhagavagen-1-1617/"), "nolhaga store page");
["mon", "tue", "wed", "thu", "fri"].forEach((key) => sameSlots(nolhaga.hours[key], "10:00", "19:00"));
sameSlots(nolhaga.hours.sat, "10:00", "15:00");
assert(nolhaga.hours.sun === "closed", "nolhaga sunday");
assert(JSON.stringify(nolhaga.exceptions) === JSON.stringify(systembolaget.exceptions), "nolhaga uses the centre holiday rows");
assert(hours.statusAt(nolhaga, new Date("2026-10-19T07:59:00Z")) === "closed", "nolhaga before 10:00");
assert(hours.statusAt(nolhaga, new Date("2026-10-19T08:00:00Z")) === "open", "nolhaga opens 10:00");
assert(hours.statusAt(nolhaga, new Date("2026-10-19T16:30:00Z")) === "open", "nolhaga Monday 18:30");
assert(hours.statusAt(nolhaga, new Date("2026-10-19T16:59:00Z")) === "open", "nolhaga Monday 18:59");
assert(hours.statusAt(nolhaga, new Date("2026-10-19T17:00:00Z")) === "closed", "nolhaga Monday closes 19:00");
assert(hours.statusAt(nolhaga, new Date("2026-10-24T12:59:00Z")) === "open", "nolhaga Saturday 14:59");
assert(hours.statusAt(nolhaga, new Date("2026-10-24T13:00:00Z")) === "closed", "nolhaga Saturday closes 15:00");
assert(hours.statusAt(nolhaga, new Date("2026-10-25T08:00:00Z")) === "closed", "nolhaga Sunday");
assert(hours.statusAt(nolhaga, new Date("2026-10-31T08:00:00Z")) === "closed", "nolhaga Alla helgons dag");
assert(hours.statusAt(nolhaga, new Date("2026-12-24T10:00:00Z")) === "closed", "nolhaga Julafton");
assert(hours.statusAt(nolhaga, new Date("2026-12-31T13:59:00Z")) === "open", "nolhaga Nyårsafton 14:59");
assert(hours.statusAt(nolhaga, new Date("2026-12-31T14:00:00Z")) === "closed", "nolhaga Nyårsafton closes 15:00");
assert(hours.todayLine(nolhaga, new Date("2026-12-31T12:00:00Z")) === "10:00–15:00", "nolhaga Nyårsafton line");
assert(hours.statusAt(nolhaga, new Date("2027-06-25T10:00:00Z")) === "closed", "nolhaga Midsommarafton");

const spice = byId("spice-n-rice");
assert(spice.name === "Spice 'n Rice", "spice name");
assert(spice.address === "Rådhusgatan 6, Commerce huset, 541 30 Skövde", "spice address");
assert(spice.source === "spicenrice.se", "spice source");
["mon", "tue", "wed", "thu", "fri", "sat"].forEach((key) => sameSlots(spice.hours[key], "11:00", "21:00"));
sameSlots(spice.hours.sun, "12:00", "20:00");
assert(hours.statusAt(spice, new Date("2026-10-19T08:59:00Z")) === "closed", "spice before 11:00");
assert(hours.statusAt(spice, new Date("2026-10-19T09:00:00Z")) === "open", "spice opens 11:00");
assert(hours.statusAt(spice, new Date("2026-10-19T18:59:00Z")) === "open", "spice Monday 20:59");
assert(hours.statusAt(spice, new Date("2026-10-19T19:00:00Z")) === "closed", "spice Monday closes 21:00");
assert(hours.statusAt(spice, new Date("2026-10-18T09:59:00Z")) === "closed", "spice Sunday before 12:00");
assert(hours.statusAt(spice, new Date("2026-10-18T10:00:00Z")) === "open", "spice Sunday opens 12:00");
assert(hours.statusAt(spice, new Date("2026-10-18T17:59:00Z")) === "open", "spice Sunday 19:59");
assert(hours.statusAt(spice, new Date("2026-10-18T18:00:00Z")) === "closed", "spice Sunday closes 20:00");
assert(hours.statusAt(spice, new Date("2026-12-24T10:00:00Z")) === "closed", "spice Julafton");
assert(hours.statusAt(spice, new Date("2026-12-25T10:00:00Z")) === "closed", "spice Juldagen");
assert(hours.statusAt(spice, new Date("2026-12-31T08:59:00Z")) === "closed", "spice Nyårsafton before 10:00");
assert(hours.statusAt(spice, new Date("2026-12-31T09:00:00Z")) === "open", "spice Nyårsafton opens 10:00");
assert(hours.statusAt(spice, new Date("2026-12-31T13:59:00Z")) === "open", "spice Nyårsafton 14:59");
assert(hours.statusAt(spice, new Date("2026-12-31T14:00:00Z")) === "closed", "spice Nyårsafton closes 15:00");
assert(hours.todayLine(spice, new Date("2026-12-31T12:00:00Z")) === "10:00–15:00", "spice Nyårsafton line");
assert(!spice.exceptions.some((ex) => ex.date === "2027-06-25"), "spice does not invent Midsommarafton");

const splitDay = {
  hours: {
    mon: [{ open: "10:00", close: "15:00" }, { open: "15:30", close: "18:00" }],
    tue: "closed", wed: "closed", thu: "closed", fri: "closed", sat: "closed", sun: "closed",
  },
};
assert(hours.todayLine(splitDay, new Date("2026-10-19T08:00:00Z")) === "10:00–15:00, 15:30–18:00", "split day line");
assert(hours.formatSlots(splitDay.hours.mon) === "10:00–15:00, 15:30–18:00", "split slots");
assert(hours.statusAt(splitDay, new Date("2026-10-19T12:59:00Z")) === "open", "split day before the break");
assert(hours.statusAt(splitDay, new Date("2026-10-19T13:00:00Z")) === "closed", "split day at 15:00");
assert(hours.statusAt(splitDay, new Date("2026-10-19T13:15:00Z")) === "closed", "split day during the break");
assert(hours.statusAt(splitDay, new Date("2026-10-19T13:30:00Z")) === "open", "split day reopens at 15:30");
assert(hours.statusAt(splitDay, new Date("2026-10-19T15:59:00Z")) === "open", "split day 17:59");
assert(hours.statusAt(splitDay, new Date("2026-10-19T16:00:00Z")) === "closed", "split day closes 18:00");

const closedDates = new Set(soptippen.exceptions.map((ex) => ex.date));
["2026-10-31", "2026-12-24", "2026-12-25", "2026-12-26", "2026-12-31", "2027-01-01", "2027-01-06", "2027-03-26", "2027-05-01", "2027-06-25", "2027-12-24", "2028-01-06"].forEach((date) => {
  assert(closedDates.has(date), `soptippen closed ${date}`);
});
["2027-01-05", "2027-04-30", "2028-01-05"].forEach((date) => {
  assert(!closedDates.has(date), `soptippen stays on weekly hours ${date}`);
});

partsAt("2026-10-19T05:00:00Z", "2026-10-19", "mon", "07:00");
partsAt("2026-10-19T04:59:00Z", "2026-10-19", "mon", "06:59");
partsAt("2026-01-19T05:59:00Z", "2026-01-19", "mon", "06:59");
partsAt("2026-01-19T06:30:00Z", "2026-01-19", "mon", "07:30");

const mondayMorning = new Date("2026-10-19T08:00:00Z");
["soptippen", "coop-vipan", "stora-coop", "ica-maxi", "lidl", "willys", "biltema"].forEach((id) => {
  assert(hours.statusAt(byId(id), mondayMorning) === "open", `${id} open Monday 10:00`);
});
assert(hours.todayLine(soptippen, mondayMorning) === "07:00–19:00", "soptippen today line");

assert(hours.statusAt(byId("coop-vipan"), new Date("2026-10-19T04:00:00Z")) === "open", "vipan opens 06:00");
assert(hours.statusAt(byId("coop-vipan"), new Date("2026-10-19T03:59:00Z")) === "closed", "vipan before 06:00");
assert(hours.statusAt(byId("coop-vipan"), new Date("2026-10-19T20:59:00Z")) === "open", "vipan 22:59");
assert(hours.statusAt(byId("coop-vipan"), new Date("2026-10-19T21:00:00Z")) === "closed", "vipan closes 23:00");

assert(hours.statusAt(byId("stora-coop"), new Date("2026-10-19T05:00:00Z")) === "open", "stora opens 07:00");
assert(hours.statusAt(byId("stora-coop"), new Date("2026-10-19T04:59:00Z")) === "closed", "stora before 07:00");
assert(hours.statusAt(byId("stora-coop"), new Date("2026-10-19T19:59:00Z")) === "open", "stora 21:59");
assert(hours.statusAt(byId("stora-coop"), new Date("2026-10-19T20:00:00Z")) === "closed", "stora closes 22:00");

assert(hours.statusAt(soptippen, new Date("2026-10-19T17:00:00Z")) === "closed", "soptippen closes 19:00");
assert(hours.statusAt(soptippen, new Date("2026-10-20T14:29:00Z")) === "open", "soptippen Tuesday 16:29");
assert(hours.statusAt(soptippen, new Date("2026-10-20T14:30:00Z")) === "closed", "soptippen Tuesday 16:30");
assert(hours.statusAt(soptippen, new Date("2026-10-24T06:29:00Z")) === "closed", "soptippen Saturday before 08:30");
assert(hours.statusAt(soptippen, new Date("2026-10-24T06:30:00Z")) === "open", "soptippen Saturday 08:30");
assert(hours.statusAt(soptippen, new Date("2026-10-24T11:59:00Z")) === "open", "soptippen Saturday 13:59");
assert(hours.statusAt(soptippen, new Date("2026-10-24T12:00:00Z")) === "closed", "soptippen Saturday 14:00");
assert(hours.statusAt(soptippen, new Date("2026-10-18T10:00:00Z")) === "closed", "soptippen Sunday");
assert(hours.statusAt(soptippen, new Date("2026-01-19T06:30:00Z")) === "open", "winter CET still open at 07:30");
assert(hours.statusAt(soptippen, new Date("2026-01-19T05:59:00Z")) === "closed", "winter CET closed at 06:59");

assert(hours.statusAt(lidl, new Date("2026-10-24T06:00:00Z")) === "open", "lidl Saturday 08:00");
assert(hours.statusAt(lidl, new Date("2026-10-24T05:59:00Z")) === "closed", "lidl Saturday before 08:00");
assert(hours.statusAt(lidl, new Date("2026-10-24T17:59:00Z")) === "open", "lidl Saturday 19:59");
assert(hours.statusAt(lidl, new Date("2026-10-24T18:00:00Z")) === "closed", "lidl Saturday closes 20:00");
assert(hours.statusAt(lidl, new Date("2026-10-18T06:59:00Z")) === "closed", "lidl Sunday before 09:00");
assert(hours.statusAt(lidl, new Date("2026-10-18T07:00:00Z")) === "open", "lidl Sunday 09:00");
assert(hours.todayLine(lidl, new Date("2026-10-18T10:00:00Z")) === "09:00–20:00", "lidl Sunday line");
assert(hours.statusAt(lidl, new Date("2026-10-19T18:59:00Z")) === "open", "lidl 20:59");
assert(hours.statusAt(lidl, new Date("2026-10-19T19:00:00Z")) === "closed", "lidl closes 21:00");

assert(hours.statusAt(biltema, new Date("2026-10-18T06:59:00Z")) === "closed", "biltema Sunday before 09:00");
assert(hours.statusAt(biltema, new Date("2026-10-18T07:00:00Z")) === "open", "biltema Sunday 09:00");

assert(hours.statusAt(soptippen, new Date("2026-10-31T07:00:00Z")) === "closed", "Alla helgons dag");
assert(hours.resolveDay(soptippen, new Date("2026-10-31T07:00:00Z")).label === "Alla helgons dag", "holiday label");
assert(hours.statusAt(soptippen, new Date("2026-12-24T10:00:00Z")) === "closed", "Julafton closed");
assert(hours.statusAt(soptippen, new Date("2027-01-05T08:00:00Z")) === "open", "Trettondagsafton follows Tuesday hours");
assert(hours.statusAt(soptippen, new Date("2027-01-06T09:00:00Z")) === "closed", "Trettondagen closed");
assert(hours.statusAt(soptippen, new Date("2027-04-30T08:00:00Z")) === "open", "Valborg follows Friday hours");
assert(hours.statusAt(soptippen, new Date("2027-05-01T08:00:00Z")) === "closed", "1 maj closed");

assert(hours.statusAt(biltema, new Date("2026-12-24T10:00:00Z")) === "closed", "Biltema Julafton");
assert(hours.statusAt(biltema, new Date("2026-12-25T07:30:00Z")) === "closed", "Biltema Juldagen before special open");
assert(hours.statusAt(biltema, new Date("2026-12-25T09:00:00Z")) === "open", "Biltema Juldagen 10:00");
assert(hours.todayLine(biltema, new Date("2026-12-25T09:00:00Z")) === "09:00–18:00", "Biltema Juldagen line");
assert(hours.statusAt(biltema, new Date("2026-12-25T17:00:00Z")) === "closed", "Biltema Juldagen closes 18:00");
assert(hours.statusAt(biltema, new Date("2026-12-31T13:00:00Z")) === "open", "Biltema Nyårsafton 14:00");
assert(hours.statusAt(biltema, new Date("2026-12-31T14:00:00Z")) === "closed", "Biltema Nyårsafton closes 15:00");
assert(hours.statusAt(biltema, new Date("2027-01-01T10:00:00Z")) === "closed", "Biltema Nyårsdagen");
assert(hours.statusAt(biltema, new Date("2027-01-06T07:59:00Z")) === "closed", "Biltema trettondag before 09:00");
assert(hours.statusAt(biltema, new Date("2027-01-06T08:00:00Z")) === "open", "Biltema trettondag 09:00");

const upcoming = hours.upcomingExceptions(soptippen, new Date("2026-10-19T08:00:00Z"));
assert(upcoming[0].start === "2026-10-31", "next exception is Alla helgons dag");
assert(!upcoming.some((ex) => ex.end < "2026-10-19"), "no past exceptions");
const after = hours.upcomingExceptions(soptippen, new Date("2026-11-01T08:00:00Z"));
assert(!after.some((ex) => ex.start === "2026-10-31"), "Alla helgons dag drops off after the day");

const ranged = {
  hours: { mon: [{ open: "08:00", close: "18:00" }], tue: [{ open: "08:00", close: "18:00" }], wed: [{ open: "08:00", close: "18:00" }], thu: [{ open: "08:00", close: "18:00" }], fri: [{ open: "08:00", close: "18:00" }], sat: [{ open: "08:00", close: "18:00" }], sun: [{ open: "08:00", close: "18:00" }] },
  exceptions: [
    { start: "2026-12-24", end: "2026-12-26", hours: "closed", label: "Jul" },
    { date: "2026-12-25", hours: [{ open: "10:00", close: "12:00" }], label: "Juldagen" },
  ],
};
assert(hours.statusAt(ranged, new Date("2026-12-24T12:00:00Z")) === "closed", "range closes the 24th");
assert(hours.resolveDay(ranged, new Date("2026-12-24T12:00:00Z")).label === "Jul", "range label");
assert(hours.statusAt(ranged, new Date("2026-12-25T10:30:00Z")) === "open", "exact date beats the range");
assert(hours.resolveDay(ranged, new Date("2026-12-25T10:30:00Z")).label === "Juldagen", "exact label");
assert(hours.statusAt(ranged, new Date("2026-12-25T11:00:00Z")) === "closed", "exact span ends at 12:00");
assert(hours.statusAt(ranged, new Date("2026-12-26T12:00:00Z")) === "closed", "range still closes the 26th");

assert(theme.KEY === "oeffnungszeit-theme", "theme storage key");
assert(theme.KEY !== "hours-pin-v1", "theme key is separate from the cleared pin key");
assert(theme.normalize("light") === "light", "normalize light");
assert(theme.normalize("dark") === "dark", "normalize dark");
assert(theme.normalize("nope") === "dark" && theme.normalize(null) === "dark", "unknown theme falls back to dark");
assert(theme.toggle("dark") === "light" && theme.toggle("light") === "dark", "toggle flips the theme");
assert(theme.toggle("nope") === "light", "toggle of an unknown value starts from dark");
assert(theme.color("dark") === "#0a0a0a" && theme.color("nope") === "#0a0a0a", "dark theme colour");
assert(theme.color("light") === "#f7f7f8", "light theme colour");

const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
assert(indexHtml.includes('data-theme="dark"'), "dark is the default attribute");
assert(indexHtml.includes('localStorage.getItem("oeffnungszeit-theme")'), "inline script reads the theme key");
assert(indexHtml.includes("#f7f7f8") && indexHtml.includes("#0a0a0a"), "inline script sets both theme colours");
assert(!indexHtml.includes("hours-pin-v1"), "inline script does not touch the pin key");
assert(appJs.includes('data-action="theme"') && appJs.includes("HoursTheme"), "header toggle uses HoursTheme");
assert(appJs.includes('const KEY = "hours-pin-v1"') && appJs.includes("localStorage.removeItem(KEY)"), "pin key is still the only key cleared on load");
assert(!appJs.includes("oeffnungszeit-theme"), "app stores the theme through HoursTheme.KEY");
assert(css.includes('[data-theme="light"]') && css.includes("--accent-ink: #7c3aed") && css.includes("--bg: #f7f7f8"), "light theme tokens");

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
