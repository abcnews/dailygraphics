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
var formatData = function() {
    DATA.forEach(function(d) {
        d.key = d['Group'];
        d.values = [];

        _.each(d, function (v, k) {
            if (_.contains(['Group', 'key', 'values'], k)) {
                return;
            }

            d.values.push({
                label: k,
                amt: +v,
            });
            delete d[k];
        });

        delete d['Group'];
    });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart!
    renderGroupedBarChart({
        container: '#grouped-bar-chart',
        width: containerWidth,
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a bar chart.
 */
var renderGroupedBarChart = function (config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var numGroups = DATA.length;
    var numGroupBars = DATA[0].values.length;

    var barHeight = parseInt(LABELS.barHeight || 25, 10);
    var barGap = parseInt(LABELS.barGap || 2, 10);
    var groupGap = parseInt(LABELS.groupGap || 30, 10);
    var labelWidth = parseInt(LABELS.labelWidth || 85, 10);
    var labelMargin = parseInt(LABELS.labelMargin || 6, 10);
    var valueGap = parseInt(LABELS.valueGap || 6, 10);
    var groupHeight = (barHeight + barGap) * numGroupBars - barGap;

    var margins = {
        top: parseInt(LABELS.marginTop || 0, 10),
        right: parseInt(LABELS.marginRight || 15, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || (labelWidth + labelMargin), 10),
    };

    var ticksX = parseInt(LABELS.ticksX || 7, 10);
    var roundTicksFactor = parseInt(LABELS.roundTicksFactor || 5, 10);


    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config.container);
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

    /*
     * Create D3 scale objects.
     */
    var min = d3.min(DATA, function(d) {
        return d3.min(d.values, function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    if ('minX' in LABELS && LABELS.minX !== '') {
        min = parseFloat(LABELS.minX, 10);
    } else if (min > 0) {
        min = 0;
    }

    var max = d3.max(DATA, function (d) {
        return d3.max(d.values, function (v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    if ('maxX' in LABELS && LABELS.maxX !== '') {
        max = parseFloat(LABELS.maxX, 10);
    }

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    var yScale = d3.scale.linear()
        .range([chartHeight, 0]);

    var colorList = colorArray(LABELS, monochromeColors);
    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(DATA[0].values, labelColumn))
        .range(colorList);

    var accessibleColorList = [];
    for (var j = 0; j < colorList.length; j++) {
        accessibleColorList[j] = getAccessibleColor(colorList[j]);
    }

    var accessibleColorScale = d3.scale.ordinal()
        .range(accessibleColorList);

    var chartElement = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        .append('g')
            .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function (d) {
            return d.toFixed(0) + '%';
        });

    /*
     * Render axes to chart.
     */
    /*
    // chartElement.append('g')
    //     .attr('class', 'x axis')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxis);
    */

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function () {
        return xAxis;
    };

    /*
    // chartElement.append('g')
    //     .attr('class', 'x grid')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxisGrid()
    //         .tickSize(-chartHeight, 0, 0)
    //         .tickFormat('')
    //     );
    */

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
            .attr('x', function (d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('y', function (d, i) {
                if (i === 0) {
                    return 0;
                }

                return (barHeight * i) + (barGap * i);
            })
            .attr('width', function (d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('height', barHeight)
            .attr('fill', function (d) {
                return colorScale(d[labelColumn]);
            })
            .attr('class', function (d) {
                return 'y-' + d[labelColumn];
            });

    barGroups.append('text')
            .attr('x', 0)
            .attr('y', -8)
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
        .attr('style', formatStyle({
            width: labelWidth + 'px',
            top: margins.top + 'px',
            left: 0,
        }))
        .selectAll('li')
        .data(labelData)
        .enter()
        .append('li')
            .attr('style', function(d,i) {
                var index = Math.floor(i / numGroupBars);
                var top = (groupHeight + groupGap) * index;
                top += (i % numGroupBars) * (barHeight + barGap);
                top += 20;

                return formatStyle({
                    width: (labelWidth - 10) + 'px',
                    height: barHeight + 'px',
                    left: 0,
                    top: top + 'px'
                });
            })
            .attr('class', function(d,i) {
                return classify(d);//.key);
            })
            .append('span')
                .text(function(d) {
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

            chartWrapper.selectAll('.bars:nth-child('+(index+1)+') rect:nth-child('+(barIndex+1)+')')
                .attr('fill', highlightColor);
            chartWrapper.selectAll('.bars:nth-child('+(index+1)+') .value text.out:nth-child('+(barIndex+1)+')')
                .classed('over', true);
        });
    }

    /*
     * Render bar values.
     */
    barGroups.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            return d.values;
        })
        .enter()
        .append('text')
            .text(function(d) {
                return formattedNumber(d[valueColumn], LABELS.prefixX, LABELS.suffixX, LABELS.maxDecimalPlaces);
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return (barHeight + barGap) * i;
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength();

                // Negative case
                if (d[valueColumn] < 0) {
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
            })
            .attr('dy', (barHeight / 2) + 4)
            .attr('fill', function (d, i) {
                return accessibleColorScale(i);
            });
};


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
