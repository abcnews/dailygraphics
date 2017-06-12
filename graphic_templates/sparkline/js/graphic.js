'use strict';
// Global vars
var pymChild = null;
var isMobile = false;
// var xCol = 'x';
var KEY_NESTED_DATA;
// var X_NESTED_DATA;
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

    // Map through data anc convert to numbers
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
                // x: v[xCol],
                amt: v[d],
                key: d,
            };
        }));
    });

    // Remove undefined amounts in data
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
    var labelWidth = parseInt(LABELS.labelWidth || 50);
    var labelMargin = parseInt(LABELS.labelMargin || 6);

    var dataLabelWidth = parseInt(LABELS.dataLabelWidth || 90);
    var dataLabelMargin = parseInt(LABELS.dataLabelMargin || 8);

    // var aspectRatio = getAspectRatio(LABELS.ratio);

    var sparklineHeight = parseInt(LABELS.chartHeight || 50);
    var circleRadius = parseFloat(LABELS.circleRadius || 1.5);
    var endCircleRadius = parseFloat(LABELS.endCircleRadius || 2);


    var margins = {
        top: parseInt(LABELS.marginTop || 0),
        right: parseInt(LABELS.marginRight || dataLabelWidth + dataLabelMargin),
        bottom: parseInt(LABELS.marginBottom || 0),
        left: parseInt(LABELS.marginLeft || labelWidth + labelMargin),
    };

    if (isMobile) {
        margins.right = margins.right * 0.9;
        margins.left = margins.left * 0.9;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#sparkline-chart')
    containerElement.html('');


    function drawSparklines(chartData) {
        
        /*
        * Create the root SVG element
        */
        var chartWrapper = containerElement.append('div')
            .attr('class', 'graphics-wrapper')

        // Calculate actual chart dimensions
        var innerWidth = chartWrapper.node().getBoundingClientRect().width;
        var chartWidth = innerWidth - margins.left - margins.right;
        var chartHeight = sparklineHeight - margins.top - margins.bottom;

        var xScale = d3.scale.linear().range([0 + endCircleRadius, chartWidth - endCircleRadius]);
        var yScale = d3.scale.linear().range([chartHeight - endCircleRadius, 0 + endCircleRadius]);

        xScale.domain([0, chartData.values.length - 1] );
        yScale.domain(d3.extent(chartData.values, function(d) { return d.amt; }));

        var colorList = colorArray(LABELS, MONOCHROMECOLORS);

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
                'position': 'absolute',
                'right': dataLabelWidth - dataLabelMargin + 'px',
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

        // End value
        var endValueLabel = chartWrapper.append('div')
            .classed('sparkline-values', true)
            .style({
                'position': 'absolute',
                'right': dataLabelWidth / 2 - dataLabelMargin + 'px',
                'height': chartHeight + 'px',
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
                        .style('text-align', 'left');


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
            .interpolate("linear")
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
                    .attr('class', 'sparkcircle data-minimum')
                    .attr('cx', xScale(i))
                    .attr('cy', yScale(minAmt))
                    .attr('r', circleRadius);
            }

            // Find and mark maximum point
            if (d.amt === yMax) {
                maxAmt = d.amt;

                chartElement.append('circle')
                    .attr('class', 'sparkcircle data-maximum')
                    .attr('cx', xScale(i))
                    .attr('cy', yScale(maxAmt))
                    .attr('r', circleRadius);
            }
        });


        chartElement.append('circle')
            .attr('class', 'sparkcircle')
            .attr('cx', xScale(chartData.values.length - 1))
            .attr('cy', yScale(endAmt))
            .attr('r', endCircleRadius);


        // Render data values
        if (LABELS.decimalPlaces) {
            minMaxValueLabel.html(LABELS.valuePrefix + Number(maxAmt).toFixed(LABELS.decimalPlaces) +
                '<br>' + LABELS.valuePrefix + Number(minAmt).toFixed(LABELS.decimalPlaces));
            endValueLabel.html(LABELS.valuePrefix + Number(endAmt).toFixed(LABELS.decimalPlaces));
        } else {
            minMaxValueLabel.html(LABELS.valuePrefix + maxAmt +
                '<br>' + LABELS.valuePrefix + minAmt);
            endValueLabel.html(LABELS.valuePrefix + endAmt);
        }



};



    // For each data column render a chart
    KEY_NESTED_DATA.forEach(function(d, i) {
            drawSparklines(d);
        });




};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;