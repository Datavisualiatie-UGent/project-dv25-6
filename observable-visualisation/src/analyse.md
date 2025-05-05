---
title: Analyse
toc: true
---

## Treintypes

Niet elke trein is hetzelfde — er zijn stoptreinen, sneltreinen, en zelfs internationale treinen. Aan de hand van hun **afkortingen** is het meestal eenvoudig te achterhalen met welk type je reist.

| Afkorting    | Betekenis |
| -------- |-----------|
| **IC** | 	**InterCity** – stopt enkel in de belangrijkste steden. |
| **P** | **Piekuurtrein** – rijdt tijdens de spitsuren als extra versterking. |
| **L** | **Lokale trein** – stopt aan elk station langs het traject. |
| **S** | **Stoptrein** – bedient voorstedelijke gebieden en stopt frequent. |
| **INT** | **Internationale trein** – klassieke grensoverschrijdende verbindingen. |
| **ICT** | **Toeristentrein** – gericht op toeristische bestemmingen. |

Bron: [Wikipedia](https://nl.wikipedia.org/wiki/Lijst_van_treincategorie%C3%ABn_in_Belgi%C3%AB)

```js
import * as Inputs from "npm:@observablehq/inputs";

function monthToSeason(date) {
  const monthIndex = (month) => {
    if ([1, 2, 12].includes(month)) return 0;
    if ([3, 4, 5].includes(month)) return 1;
    if ([6, 7, 8].includes(month)) return 2;
    return 3;
  }
  return ['Winter', 'Lente', 'Zomer', 'Herfst'][monthIndex(date.getMonth() + 1)]
}
```

```js
const train_data = await FileAttachment("data/data_punctualite_typedetrain_comma.csv").csv({ typed: true });

const sorted_train_data = train_data.slice().sort(
    (a, b) => new Date(a.Month) - new Date(b.Month)
);

const seasonal_train_data = train_data.map(r => ({
    ...r,
    "season": monthToSeason(r["Month"])
}));
```

Maar hoe vaak **komt elk treintype voor** in de dataset? Om daar een visueel beeld van te krijgen, gebruiken we een **bubble chart**.
```js
const trainsPerType = d3.rollup(
    train_data,
  value => d3.sum(value, a => a["Number of operated trains"]),
  d => d["Train type"]
);

const totalTrains = d3.sum(trainsPerType.values());
const trainsPerTypeNormalized = new Map(Array.from(trainsPerType, ([key, value]) => ([key, value / totalTrains])));
const hierarchyData = d3.hierarchy({
    children: Array.from(trainsPerTypeNormalized, ([type, share]) => ({
        name: type,
        value: share
    }))
}).sum(d => d.value);

const packLayout = d3.pack()
    .size([450, 450])   // Width and height of the SVG
    .padding(5);        // Space between bubbles
```

```js
function bubbleChart() {
    const root = packLayout(hierarchyData);
    const svg = d3.create("svg")
        .attr("viewBox", [0, 50, 700, 300])
        .attr("style", "max-width: 100%; height: auto;");

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const node = svg.selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
        .attr("r", d => d.r)
        .attr("fill", d => color(d.data.name));

// Tooltip
    node.append("title")
        .text(d => `${d.data.name}: ${(d.data.value * 100).toFixed(2)}%`);

    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .attr("font-size", d => Math.min(d.r / 3, 14))
        .text(d => d.data.name);

// === Custom Annotations ===
    const annotations = [
        {name: "INT", label: "INT", dx: -70, dy: 40},
        {name: "ICT", label: "ICT", dx: -70, dy: 40}
    ];

    for (const annotation of annotations) {
        const bubble = root.leaves().find(d => d.data.name === annotation.name);
        if (!bubble) continue;

        const {x, y} = bubble;
        const tx = x + annotation.dx;
        const ty = y + annotation.dy;

        // Line from label to bubble
        svg.append("line")
            .attr("x1", y + 4)
            .attr("y1", x - 5)
            .attr("x2", ty)
            .attr("y2", tx)
            .attr("stroke", color(annotation.name))
            .attr("stroke-width", 1);

        // Text label
        svg.append("text")
            .attr("x", ty)
            .attr("y", tx - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("fill", color(annotation.name))
            .text(`${annotation.label}: ${(bubble.data.value * 100).toFixed(2)}%`);
    }
    return svg.node();
}
```

```js
view(bubbleChart());
```

De visualisatie maakt meteen duidelijk dat sommige treintypes veel vaker voorkomen dan andere. Om die verschillen verder te onderzoeken, kijken we ook naar hoe de **aanwezigheid van elk treintype doorheen de tijd evolueert**.
```js
const train_types = Array.from(new Set(train_data.map(d => d["Train type"])));

const selected_types_input = view(Inputs.checkbox(train_types, {
    value: train_types,
    label: "Selecteer trein types om te tonen",
    sort: true
}));
```

```js
Plot.plot({
    y: { grid: true, label: "Aantal geopereerde treinen" },
    x: { type: "utc", label: "Maand" },
    color: {
        type: "categorical",
        domain: train_types,
        legend: true
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


Wat opvalt: slechts drie treintypes (**IC, P, L**) komen **consistent** voor in elk jaar van de dataset. Andere types, zoals **ICT, INT en S**, zijn maar gedurende een **korte periode** opgenomen. Dit kan een vertekend beeld geven van de algemene trends.

Daarom nemen we deze treintypes **niet altijd mee** in verdere vergelijkingen of verbanden. Zo houden we de analyses **representatief** en vermijden we **foutieve conclusies**.

## Verdere inzichten

Wanneer we de **stiptheid van de treinen** door de jaren heen bekijken, kunnen we mogelijk trends ontdekken: is de situatie **verbeterd** of net **verslechterd**? Hieronder tonen we dat aan de hand van een **interactieve line chart**.

```js
const train_types_insights = Array.from(new Set(train_data.map(d => d["Train type"])));

const selected_types_input_insights = view(Inputs.checkbox(train_types, {
    value: train_types,
    label: "Selecteer trein types om te tonen",
    sort: true
}));
```

```js
Plot.plot({
    y: { grid: true, label: "Punctualiteit (%)", domain: [0, 100] },
    x: { type: "utc", label: "Maand" },
    color: {
        type: "categorical",
        domain: train_types_insights,
        legend: true,
        // range: ["#4682B4", "#FFA500", "#228B22", "#9370DB", "#DC143C", "#DAA520"]
    },
    marks: [
        Plot.lineY(
            sorted_train_data.filter(d => selected_types_input_insights.includes(d["Train type"])),
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

Hoewel we niet voor elk treintype gegevens uit elk jaar hebben, springt één ding meteen in het oog: de **INT-trein** scoort het **slechtst op stiptheid**. Daarnaast blijft de **algemene stiptheid** doorheen de jaren **vrij stabiel** rond de **90%**, met hier en daar lichte schommelingen.

Om te onderzoeken of het **seizoen invloed heeft op de vertragingen**, visualiseren we per treintype de gemiddelde vertraging per seizoen.

```js
const seasonOrder = ({Winter: 0, Lente: 1, Zomer: 2, Herfst: 3});
const grouped_and_normalized_by_season = d3.rollups(seasonal_train_data,
    v => {
        const total_delay = d3.sum(v, d => d["Minutes of delay"]);
        const total_trains = d3.sum(v, d => d["Number of operated trains"]);
        return {
            "Normalized delay": total_delay / total_trains
        };
    },
    d => d["Train type"],
    d => d["season"]
);

const flattened = grouped_and_normalized_by_season.flatMap(([trainType, seasonData]) =>
    seasonData.map(([season, values]) => ({
        "Train type": trainType,
        "season": season,
        "Normalized delay": values["Normalized delay"]
    }))
);

const normalized = train_types.flatMap(type => {
    const filtered = flattened.filter(d => d["Train type"] === type);
    const total = d3.sum(filtered, d => d["Normalized delay"]);
    return filtered.map(d => ({
        ...d,
        "Normalized^2 delay": d["Normalized delay"] / total
    }));
});

const layoutMap = new Map(train_types.map((type, i) => {
    return [type, {facetRow: Math.floor(i / 3), facetCol: i % 3}]
}));

const gridChartsData = normalized.sort((a, b) => d3.ascending(seasonOrder[a["season"]], seasonOrder[b["season"]])).map(data => ({
    ...data,
    ...layoutMap.get(data["Train type"])
}));

const color = d3.scaleOrdinal()
    .domain(["Winter", "Lente", "Zomer", "Herfst"])
    .range(["#4B9CD3","#8BC34A","#FFC107","#FF5722"]);

const row1 = gridChartsData.filter(d => d["facetRow"] === 0);
const row2 = gridChartsData.filter(d => d["facetRow"] === 1);
```

```js
for (const row of [row1, row2]) {
    display(html`<div style="margin-bottom: 1rem; margin-top: 1rem">
    ${Plot.plot({
    facet: {
        data: row,
        x: "Train type",
        columns: 3,
        label: "Trein type"
    },
    x: {
        label: "Seizoen"
    },
    y: {
        label: "Genormaliseerde vertraging",
        domain: [0, Math.min(d3.max(row, e => e["Normalized^2 delay"]) + 0.2, 1)],
        grid: true
    },
    marks: [
        Plot.barY(
            row,
            {
                x: "season",
                y: "Normalized^2 delay",
                fill: d => color(d["season"]),
                sort: {x: "x", order: null},
                tip: true
            }),
    ],
    marginBottom: 40
    })}`);
}
```

De **winterpiek** bij **ICT** is ook te zien in de line chart hierboven over de stiptheid van de treinsoorten. In **2022** zie je een duidelijke daling in stiptheid naar 70%.

Op basis van al deze grafieken samen kunnen we echter **geen duidelijk verband** vaststellen tussen seizoen en vertraging.
Zo zien we geen algemene trend over al de treintypes heen. De variaties lijken eerder **willekeurig dan seizoensgebonden**.

Echter, als we ons beperken tot de 3 treintypes waarvoor we over alle jaren **consistente data** hebben, valt er wel iets interessants op.

```js
const trains = ["IC", "P", "L"];
const filtered_train_types = seasonal_train_data.filter(d => trains.includes(d["Train type"]));
const grouped_by_train_type = d3.rollups(
    filtered_train_types,
    v => ({
        total_delay: d3.sum(v, d => d["Minutes of delay"]),
        total_trains: d3.sum(v, d => d["Number of operated trains"])
    }),
    d => d["Train type"],
    d => d.season
);

const flattened = grouped_by_train_type.flatMap(([trainType, seasonData]) => {
    return seasonData.map(([season, cumulative]) => {
        const normalized = cumulative.total_delay / cumulative.total_trains;
        return {
            "Train type": trainType,
            "season": season,
            "normalized": normalized
        };
    })
});

const total_per_train_type = {};

for (const train of trains) {
    total_per_train_type[train] = d3.sum(flattened.filter(d => d["Train type"] === train), d => d["normalized"]);
}

const percentagePerSeasonAndTrainType = {};

const in_percentages = flattened.map(d => {
    const val = Math.round(d["normalized"] * 1e2 / total_per_train_type[d["Train type"]]);
    percentagePerSeasonAndTrainType[d["Train type"]] =  percentagePerSeasonAndTrainType[d["Train type"]] || {};
    percentagePerSeasonAndTrainType[d["Train type"]][d.season] = val;

    return {
        ...d,
        value: val
    };
});

// fix the the floating point errors:
for (const train of trains) {
    const row = in_percentages.filter(d => d["Train type"] === train);
    const total = d3.sum(row, d => d["value"]);
    const error = 100 - total;

    row[row.indexOf(row.reduce((prev, curr) => prev["value"] > curr["value"] ? prev : curr))]["value"] += error;
}

const result = trains.flatMap(t => {
    const rows = in_percentages.filter(d => d["Train type"] === t);
    rows.sort((a, b) => seasonOrder[a.season] < seasonOrder[b.season] ? -1 : 1);

    let units = rows.flatMap(d => {
        return Array(d["value"]).fill().map(() => {
            return {
                season: d.season,
                type: t
            }
        });
    });

    if (units.length > 100) units.length = 100;
    while (units.length < 100) units.push({season: null, type: t})
    units = units.map((d, i) => ({...d}));

    return units;
});
```

```js
display(
    Plot.plot({
        facet: {
            data:    result,
            x:       d => d.type,           // string‐accessor into each facet object
            columns: result.length,    // force one column per train type
            label:   null              // you can hide the “type” header if you like
        },
        x: { axis: null },
        y: { axis: null },
        color: {
            domain: color.domain(),
            range:  color.range(),
            legend: true
        },
        marks: [
            Plot.cell(result, Plot.stackX({
                y: (_, i) => i % 10,
                fill: "season",
                title: d => `${d.season} - ${percentagePerSeasonAndTrainType[d.type][d.season]}%`
            }))
        ]
    })
);
```

Over het algemeen is er een **seizoenspatroon** in de gemiddelde vertraging te zien: de **herfst** kent de hoogste vertragingen, gevolgd door de **winter**, daarna de **lente**, en ten slotte de **zomer**, die het best scoort.
Bij de IC is de **winter** en **lente** echter wel gelijk aan elkaar, maar voor de rest klopt dit patroon wel.

Om te achterhalen of **één bepaald treintype meer bijdraagt aan de totale vertragingen** dan een andere, visualiseren we de gegevens in een **boxplot**. Deze grafiek geeft ons een **gedetailleerd beeld van de spreiding en verdeling** van vertragingen per treintype. Hier laten we opnieuw de treintypes weg die niet frequent voorkomen in de dataset.

```js
const filtered_data = train_data
    .filter(d => !["ICT", "INT", "S"].includes(d["Train type"]))
    .map(d => ({
        ...d,
        "Average Delay": d["Minutes of delay"] / d["Number of operated trains"]
    }));

const delay_mode = view(Inputs.select(["Gemidelde vertraging (relatief)", "Minuten vertraging (absoluut)"], {
    label: "Kies vertoning modus",
    value: "Gemidelde vertraging (relatief)"
}));
```

```js
Plot.plot({
  height: 400,
  marginLeft: 80,
  x: { label: delay_mode },
  y: { label: "Trein Type" },
  color: { legend: false },
  marks: [
    Plot.boxX(filtered_data, {
      y: "Train type",
      x: delay_mode === "Gemidelde vertraging (relatief)" ? "Average Delay" : "Minutes of delay",
      fill: "lightsteelblue"
    })
  ]
})
```

Voor extra duidelijkheid tonen we zowel **relatieve** als **absolute cijfers**:
 - De **relatieve vertragingen** zijn gemiddelden, berekend door de totale vertraging te delen door het aantal gereden treinen.
 - De **absolute vertragingen** tonen het totaal aan vertraging per type, en geven zo weer hoe ernstig de impact kan zijn in omvang.

Deze combinatie laat toe om niet alleen te zien **hoe vaak treinen vertraging hebben**, maar ook **hoe zwaar die vertragingen doorwegen per treintype**.

Uit de **boxplot** kunnen we halen dat de **L** trein gemiddeld beter doet dan de andere treinen — dit op basis van de 3 treintypes waarvoor we over **alle jaren data** hebben.
We zagen dat deze trein op de 2e plaats komt van de meest voorkomende treinsoorten en dus een representatieve trein is in de dataset. Dit duidt dus op de **beste stiptheid** van deze **3 treintypes** aan.

De **IC-trein**, die het vaakst voorkomt in de dataset, vertoont het **meeste minuten absolute vertraging**. Hoewel deze het meeste voorkomt, geeft deze trein dus de grootste impact op de totale vertragingen.

## Conclusie

Hoewel er een licht patroon te zien is bij de **seizoenen**, kunnen we die niet veralgemenen voor alle treintypes. Ook zijn de verschillen tussen de seizoenen erg klein. Hier kunnen we dus **niet veel uit besluiten**.

Wanneer we kijken naar de **3 treintypes** waarvoor we over **alle jaren data** hebben, kunnen we wel iets besluiten. De **L-trein** vertoont **gemiddeld de minste vertragingen** en de **IC-treinen** zijn degene met het **grootste aandeel aan vertragingen**.

Kijken we daarentegen naar **alle treinen**, dan valt de **INT-trein** op als de **minst stipte**. Toch moeten we daar **voorzichtig mee zijn**: omdat er van de INT-trein geen data is over alle jaren, kunnen we daaruit **geen conclusies trekken**.

De onderstaande **area chart** toont duidelijk hoe de 3 treintypes doorheen de jaren het **aandeel aan vertragingen** hebben veroorzaakt.

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
  marginLeft: 60,
  y: {
    grid: true,
    label: "Gecumuleerde Minuten Vertraging"
  },
  x: {
    grid: true,
    type: "utc",
    label: "Maand"
  },
  color: {
    type: "categorical",
    domain: included_types,
    range: ["#4682B4", "#FFA500", "#228B22", "#9370DB", "#DC143C", "#DAA520"],
    label: "Train type",
    legend: true
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
