---
theme: dashboard
title: work-in-progress 
toc: true
---

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