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
    renderBarChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a bar chart.
 */
var renderBarChart = function () {
    /*
     * Setup
     */
    var barHeight = parseInt(LABELS.barHeight || 30, 10);
    var barGap = parseInt(LABELS.barGap || 5, 10);
    var labelWidth = parseInt(LABELS.labelWidth || 85, 10);
    var labelMargin = parseInt(LABELS.labelMargin || 6, 10);
    var valueGap = parseInt(LABELS.valueGap || 6, 10);

    var margins = {
        top: parseInt(LABELS.marginTop || 0, 10),
        right: parseInt(LABELS.marginRight || 15, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || (labelWidth + labelMargin), 10),
    };

    var ticksX = parseInt(LABELS.ticksX || 4, 10);
    var roundTicksFactor = parseInt(LABELS.roundTicksFactor || 5, 10);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#bar-chart');
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = ((barHeight + barGap) * DATA.length);

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
    var minX;
    if (LABELS.minX) {
        minX = parseFloat(LABELS.minX, 10);
    } else {
        minX = d3.min(DATA, function (d) {
            return Math.floor(d.amt / roundTicksFactor) * roundTicksFactor;
        });

        if (min > 0) {
            minX = 0;
        }
    }

    var maxX;
    if (LABELS.maxX) {
        maxX = parseFloat(LABELS.maxX, 10);
    } else {
        maxX = d3.max(DATA, function (d) {
            return Math.ceil(d.amt / roundTicksFactor) * roundTicksFactor;
        });
    }

    var xScale = d3.scale.linear()
        .domain([minX, maxX])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX);

    /*
     * Render axes to chart.
     */
    /*
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);
    */
    /*
     * Render grid to chart.
     */
    /*
    var xAxisGrid = function() {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
    );
    */

    var colorList = colorArray(LABELS, SINGLECOLORS);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    var accessibleColorList = [];
    for (var j = 0; j < colorList.length; j++) {
        accessibleColorList[j] = getAccessibleColor(colorList[j]);
    }

    var accessibleColorScale = d3.scale.ordinal()
        .range(accessibleColorList);

    /*
     * Render bars to chart.
     */
    var bars = chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(DATA)
        .enter()
        .append('rect')
            .attr('class', function (d, i) {
                return 'bar-' + i + ' ' + classify(d.label);
            })
            .attr({
                x: function (d) {
                    if (d.amt >= 0) {
                        return xScale(0);
                    }

                    return xScale(d.amt);
                },

                y: function (d, i) {
                    return i * (barHeight + barGap);
                },

                width: function (d) {
                    return Math.abs(xScale(0) - xScale(d.amt));
                },

                height: barHeight,

                fill: function (d, i) {
                    return colorScale(i);
                },
            });

    if (LABELS.theme == 'highlight') {
        chartWrapper.on('mousemove', function (e) {
            var pos = d3.mouse(chartWrapper.node());
            var index = Math.floor(pos[1] / (barHeight + barGap)) + 1;

            bars
                .attr('fill', function (d, i) {
                    return colorScale(i);
                })
                .filter(':nth-child(' + index + ')')
                    .attr('fill', highlightColor);
        });
    }

    /*
     * Render 0-line.
     */
    /*
    chartElement.append('line')
        .attr('class', 'zero-line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', 0)
        .attr('y2', chartHeight);
    */

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .style({
            width: labelWidth + 'px',
            top: margins.top + 'px',
            left: 0,
        })
        .selectAll('li')
        .data(DATA)
        .enter()
        .append('li')
            .style({
                width: labelWidth + 'px',
                height: barHeight + 'px',
                left: 0,
                top: function (d, i) {
                    return (i * (barHeight + barGap)) + 'px';
                },
            })
            .attr('class', function (d) {
                return classify(d.label);
            })
            .append('span')
                .text(function (d) {
                    return d.label;
                });

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(DATA)
        .enter()
        .append('text')
            .text(function (d) {
                return formattedNumber(
                    d.amt,
                    LABELS.prefixX,
                    LABELS.suffixX,
                    LABELS.maxDecimalPlaces
                );
            })
            .attr({
                x: function (d) {
                    return xScale(d.amt);
                },

                y: function (d, i) {
                    return i * (barHeight + barGap);
                },

                dx: function (d) {
                    var xStart = xScale(d.amt);
                    var textWidth = this.getComputedTextLength();

                    // Negative case
                    if (d.amt < 0) {
                        var outsideOffset = -(valueGap + textWidth);

                        if (xStart + outsideOffset < 0) {
                            d3.select(this).classed('in', true);
                            return valueGap;
                        } else {
                            d3.select(this).classed('out', true);
                            return outsideOffset;
                        }

                    // Positive case
                    } else {
                        if (xStart + valueGap + textWidth > chartWidth) {
                            d3.select(this).classed('in', true);
                            return -(valueGap + textWidth);
                        } else {
                            d3.select(this).classed('out', true);
                            return valueGap;
                        }
                    }
                },

                dy: (barHeight / 2) + 3,

                fill: function (d, i) {
                    return accessibleColorScale(i);
                },

            });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
