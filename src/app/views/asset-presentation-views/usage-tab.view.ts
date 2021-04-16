import { AssetsBrowserClient } from '../../assets-browser.client'
import { AssetTabView } from "./data"
import * as d3 from 'd3'
import { AssetWithAccessInfo } from '../../data'
import { AppState } from '../../app.state'
import { VirtualDOM } from '@youwol/flux-view'


export class UsageTabView extends AssetTabView {


    constructor(asset: AssetWithAccessInfo, appState: AppState) {
        super("usage", "Usage", asset, appState)
    }

    view(): VirtualDOM {

        return {
            class: "d-flex w-100 h-100 p-4",
            children: [
                {
                    class: "d-flex w-100 h-100 flex-column",
                    children: [
                        {
                            tag: 'label',
                            class: this.titleClass, style: this.titleStyle,
                            innerText: "Statistics"
                        },
                        {
                            id: 'graph_statistics_container',
                            class: 'flex-grow-1 fv-bg-background',
                            connectedCallback: (elem) => {
                                elem.subscriptions.push(
                                    AssetsBrowserClient.statistics$(this.asset.assetId, 10).subscribe(
                                        ({ accessHistory: { bins, binSize } }) => {
                                            if (bins.length > 0)
                                                this.renderGraph(bins, binSize)
                                        }
                                    )
                                )                                
                            }
                        }
                    ]
                }
            ]
        }
    }


    renderGraph(data: Array<{ date: string, count: number }>, binSize) {

        let padding = 30
        let svg = d3.select("#graph_statistics_container")
            .append("svg:svg").attr("class", "w-100 h-100")

        let [width, height] = [svg.node().clientWidth, svg.node().clientHeight]
        let [firstDate, lastDate] = [new Date(data[0].date), new Date(Date.now())]
        //lastDate.setHours(23,59,59,999)

        let x = d3.scaleTime().domain([firstDate, lastDate]).nice().range([padding, width - padding])
        let y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([height - padding, padding])
        let binWidth = x(binSize * 1000) - x(0)
        let xAxis = g => g.attr("transform", `translate(0,${height - padding})`).call(d3.axisBottom(x))
        let yAxis = g => g.attr("transform", `translate(${padding},0)`).call(d3.axisLeft(y))
        svg.append("g").attr("fill", "steelblue")
            .selectAll("rect")
            .data(data)
            .join("rect")
            .attr("width", Math.floor(binWidth))
            .attr("x", d => x(new Date(d.date)))
            .attr("y", d => y(d.count))
            .attr("height", d => y(0) - y(d.count))
        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);
    }

}


