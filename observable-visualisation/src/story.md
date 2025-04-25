---
theme: dashboard
title: work-in-progress 
toc: true
---

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
const todo = "TODO"
```

De visualisatie maakt meteen duidelijk dat sommige treintypes veel vaker voorkomen dan andere. Om die verschillen verder te onderzoeken, kijken we ook naar hoe de aanwezigheid van elk treintype doorheen de tijd evolueert.

```js
import * as Inputs from "npm:@observablehq/inputs";

const train_data = await FileAttachment("data/data_punctualite_typedetrain_comma.csv").csv({ typed: true });

const sorted_train_data = train_data.slice().sort(
    (a, b) => new Date(a.Month) - new Date(b.Month)
)

const train_types = Array.from(new Set(train_data.map(d => d["Train type"])));

const selected_types_input = view(Inputs.checkbox(train_types, {
    value: train_types,
    label: "Select train types to display",
    sort: true
}));
```

```js
Plot.plot({
    y: { grid: true, label: "Number of operated trains" },
    x: { type: "utc", label: "Month" },
    width: 1500,
    height: 500,
    color: {
        type: "categorical",
        domain: train_types,
        // range: ["#4682B4", "#FFA500", "#228B22", "#9370DB", "#DC143C", "#DAA520"]
    },
    marks: [
        Plot.lineY(
            sorted_train_data.filter(d => selected_types_input.includes(d["Train type"])),
            {
                x: "Month",
                y: "Number of operated trains",
                stroke: "Train type",
                marker: "circle",
                tip: true
            }
        )
    ]
})
```


Wat opvalt: slechts drie treintypes (IC, P, L) komen consistent voor in elk jaar van de dataset. Andere types, zoals ICT, INT en S, zijn maar gedurende een korte periode opgenomen. Dit kan een vertekend beeld geven van de algemene trends.

Daarom nemen we deze treintypes niet altijd mee in verdere vergelijkingen of verbanden. Zo houden we de analyses representatief en vermijden we foutieve conclusies.

## Verdere inzichten

Wanneer we de stiptheid van de treinen door de jaren heen bekijken, kunnen we mogelijk trends ontdekken: is de situatie verbeterd of net verslechterd? Hieronder tonen we dat aan de hand van een interactieve line chart.

```js
Plot.plot({
    y: { grid: true, label: "Punctuality (%)", domain: [0, 100] },
    x: { type: "utc", label: "Month" },
    width: 1500,
    height: 500,
    color: {
        type: "categorical",
        domain: train_types,
        // range: ["#4682B4", "#FFA500", "#228B22", "#9370DB", "#DC143C", "#DAA520"]
    },
    marks: [
        Plot.lineY(
            sorted_train_data.filter(d => selected_types_input.includes(d["Train type"])),
            {
                x: "Month",
                y: "Punctuality",
                stroke: "Train type",
                marker: "circle",
                tip: true
            })
    ]
})
```

Hoewel we niet voor elk treintype gegevens uit elk jaar hebben, springt één ding meteen in het oog: de INT-trein scoort het slechtst op stiptheid. Daarnaast blijft de algemene stiptheid doorheen de jaren vrij stabiel rond de 90%, met hier en daar lichte schommelingen.

Om te onderzoeken of het seizoen invloed heeft op de vertragingen, visualiseren we per treintype de gemiddelde vertraging per seizoen.

```js
const todo = "TODO"
```

Op basis van al deze grafieken samen kunnen we echter geen duidelijk verband vaststellen tussen seizoen en vertraging. Zo zien we geen algemene trend over al de treintypes heen. De variaties lijken eerder willekeurig dan seizoensgebonden. Echter, als we ons beperken tot de 3 treintypes waarvoor we over alle jaren consistente data hebben, valt er wel iets interessants op.

```js
const todo = "TODO"
```

Elk van deze treinen vertoont een duidelijk seizoenspatroon in de gemiddelde vertraging: de herfst kent de hoogste vertragingen, gevolgd door de winter, daarna de lente, en ten slotte de zomer, die het best scoort.

Om te achterhalen of één bepaald treintype veel meer bijdraagt aan de totale vertragingen dan een andere, visualiseren we de gegevens in een boxplot. Deze grafiek geeft ons een gedetailleerd beeld van de spreiding en verdeling van vertragingen per treintype. Hier laten we opnieuw de treintypes weg die niet frequent voorkomen in de dataset.

```js
const filtered_data = train_data
    .filter(d => !["ICT", "INT", "S"].includes(d["Train type"]))
    .map(d => ({
        ...d,
        "Average Delay": d["Minutes of delay"] / d["Number of operated trains"]
    }));

const delay_mode = view(Inputs.select(["Average Delay (relative)", "Minutes of delay (absolute)"], {
    label: "Choose delay display mode",
    value: "Average Delay (relative)"
}));
```

```js
Plot.plot({
  title: `Boxplot of ${delay_mode} per Train Type`,
  width: 800,
  height: 400,
  marginLeft: 80,
  x: { label: delay_mode },
  y: { label: "Train Type" },
  color: { legend: false },
  marks: [
    Plot.boxX(filtered_data, {
      y: "Train type",
      x: delay_mode === "Average Delay (relative)" ? "Average Delay" : "Minutes of delay",
      stroke: "white",
      fill: "lightsteelblue"
    })
  ]
})
```

Voor extra duidelijkheid tonen we zowel relatieve als absolute cijfers:
 - De relatieve vertragingen zijn gemiddelden, berekend door de totale vertraging te delen door het aantal gereden treinen.
 - De absolute vertragingen tonen het totaal aan vertraging per type, en geven zo weer hoe ernstig de impact kan zijn in omvang.

Deze combinatie laat toe om niet alleen te zien hoe vaak treinen vertraging hebben, maar ook hoe zwaar die vertragingen doorwegen per treintype.

## Conclusie

Hoewel het seizoen geen eenduidig beeld geeft over wanneer de vertragingen het ergst zijn, zien we wel een duidelijker patroon als we naar het type trein kijken.

De IC-trein, die ook het vaakst voorkomt in de dataset, vertoont gemiddeld meer minuten vertraging dan de andere treinen — dit op basis van de 3 treintypes waarvoor we over alle jaren data hebben.

Kijken we daarentegen naar alle treinen, dan valt de INT-trein op als de minst stipte. Toch moeten we daar voorzichtig mee zijn: omdat er van de INT-trein geen data is over alle jaren, kunnen we daaruit geen conclusies trekken.

De onderstaande area chart toont duidelijk hoe de IC-trein door de jaren heen het grootste aandeel aan vertragingen heeft veroorzaakt.


```js
const included_types = train_types.filter(d => !["ICT", "INT", "S"].includes(d));

const cumulative_data = (() => {
    const result = [];

    for (let type of included_types) {
        const data = train_data
            .filter(d => d["Train type"] === type)
            .sort((a, b) => new Date(a.Month) - new Date(b.Month));

        let total = 0;

        for (let d of data) {
            total += d["Minutes of delay"];
            result.push({
                Month: d.Month,
                "Train type": type,
                "Cumulative delay": total
            });
        }
    }

    return result;
})();
```

```js
Plot.plot({
  width: 1500,
  height: 500,
  marginLeft: 60,
  y: {
    grid: true,
    label: "Cumulative Minutes of Delay"
  },
  x: {
    grid: true,
    type: "utc",
    label: "Month"
  },
  color: {
    type: "categorical",
    domain: included_types,
    range: ["#4682B4", "#FFA500", "#228B22", "#9370DB", "#DC143C", "#DAA520"],
    label: "Train type"
  },
  marks: [
    Plot.areaY(cumulative_data, {
      x: "Month",
      y: "Cumulative delay",
      fill: "Train type",
      tip: true
    }),
    Plot.ruleY([0])
  ]
})
```
