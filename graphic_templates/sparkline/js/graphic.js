'use strict';

// Global vars
var pymChild = null;
var isMobile = false;
var KEY_NESTED_DATA;
var FLAT_DATA = [];

var lineKeys = d3.set(d3.map(DATA[0]).keys());


/* Initialize the graphic.
----------------------------------------------------*/
var onWindowLoaded = function () {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render,
        });
    } else {
        pymChild = new pym.Child({});
    }
};


/*
 * Re-format graphic data for processing by D3.
 */
var formatData = function () {

    // Map through data and convert to numbers
    DATA = DATA.map(function (obj) {
        return d3.entries(obj).reduce(function (memo, val) {
            var key = val.key;
            var value = val.value;
            var formattedValue;

            if (value) formattedValue = +value; // turn string into number

            memo[key] = formattedValue;
            return memo;
        }, {});
    });


    /*
     * Restructure tabular data for easier charting.
     */
    lineKeys.forEach(function (d) {
        FLAT_DATA = FLAT_DATA.concat(DATA.map(function (v) {
            return {
                amt: v[d],
                key: d,
            };
        }));
    });

    // Remove undefined amounts caused by uneven data samples
    FLAT_DATA = FLAT_DATA.filter(function(element) {
        return element.amt !== undefined;
    })

    // Nest data under data keys
    KEY_NESTED_DATA = d3.nest()
        .key(function (d) { return d.key; })
        .entries(FLAT_DATA);
};


/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart
    renderSparklineChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};


/*
 * Render a Sparkline chart.
 */
var renderSparklineChart = function () {
    /*
     * Setup
     */
    var labelWidth = parseInt(LABELS.labelWidth || 55);
    var labelMargin = parseInt(LABELS.labelMargin || 4);

    var dataLabelWidth = parseInt(LABELS.dataLabelWidth || 80);
    var dataLabelMargin = parseInt(LABELS.dataLabelMargin || 4);

    var sparklineHeight = parseInt(LABELS.chartHeight || 50);

    var circleRadius = parseFloat(LABELS.circleRadius || 1.6);
    var endCircleRadius = parseFloat(LABELS.endCircleRadius || 2.2);

    var margins = {
        top: parseInt(LABELS.marginTop || 0),
        right: parseInt(LABELS.marginRight || dataLabelWidth + dataLabelMargin),
        bottom: parseInt(LABELS.marginBottom || 0),
        left: parseInt(LABELS.marginLeft || labelWidth + labelMargin),
    };


    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#sparkline-chart')
    containerElement.html('');


    // Set up colors
    var colorList = colorArray(LABELS, MONOCHROMECOLORS);
    var colorScale = d3.scale.ordinal()
        .range(colorList);


    function drawSparklines(chartData) {
        /*
         * Create the root SVG element
         */
        var chartWrapper = containerElement.append('div')
            .attr('class', 'graphics-wrapper')

        /*
         * Calculate chart dimensions
         */

        // Spread sparklines horizontally in 2 columns if Desktop
        if (isMobile || LABELS.fullWidth === "on") {
            var innerWidth = chartWrapper.node().getBoundingClientRect().width;
        } else {
            var innerWidth = chartWrapper.node().getBoundingClientRect().width / 2 - 18;
            chartWrapper
                .style('display', 'inline-block')
                .style('margin', '0 9px');
        }

        var chartWidth = (innerWidth - margins.left - margins.right);
        var chartHeight = sparklineHeight - margins.top - margins.bottom;

        var xScale = d3.scale.linear().range([0 + endCircleRadius, chartWidth - endCircleRadius]);
        var yScale = d3.scale.linear().range([chartHeight - endCircleRadius, 0 + endCircleRadius]);

        xScale.domain([0, chartData.values.length - 1] );
        yScale.domain(d3.extent(chartData.values, function(d) { return d.amt; }));

        var minAmt;
        var maxAmt;
        var endAmt = chartData.values[chartData.values.length - 1].amt;


        // Left side label key
        chartWrapper.append('div')
            .classed('sparkline-key', true)
            .style({
                'position': 'absolute',
                'height': chartHeight + 'px',
            })
            .append('ul')
                .classed('labels', true)
                .append('li')
                    .style('line-height', chartHeight + 'px')
                    .append('span')
                        .style('min-width', labelWidth + 'px')
                        .text(chartData.key);

        // Min and Max values
        var minMaxValueLabel = chartWrapper.append('div')
            .classed('sparkline-values', true)
            .style({
                'position': 'relative',
                'display': 'inline-block',
                'left': chartWidth + labelWidth + labelMargin + dataLabelMargin + 'px',
                'height': chartHeight + 'px',
            })
            .append('ul')
                .classed('labels', true)
                .classed('end-data', true)
                .append('li')
                    .classed('min-max', true)
                    .style({
                        'display': 'flex',
                        'justify-content': 'center',
                        'flex-direction': 'column',
                        'min-height': chartHeight + 'px'
                    })
                    .append('span')
                        .style('min-width', dataLabelWidth / 2 + 'px')
                        .style('text-align', 'left');

        // Final value
        var endValueLabel = chartWrapper.append('div')
            .classed('sparkline-values', true)
            .style({
                'position': 'relative',
                'display': 'inline-block',
                'left': chartWidth +
                        labelWidth +
                        labelMargin +
                        dataLabelMargin +
                        (dataLabelWidth / 2) +
                        dataLabelMargin +
                        'px',
                'height': chartHeight + 'px'
            })

            .append('ul')
                .classed('labels', true)
                .append('li')
                    .classed('end-value', true)
                    .style({
                        'display': 'flex',
                        'justify-content': 'center',
                        'flex-direction': 'column',
                        'min-height': chartHeight + 'px'
                    })
                    .append('span')
                        .style('min-width', dataLabelWidth / 2 + 'px')
                        .style('text-align', 'left')
                        .style('color', colorList[0]);


        // Sparkline chart
        var chartSvg = chartWrapper.append('svg')
            .attr({
                width: chartWidth + margins.left + margins.right,
                height: chartHeight + margins.top + margins.bottom,
            });
            

        var chartElement = chartSvg.append('g')
                .attr('transform', makeTranslate(margins.left, margins.top));



        var overlay = chartElement.append('rect')
            .attr({
                width: chartWidth,
                height: chartHeight,
                fill: 'transparent'
            });


        // Draw a sparkline
        var line = d3.svg.line()
            .interpolate(LABELS.interpolate || 'linear')
            .x(function(d, i) {
                return xScale(i);
            })
            .y(function(d) {
                return yScale(d.amt);
            });
            

        chartElement.append('path')
            .datum(chartData.values)
            .classed('sparkline', true)
            .attr('d', line);


        // Set minimum and maximup variables
        var yMin = d3.min(chartData.values, function(d) { return d.amt; });
        var yMax = d3.max(chartData.values, function(d) { return d.amt; });

        chartData.values.forEach(function(d, i) {
            // Find and mark minimum point
            if (d.amt === yMin) {
                minAmt = d.amt;

                chartElement.append('circle')
                    .attr('class', 'sparkcircle min-circle')
                    .attr('cx', xScale(i))
                    .attr('cy', yScale(minAmt))
                    .attr('r', circleRadius);
            }

            // Find and mark maximum point
            if (d.amt === yMax) {
                maxAmt = d.amt;

                chartElement.append('circle')
                    .attr('class', 'sparkcircle max-circle')
                    .attr('cx', xScale(i))
                    .attr('cy', yScale(maxAmt))
                    .attr('r', circleRadius);
            }
        });


        chartElement.append('circle')
            .attr('class', 'sparkcircle end-circle')
            .attr('cx', xScale(chartData.values.length - 1))
            .attr('cy', yScale(endAmt))
            .attr('r', endCircleRadius)
            .style('fill', colorList[0]);


        // Display info on hover or tap
        var tooltipLine = chartElement.append('line')
            .style("stroke", "#bbb")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", chartHeight)
            .style('visibility', 'hidden');

        var tooltipCircle = chartElement.append('circle')
            .attr('class', '')
            .attr('cx', 2)
            .attr('cy', 2)
            .attr('r', endCircleRadius)
            .style('fill', colorList[1])
            .style('visibility', 'hidden');

        var tooltipText = chartElement.append('text')
            .attr('x', 0)
            .attr('y', 8)
            .attr('fill', '#777')
            .style('font-size', '9px')
            .style('visibility', 'hidden');


        if (LABELS.tooltips !== "off") {
            chartElement
                .on("mousemove", function() {
                    var pos = d3.mouse(this)[0];

                    // Find closest point
                    function getClosestIndex (data, pos) {
                        var distance = Math.abs(0 - pos);
                        console.log(distance);
                        var lastVal;
                        for (var i = 0; i < data.length; i++) {
                            if (Math.abs(xScale(i) - pos) < distance) {
                                distance = Math.abs(xScale(i) - pos);
                                lastVal = i;
                            }
                        }
                        return lastVal;
                    }
                    console.log(xScale(getClosestIndex(chartData.values, pos)));

                    
                        
                        
                        
                        
                        // if (xIndex === pos) {
                        //     tooltipCircle
                        //         .style('visibility', 'visible')
                        //         .attr('cx', xScale(i))
                        //         .attr('cy', yScale(chartData.values[i].amt));

                        //     tooltipLine
                        //         .style('visibility', 'visible')
                        //         .attr('x1', xScale(i))
                        //         .attr('x2', xScale(i));

                        //     tooltipText
                        //         .style('visibility', 'visible')
                        //         .attr('x', xScale(i) + 4)
                        //         .html(chartData.values[i].amt);

                        //     // break; // don't process the rest
                        // }
                  

                })
                .on("mouseout", function(d, i) {
                    tooltipCircle.style("visibility", "hidden");
                    tooltipLine.style("visibility", "hidden");
                    tooltipText.style("visibility", "hidden");
                });
        }


        // Render data values
        if (LABELS.decimalPlaces) {
            minMaxValueLabel.html(
                LABELS.valuePrefix + 
                Number(maxAmt).toFixed(LABELS.decimalPlaces) +
                LABELS.valueSuffix +
                '<br>' + 
                LABELS.valuePrefix + 
                Number(minAmt).toFixed(LABELS.decimalPlaces) +
                LABELS.valueSuffix);
            endValueLabel.html(
                LABELS.valuePrefix + 
                Number(endAmt).toFixed(LABELS.decimalPlaces) +
                LABELS.valueSuffix
                );
        } else {
            minMaxValueLabel.html(
                LABELS.valuePrefix + 
                maxAmt +
                LABELS.valueSuffix +
                '<br>' + 
                LABELS.valuePrefix + 
                minAmt +
                LABELS.valueSuffix
                );
            endValueLabel.html(
                LABELS.valuePrefix + 
                endAmt +
                LABELS.valueSuffix
                );
        }
    };


    // For each data column render a chart
    KEY_NESTED_DATA.forEach(function(d, i) {
            
            lineObject = {
                key: randomThing(),
                values:  volatileChart(100, 0.09, 300)
            }


            // drawSparklines(lineObject); // random lines for testing
            drawSparklines(d);
        });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;





// Temporary testing functions 

function volatileChart (startPrice, volatility, numPoints) {
        var rval =  [];
        var now =+new Date();
        numPoints = numPoints || 100;
        for(var i = 1; i < numPoints; i++) {

            rval.push({x: now + i * 1000 * 60 * 60 * 24, amt: startPrice, key: "Rand"});

            var rnd = Math.random();
            var changePct = 2 * volatility * rnd;
            if ( changePct > volatility) {
                changePct -= (2*volatility);
            }
            startPrice = startPrice + startPrice * changePct;
        }
        return rval;
    }

function randomThing () {
    var things = [
        'Random 1', 
        'Random 2', 
        'Random 3',
        'Random 4',
        'Random 5',
        'Random 6',
        'Random 7'
        ];
    var thing = things[Math.floor(Math.random()*things.length)];
    return thing;
}