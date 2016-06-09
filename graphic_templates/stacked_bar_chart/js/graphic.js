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
        var x0 = 0;

        d.values = [];

        for (var key in d) {
            if (key == 'label' || key == 'values') {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d.values.push({
                name: key,
                x0: x0,
                x1: x1,
                val: d[key],
            });

            x0 = x1;
        }
    });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart!
    renderStackedBarChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function () {
    /*
     * Setup
     */
    var barHeight = parseInt(LABELS.barHeight || 30, 10);
    var barGap = parseInt(LABELS.barGap || 10, 10);
    var segmentGap = 1;
    var labelWidth = parseInt(LABELS.labelWidth || 60, 10);
    var labelMargin = parseInt(LABELS.labelMargin || 6, 10);
    var valueGap = parseInt(LABELS.valueGap || 6, 10);

    var margins = {
        top: parseInt(LABELS.marginTop || 0, 10),
        right: parseInt(LABELS.marginRight || 20, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || (labelWidth + labelMargin), 10),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-bar-chart');
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
            .attr('transform', makeTranslate(margins.left, margins.top));

    /*
     * Create D3 scale objects.
     */
    var minX;
    if (LABELS.minX) {
        minX = parseFloat(LABELS.minX, 10);
    } else {
        minX = d3.min(DATA, function (d) {
            var lastValue = d.values[d.values.length - 1];
            return lastValue.x1;
        });

        if (minX > 0) {
            minX = 0;
        }
    }

    var maxX;
    if (LABELS.maxX) {
        maxX = parseFloat(LABELS.maxX, 10);
    } else {
        maxX = d3.max(DATA, function (d) {
            var lastValue = d.values[d.values.length - 1];
            return lastValue.x1;
        });
    }

    var xScale = d3.scale.linear()
        .domain([minX, maxX])
        .rangeRound([0, chartWidth]);

    var colorScaleDomain = d3.keys(DATA[0]).filter(function (d) {
        return d != 'label' && d != 'values';
    });

    var colorList = colorArray(LABELS, MULTICOLORS);
    var colorScale = d3.scale.ordinal()
        .domain(colorScaleDomain)
        .range(colorList);

    var accessibleColorScale = d3.scale.ordinal()
        .domain(colorScaleDomain)
        .range(colorList.map(function (color) {
            return getAccessibleColor(color);
        }));

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(colorScaleDomain)
        .enter().append('li')
            .attr('class', function (d, i) {
                return 'key-item key-' + i + ' ' + classify(d);
            });

    legend.append('b')
        .style('background-color', function (d) {
            return accessibleColorScale(d);
        });

    legend.append('label')
        .text(function (d) {
            return d;
        });

    /*
     * Render bars to chart.
     */
    var group = chartElement.selectAll('.group')
        .data(DATA)
        .enter().append('g')
            .attr('class', function (d) {
                return 'group ' + classify(d.label);
            })
            .attr('transform', function (d, i) {
                return makeTranslate(0, (i * (barHeight + barGap)));
            });

    group.selectAll('rect')
        .data(function (d) {
            return d.values;
        })
        .enter().append('rect')
            .attr({
                x: function (d) {
                    if (d.x0 < d.x1) {
                        return xScale(d.x0);
                    }

                    return xScale(d.x1);
                },

                width: function (d) {
                    return Math.abs(xScale(d.x1) - xScale(d.x0)) - segmentGap;
                },

                height: barHeight,

            })
            .style('fill', function (d) {
                return accessibleColorScale(d.name);
            })
            .attr('class', function (d) {
                return classify(d.name);
            });

    /*
     * Render bar values.
     */
    group.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function (d) {
            return d.values;
        })
        .enter().append('text')
            .text(function (d) {
                return formattedNumber(
                    d.val,
                    LABELS.prefixX,
                    LABELS.suffixX,
                    LABELS.maxDecimalPlaces
                );
            })
            .attr('class', function (d) {
                return classify(d.name);
            })
            .attr({
                x: function (d) {
                    return xScale(d.x1);
                },

                dx: function (d) {
                    var textWidth = this.getComputedTextLength();
                    var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

                    // Hide labels that don't fit
                    if (textWidth + valueGap * 2 > barWidth) {
                        d3.select(this).classed('hidden', true);
                    }

                    if (d.x1 < 0) {
                        return valueGap;
                    }

                    return -(valueGap + textWidth);
                },

                dy: (barHeight / 2),

            });

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
                        'line-height': (barHeight >= 20 ? 14 : barHeight) + 'px',
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
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
