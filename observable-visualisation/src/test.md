---
theme: dashboard
title: testing
toc: true
---

```js
const data = await FileAttachment("data/data_punctualite_typedetrain_comma.csv").csv({typed: true});
data.sort((a,b)=> b["Month"] < a["Month"])
display(data[10]["Month"].getMonth())
function monthToSeason(date) {
  return ['winter', 'spring', 'summer', 'autumn'][Math.floor((date.getMonth() / 12 * 4)) % 4]
}
```

# Vertraagd: Een analyse van treinvertragingen in België

<br/>

## Intro

Treinvertragingen, afschaffingen, stakingen — we kennen het allemaal. Voor duizenden pendelaars in België vormen ze een dagelijkse bron van frustratie. Maar hoe ernstig zijn die vertragingen eigenlijk? En valt er een patroon te ontdekken, bijvoorbeeld in het tijdstip of het type trein?

In dit project duiken we in een dataset van [Infrabel](https://opendata.infrabel.be/explore/dataset/data_punctualite_typedetrain/table/?disjunctive.rel&sort=maand). We zoeken uit hoe vaak vertragingen voorkomen, wanneer ze zich het vaakst voordoen, en welke treintypes het kwetsbaarst zijn. Zo proberen we grip te krijgen op een probleem waar velen dagelijks mee te maken krijgen.


## Treintypes

Niet elke trein is hetzelfde — er zijn stoptreinen, sneltreinen, en zelfs internationale treinen. Aan de hand van hun afkortingen is het meestal eenvoudig te achterhalen met welk type je reist.

| Afkorting    | Betekenis |
| -------- | ------- |
| IC | InterCity, haltes in de belangrijkste steden |
| P | Piekuur, rijdt op drukke momenten, extra treinen. |
| L | Lokale trein, stopt aan elke halte op het pad, (todo) |
| S | Stoptrein, rijdt in voorstedelijke gebieden |
| INT | Klassieke interantionale treinen |
| ICT | Toeristische treinen |

Bron: [Wikipedia](https://nl.wikipedia.org/wiki/Lijst_van_treincategorie%C3%ABn_in_Belgi%C3%AB)

Maar hoe vaak komt elk treintype voor in de dataset? Om daar een visueel beeld van te krijgen, gebruiken we een waffle chart.

```js
let trainsPerType = d3.rollup(
  data,
  v => d3.sum(v, d => +d["Number of operated trains"]),
  d => d["Train type"]
)
const totalTrains = d3.sum(trainsPerType.values());

const rows = 10;
const cols = 10;
trainsPerType = Array.from(trainsPerType, ([type, count]) => ({
  type,
  count,
  blocks: Math.round((count / totalTrains) * rows * cols)
}))
const waffleBlocks = trainsPerType.flatMap(d =>
  Array.from({ length: d.blocks }, () => ({ type: d.type }))
)

const waffleGrid = waffleBlocks.map((d, i) => ({
  ...d,
  x: cols - Math.floor(i / cols),
  y: i % cols
}))
```

```js
Plot.plot({
  marks: [
    Plot.rect(waffleGrid, {
      x: "x",
      y: "y",
      fill: "type",
      inset: 0.5
    })
  ],
  title: "Total Operated Trains per Train Type",
  width: 450,
  height: 400,
  color: { legend: true },
  x: { axis: null },
  y: { axis: null },
  style: { background: "#fff" }
})
```

De visualisatie maakt meteen duidelijk dat sommige treintypes veel vaker voorkomen dan andere. Om die verschillen verder te onderzoeken, kijken we ook naar hoe de aanwezigheid van elk treintype doorheen de tijd evolueert.

<br/>
<br/>

```js
const monthlyTrains = d3.rollups(data, 
  v => d3.sum(v, d => d['Number of operated trains']), 
  d => d.Month, 
  d => d['Train type']
).map(([month, types]) => 
  types.map(([type, total]) => ({Month: month, 'Train type': type, 'Number of operated trains': total}))
).flat()
```

```js
Plot.plot({
  marks: [
    Plot.line(monthlyTrains, {
      x: 'Month',
      y: 'Number of operated trains',
      stroke: 'Train type',
      strokeWidth: 2,
      marker: 'circle'
    })
  ],
  title: "Monthly Evolution of Operated Trains per Train Type",
  width: 1500,
  height: 500,
  x: { label: "Month", tickRotate: 45 },
  y: { label: "Number of Operated Trains" },
  color: { legend: true },
})
```

Wat opvalt: slechts drie treintypes (IC, P, L) komen consistent voor in elk jaar van de dataset. Andere types, zoals ICT, INT en S, zijn maar gedurende een korte periode opgenomen. Dit kan een vertekend beeld geven van de algemene trends.

Daarom nemen we deze treintypes niet altijd mee in verdere vergelijkingen of verbanden. Zo houden we de analyses representatief en vermijden we foutieve conclusies.

## Verdere inzichten

Wanneer we de stiptheid van de treinen door de jaren heen bekijken, kunnen we mogelijk trends ontdekken: is de situatie verbeterd of net verslechterd? Hieronder tonen we dat aan de hand van een interactieve line chart.

```js
Plot.plot({
  marks: [
    Plot.line(data, {
      x: 'Month',
      y: 'Punctuality',
      stroke: 'Train type',
      strokeWidth: 2,
      marker: 'circle'
    })
  ],
  title: "Monthly Evolution of Operated Trains per Train Type",
  width: 1500,
  height: 400,
  x: { label: "Month", type: "time", tickRotate: 45 },
  y: { label: "Punctuality" },
  color: { legend: true },
})
```

Hoewel we niet voor elk treintype gegevens uit elk jaar hebben, springt één ding meteen in het oog: de INT-trein scoort het slechtst op stiptheid. Daarnaast blijft de algemene stiptheid doorheen de jaren vrij stabiel rond de 90%, met hier en daar lichte schommelingen.

Om te onderzoeken of het seizoen invloed heeft op de vertragingen, visualiseren we per treintype de gemiddelde vertraging per seizoen.


```js
const seasonOrder = {winter: 0, spring: 1, summer: 2, autumn: 3};
const trainTypes = ["IC", "ICT", "INT", "L", "P", "S"];
const colors = {spring: "green", summer: "orange", autumn: "red", winter: "blue"};
```

```js
const dfSeason = data.map(row => ({
  ...row,
  Season: monthToSeason(row["Month"])
}));
const grouped = d3.rollups(dfSeason,
  v => {
    const total_delay = d3.sum(v, d => +d["Minutes of delay"]);
    const total_trains = d3.sum(v, d => +d["Number of operated trains"]);
    return {
      "Normalized delay": total_delay / total_trains
    };
  },
  d => d["Train type"],
  d => d.Season
);

const flat = grouped.flatMap(([trainType, seasonData]) => 
  seasonData.map(([season, values]) => ({
    "Train type": trainType,
    Season: season,
    "Normalized delay": values["Normalized delay"]
  }))
);

const normalized = trainTypes.flatMap(type => {
  const filtered = flat.filter(d => d["Train type"] === type);
  const total = d3.sum(filtered, d => d["Normalized delay"]);
  return filtered.map(d => ({
    ...d,
    "Normalized^2 delay": d["Normalized delay"] / total
  }));
})
const colorA = d3.scaleOrdinal()
  .domain(["spring", "summer", "autumn", "winter"])
  .range(["green", "orange", "red", "blue"]);
```

```js
Plot.plot({
  facet: {
    data: normalized,
    x: "Train type",
  },
  marks: [
    Plot.barY(normalized, {
      x: "Season",
      y: "Normalized^2 delay",
      fill: d => colorA(d["Season"]),
      sort: {x: "x", order: null},
    }),
  ],
  y: { domain: [0, 0.5], grid: true },
  width: 1200,
  height: 310,
  marginBottom: 40
})
```

Op basis van al deze grafieken samen kunnen we echter geen duidelijk verband vaststellen tussen seizoen en vertraging. Zo zien we geen algemene trend over al de treintypes heen. De variaties lijken eerder willekeurig dan seizoensgebonden. Echter, als we ons beperken tot de 3 treintypes waarvoor we over alle jaren consistente data hebben, valt er wel iets interessants op. 

__ TODO __ je ziet toch steeds dat de autumn hoger is dan de rest?