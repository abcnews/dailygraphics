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
            chartWrapper.style('display', 'inline-block')
                        .style('margin', '0 9px');
        }

        var chartWidth = (innerWidth - margins.left - margins.right);
        var chartHeight = sparklineHeight - margins.top - margins.bottom;

        var xScale = d3.scale.linear().range([0 + endCircleRadius, chartWidth - endCircleRadius]);
        var yScale = d3.scale.linear().range([chartHeight - endCircleRadius, 0 + endCircleRadius]);

        xScale.domain([0, chartData.values.length - 1]);
        yScale.domain(d3.extent(chartData.values, function(d) { return d.amt; }));

        var minAmt;
        var maxAmt;
        var endAmt = chartData.values[chartData.values.length - 1].amt;


        // Left side label key
        chartWrapper.append('div')
            .classed('sparkline-key', true)
            .style('height', chartHeight + 'px')
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
                'left': chartWidth + labelWidth + labelMargin + dataLabelMargin + 'px',
                'height': chartHeight + 'px',
            })
            .append('ul')
                .classed('labels', true)
                .classed('end-data', true)
                .append('li')
                    .classed('min-max', true)
                    .style({
                        'min-height': chartHeight + 'px'
                    });

        var minValueLabel = minMaxValueLabel.append('span')
            .style('min-width', dataLabelWidth / 2 + 'px')
            .style('text-align', 'left');

        var maxValueLabel = minMaxValueLabel.append('span')
            .style('min-width', dataLabelWidth / 2 + 'px')
            .style('text-align', 'left');


        // Final value
        var endValueLabel = chartWrapper.append('div')
            .classed('sparkline-values', true)
            .style({
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
                        'min-height': chartHeight + 'px'
                    })
                    .append('span')
                        .style('min-width', dataLabelWidth / 2 + 'px')
                        .style('color', colorScale(1));


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
            .style('fill', colorScale(1));


        // Display info on hover or tap
        if (LABELS.tooltips !== "off") {

            var textRect = chartElement.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 0)
                .attr("height", 0);

            var tooltipLine = chartElement.append('line')
                .style("stroke", "#bbb")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", chartHeight)
                .style('visibility', 'hidden');

            var tooltipCircle = chartElement.append('circle')
                .attr('class', 'sparkcircle')
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


            chartElement
                .on('mousemove', function() {
                    var pos = d3.mouse(this)[0];

                    // Returns closest point to mouse
                    function getClosestIndex (data, pos) {
                        var distance = Math.abs(0 - pos);
                        var lastVal;

                        for (var i = 0; i < data.length; i++) {
                            if (Math.abs(xScale(i) - pos) < distance) {
                                distance = Math.abs(xScale(i) - pos);
                                lastVal = i;
                            }
                        }
                        return lastVal;
                    }

                    var tooltipIndex = getClosestIndex(chartData.values, pos) || 0;

                    tooltipCircle
                        .attr('cx', xScale(tooltipIndex))
                        .attr('cy', yScale(chartData.values[tooltipIndex].amt));

                    tooltipLine
                        .attr('x1', xScale(tooltipIndex))
                        .attr('x2', xScale(tooltipIndex));

                    // Position label according to location
                    if (tooltipIndex < chartData.values.length / 2) {
                        tooltipText.attr('x', xScale(tooltipIndex) + 4)
                                   .attr('text-anchor', 'start')
                                   .text(chartData.values[tooltipIndex].amt.toFixed(LABELS.decimalPlaces));
                    } else {
                        tooltipText.attr('x', xScale(tooltipIndex) -4)
                                   .attr('text-anchor', 'end')
                                   .text(chartData.values[tooltipIndex].amt.toFixed(LABELS.decimalPlaces));
                    }

                    var bbox = tooltipText.node().getBBox();

                    textRect.attr("x", bbox.x)
                            .attr("y", bbox.y)
                            .attr("width", bbox.width)
                            .attr("height", bbox.height - 1)
                            .style("fill", "#fff")
                            .style('fill-opacity', '0.8');
                })
                .on('mouseover', function() {
                    tooltipCircle.style('visibility', 'visible');
                    tooltipLine.style('visibility', 'visible');
                    tooltipText.style('visibility', 'visible');
                    textRect.style('visibility', 'visible');
                })
                .on('mousedown', function() {
                    tooltipCircle.style('visibility', 'visible');
                    tooltipLine.style('visibility', 'visible');
                    tooltipText.style('visibility', 'visible');
                    textRect.style('visibility', 'visible');
                })
                .on("mouseout", function(d, i) {
                    tooltipCircle.style("visibility", "hidden");
                    tooltipLine.style("visibility", "hidden");
                    tooltipText.style("visibility", "hidden");
                    textRect.style('visibility', 'hidden');
                });
        }


        // Render data values
        if (LABELS.decimalPlaces) {
            minValueLabel.text(
                LABELS.valuePrefix + Number(maxAmt).toFixed(LABELS.decimalPlaces) + LABELS.valueSuffix);
            maxValueLabel.text(
                LABELS.valuePrefix + Number(minAmt).toFixed(LABELS.decimalPlaces) + LABELS.valueSuffix);
            endValueLabel.text(
                LABELS.valuePrefix + Number(endAmt).toFixed(LABELS.decimalPlaces) + LABELS.valueSuffix);
        } else {
            minValueLabel.text(LABELS.valuePrefix + maxAmt + LABELS.valueSuffix);
            maxValueLabel.text(LABELS.valuePrefix + minAmt + LABELS.valueSuffix);
            endValueLabel.text( LABELS.valuePrefix + endAmt + LABELS.valueSuffix);
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