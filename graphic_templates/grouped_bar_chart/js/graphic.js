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
    var groupColumn = 'Group';
    DATA.forEach(function (d) {
        d.key = d[groupColumn];
        d.values = [];

        _.each(d, function (v, k) {
            if (_.contains([groupColumn, 'key', 'values'], k)) {
                return;
            }

            d.values.push({
                label: k,
                amt: +v,
            });
            delete d[k];
        });

        delete d[groupColumn];
    });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart!
    renderGroupedBarChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a bar chart.
 */
var renderGroupedBarChart = function () {
    /*
     * Setup chart container.
     */
    var numGroups = DATA.length;
    var numGroupBars = DATA[0].values.length;

    var barHeight = parseInt(LABELS.barHeight || 30, 10);
    var barGap = parseInt(LABELS.barGap || 10, 10);
    var groupGap = parseInt(LABELS.groupGap || 35, 10);
    var labelWidth = parseInt(LABELS.labelWidth || 85, 10);
    var labelMargin = parseInt(LABELS.labelMargin || 6, 10);
    var valueGap = parseInt(LABELS.valueGap || 6, 10);
    var groupHeight = (barHeight + barGap) * numGroupBars - barGap;

    var margins = {
        top: parseInt(LABELS.marginTop || 0, 10),
        right: parseInt(LABELS.marginRight || 30, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || (labelWidth + labelMargin), 10),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#grouped-bar-chart');
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = (groupHeight + groupGap) * numGroups - groupGap;

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
            return d3.min(d.values, function (v) {
                return v.amt;
            });
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
            return d3.max(d.values, function (v) {
                return v.amt;
            });
        });
    }

    var xScale = d3.scale.linear()
        .domain([minX, maxX])
        .range([0, chartWidth]);

    var colorScaleDomain = _.pluck(DATA[0].values, 'label');

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);
    var colorScale = d3.scale.ordinal()
        .domain(colorScaleDomain)
        .range(colorList);

    var accessibleColorScale = d3.scale.ordinal()
        .domain(colorScaleDomain)
        .range(_.map(colorList, function (color) {
            return getAccessibleColor(color);
        }));

    /*
     * Render bars to chart.
     */
    var barGroups = chartElement.selectAll('.bars')
        .data(DATA)
        .enter()
        .append('g')
            .attr('class', 'g bars')
            .attr('transform', function (d, i) {
                return makeTranslate(0, (groupHeight + groupGap) * i + 20);
            });

    barGroups.selectAll('rect')
        .data(function (d) {
            return d.values;
        })
        .enter()
        .append('rect')
            .attr({
                x: function (d) {
                    if (d.amt >= 0) {
                        return xScale(0);
                    }

                    return xScale(d.amt);
                },

                y: function (d, i) {
                    return (barHeight + barGap) * i;
                },

                width: function (d) {
                    return Math.abs(xScale(0) - xScale(d.amt));
                },

                height: barHeight,

                fill: function (d) {
                    return colorScale(d.label);
                },
            })
            .attr('class', function (d) {
                return 'y-' + d.label;
            });

    barGroups.append('text')
            .attr('y', -barGap)
            .attr('class', 'group-label')
            .text(function (d) { return d.key; });

    var labelData = [];
    _.each(DATA, function (d) {
        _.each(d.values, function (e) {
            labelData.push(e.label);
        });
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
        .data(labelData)
        .enter()
        .append('li')
            .style({
                width: (labelWidth - 10) + 'px',
                height: barHeight + 'px',
                left: 0,
                top: function (d, i) {
                    var index = Math.floor(i / numGroupBars);
                    var top = (groupHeight + groupGap) * index;
                    top += (i % numGroupBars) * (barHeight + barGap);
                    top += 20;

                    return top + 'px';
                },
            })
            .attr('class', function (d, i) {
                return classify(d);//.key);
            })
            .append('span')
                .text(function (d) {
                    return d;//.key
                });

    if (LABELS.theme == 'highlight') {
        chartWrapper.on('mousemove', function (e) {
            var pos = d3.mouse(chartWrapper.node());
            var gh = groupHeight + groupGap;
            var index = Math.floor(pos[1] / gh);
            var relativeY = pos[1] - index * gh;
            var barIndex = Math.floor((relativeY - 20) / (barHeight + barGap));

            chartWrapper.selectAll('.value text.over')
                .classed('over', false);
            chartWrapper.selectAll('.bars rect')
                .attr('fill', function (d, i) {
                    return colorScale(i);
                });

            if (relativeY <= 20) {
                // in the group heading
                return;
            }

            var hoveredBarGroup = chartWrapper.selectAll('.bars:nth-child(' + (index + 1) + ')');
            hoveredBarGroup.selectAll('rect:nth-child(' + (barIndex + 1) + ')')
                .attr('fill', highlightColor);
            hoveredBarGroup.selectAll('.value text:nth-child(' + (barIndex + 1) + ')')
                .classed('over', true);
        });
    }

    /*
     * Render bar values.
     */
    barGroups.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function (d) {
            return d.values;
        })
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
                    if (d.amt < 0) {
                        return xScale(0);
                    }

                    return xScale(d.amt);
                },

                y: function (d, i) {
                    return (barHeight + barGap) * i;
                },

                dx: valueGap,

                dy: (barHeight / 2),

                fill: function (d) {
                    return accessibleColorScale(d.label);
                },

            });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
