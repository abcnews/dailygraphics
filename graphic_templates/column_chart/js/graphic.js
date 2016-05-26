// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
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
 * Format graphic data for processing by D3.
 */
var formatData = function () {
    DATA.forEach(function (d) {
        d.amt = +d.amt;
    });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart!
    renderColumnChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a column chart.
 */
var renderColumnChart = function () {
    /*
     * Setup chart container.
     */
    var aspectRatio = getAspectRatio(LABELS.ratio);

    var valueGap = parseInt(LABELS.valueGap || 6, 10);

    var margins = {
        top: parseInt(LABELS.marginTop || 5, 10),
        right: parseInt(LABELS.marginRight || 0, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || 0, 10),
    };

    var ticksY = 4;
    var roundTicksFactor = parseInt(LABELS.roundTicksFactor || 50, 10);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#column-chart');
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .classed('graphic-wrapper', true);

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = Math.ceil(innerWidth / aspectRatio) - margins.top - margins.bottom;

    var chartElement = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        .append('g')
            .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

    var overlay = chartElement.append('rect')
        .attr({
            width: chartWidth,
            height: chartHeight,
            fill: 'transparent',
        });

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], 0.1)
        .domain(DATA.map(function (d) {
            return d.label;
        }));

    var min = d3.min(DATA, function (d) {
        return Math.floor(d.amt / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(DATA, function (d) {
        return d.amt;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(0)
        .tickSize(0)
        .tickPadding(5);

    // .tickFormat(function(d, i) {
    //     return d;
    // });

    /*
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return formattedNumber(d);
        });
    */

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis)
        .select('path').remove();

    // chartElement.append('g')
    //     .attr('class', 'y axis')
    //     .call(yAxis)

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function () {
        return yAxis;
    };

    // chartElement.append('g')
    //     .attr('class', 'y grid')
    //     .call(yAxisGrid()
    //         .tickSize(-chartWidth, 0)
    //         .tickFormat('')
    //     );

    var colorList = colorArray(LABELS, SINGLECOLORS);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .classed('bars', true)
        .selectAll('rect')
        .data(DATA)
        .enter()
        .append('rect')
            .attr('class', function (d) {
                return 'bar bar-' + d.label;
            })
            .attr({
                x: function (d) {
                    return xScale(d.label);
                },

                y: function (d) {
                    if (d.amt < 0) {
                        return yScale(0);
                    }

                    return yScale(d.amt);
                },

                width: xScale.rangeBand(),

                height: function (d) {
                    if (d.amt < 0) {
                        return yScale(d.amt) - yScale(0);
                    }

                    return yScale(0) - yScale(d.amt);
                },

                fill: function (d, i) {
                    return colorScale(i);
                },
            });

    if (LABELS.theme == 'highlight') {
        chartWrapper.on('mousemove', function (e) {
            var pos = d3.mouse(chartWrapper.node());
            var index = Math.floor(pos[0] / (xScale.rangeBand() + valueGap)) + 1;

            chartWrapper.selectAll('.bars rect')
                .attr('fill', function (d, i) {
                    return colorScale(i);
                })
                .filter(':nth-child(' + index + ')')
                    .attr('fill', highlightColor);

            chartWrapper.selectAll('.value text.over')
                .classed('over', false);

            chartWrapper.selectAll('.value text.out:nth-child(' + index + ')')
                .classed('over', true);

        });
    }

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .classed('value', true)
        .selectAll('text')
        .data(DATA)
        .enter()
        .append('text')
            .text(function (d) {
                return formattedNumber(d.amt);
            })
            .attr({
                x: function (d, i) {
                    return xScale(d.label) + (xScale.rangeBand() / 2);
                },

                y: function (d) {
                    return yScale(d.amt);
                },

                dy: function (d) {
                    var textHeight = d3.select(this).node().getBBox().height;
                    var barHeight = 0;

                    if (d.amt < 0) {
                        barHeight = yScale(d.amt) - yScale(0);

                        if (textHeight + valueGap * 2 < barHeight) {
                            d3.select(this).classed('in', true);
                            return -(textHeight - valueGap / 2);
                        } else {
                            d3.select(this).classed('out', true);
                            return textHeight + valueGap;
                        }
                    } else {
                        barHeight = yScale(0) - yScale(d.amt);

                        if (textHeight + valueGap * 2 < barHeight) {
                            d3.select(this).classed('in', true);
                            return textHeight + valueGap;
                        } else {
                            d3.select(this).classed('out', true);
                            return -(textHeight - valueGap / 2);
                        }
                    }
                },

                'text-anchor': 'middle',
            });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
