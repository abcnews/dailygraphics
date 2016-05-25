// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }
};

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
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
    renderColumnChart({
        container: '#column-chart',
        width: containerWidth,
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;
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
    var containerElement = d3.select(config.container);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .classed('graphic-wrapper', true);

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = Math.ceil((config.width * aspectHeight) / aspectWidth) - margins.top - margins.bottom;

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins.left + margins.right)
        .attr('height', chartHeight + margins.top + margins.bottom)
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
            return d[labelColumn];
        }));

    var min = d3.min(DATA, function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var yScale = d3.scale.linear()
        .domain([
            min,
            d3.max(DATA, function(d) {
                return d[valueColumn];
            })
        ])
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
            return fmtComma(d);
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
    var yAxisGrid = function() {
        return yAxis;
    };

    // chartElement.append('g')
    //     .attr('class', 'y grid')
    //     .call(yAxisGrid()
    //         .tickSize(-chartWidth, 0)
    //         .tickFormat('')
    //     );

    var colorList = colorArray(LABELS, singleColors);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(DATA)
        .enter()
        .append('rect')
            .attr('class', function (d) {
                return 'bar bar-' + d[labelColumn];
            })
            .attr({
                x: function (d) {
                    return xScale(d[labelColumn]);
                },
                y: function (d) {
                    if (d[valueColumn] < 0) {
                        return yScale(0);
                    }

                    return yScale(d[valueColumn]);
                },
                width: xScale.rangeBand(),
                height: function (d) {
                    if (d[valueColumn] < 0) {
                        return yScale(d[valueColumn]) - yScale(0);
                    }

                    return yScale(0) - yScale(d[valueColumn]);
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
                });

            chartWrapper.selectAll('.value text.over')
                .classed('over', false);

            chartWrapper.selectAll('.bars rect:nth-child(' + index + ')')
                .attr('fill', highlightColor);

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
            .text(function(d) {
                return fmtComma(d[valueColumn]);
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = 0;

                if (d[valueColumn] < 0) {
                    barHeight = yScale(d[valueColumn]) - yScale(0);

                    if (textHeight + valueGap * 2 < barHeight) {
                        d3.select(this).classed('in', true);
                        return -(textHeight - valueGap / 2);
                    } else {
                        d3.select(this).classed('out', true);
                        return textHeight + valueGap;
                    }
                } else {
                    barHeight = yScale(0) - yScale(d[valueColumn]);

                    if (textHeight + valueGap * 2 < barHeight) {
                        d3.select(this).classed('in', true);
                        return textHeight + valueGap;
                    } else {
                        d3.select(this).classed('out', true);
                        return -(textHeight - valueGap / 2);
                    }
                }
            })
            .attr('text-anchor', 'middle');
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
