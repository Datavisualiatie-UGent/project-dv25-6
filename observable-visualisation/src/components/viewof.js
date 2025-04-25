import { FileAttachment } from "@observablehq/runtime";
import * as Plot from "@observablehq/plot";
import { view } from "@observablehq/runtime";
import { checkbox } from "@observablehq/inputs";
// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const train_data = await FileAttachment("data/data_punctualite_typedetrain_comma.csv").csv({ typed: true });

const sorted_train_data = train_data.slice().sort(
    (a, b) => new Date(a.Month) - new Date(b.Month)
)

const train_types = Array.from(new Set(train_data.map(d => d["Train type"])));
const selected_types = view(checkbox(train_types, {
    label: "Select train types to display",
    value: (d) => true // all selected by default
}));

const filtered_sorted_data = train_data
    .filter(d => selected_types.includes(d["Train type"]))
    .sort((a, b) => new Date(a.Month) - new Date(b.Month))

// const color_scale = d3.scaleOrdinal()
//     .domain(train_types)
//     .range(["#4682B4", "#FFA500", "#228B22", "#9370DB", "#DC143C", "#DAA520"]);

export const train_plot = Plot.plot({
    y: { grid: true, label: "Number of operated trains" },
    x: { type: "utc", label: "Month" },
    color: {
        type: "categorical",
        domain: train_types,
        range: ["#4682B4", "#FFA500", "#228B22", "#9370DB", "#DC143C", "#DAA520"]
    },
    marks: [
        Plot.lineY(filtered_sorted_data, {
            x: "Month",
            y: "Number of operated trains",
            stroke: "Train type",
            marker: "circle",
            tip: true
        })
    ]
})

