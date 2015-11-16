// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var graphicConfig = null;
var numFormat = d3.format(",");

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        graphicConfig = GRAPHIC_CONFIG;
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = data;

        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['key'] = d['Group'];
        d['values'] = [];

        _.each(d, function(v, k) {
            if (_.contains(['Group', 'key', 'values'], k)) {
                return;
            }

            d['values'].push({ 'label': k, 'amt': +v });
            delete d[k];
        });

        delete d['Group'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderGroupedBarChart({
        container: '#grouped-bar-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderGroupedBarChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var numGroups = config['data'].length;
    var numGroupBars = config['data'][0]['values'].length;

    var barHeight = parseInt(graphicConfig.barHeight || 25, 10);
    var barGapInner = parseInt(graphicConfig.barGap || 2, 10);
    var barGap = parseInt(graphicConfig.barGap || 10, 10);
    var labelWidth = parseInt(graphicConfig.labelWidth || 85, 10);
    var labelMargin = parseInt(graphicConfig.labelMargin || 6, 10);
    var valueGap = parseInt(graphicConfig.valueGap || 6, 10);
    var groupHeight = (barHeight * numGroupBars) + (barGapInner * (numGroupBars - 1)) + 20;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    if (graphicConfig.marginTop) {
        margins.top = parseInt(graphicConfig.marginTop, 10);
    }

    if (graphicConfig.marginRight) {
        margins.right = parseInt(graphicConfig.marginRight, 10);
    }

    if (graphicConfig.marginBottom) {
        margins.bottom = parseInt(graphicConfig.marginBottom, 10);
    }

    if (graphicConfig.marginLeft) {
        margins.left = parseInt(graphicConfig.marginLeft, 10);
    }

    var ticksX = parseInt(graphicConfig.ticksX || 7, 10);
    var roundTicksFactor = parseInt(graphicConfig.roundTicksFactor || 5, 10);

   
    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

     // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins['left'] - margins['right'];
    var chartHeight = (((((barHeight + barGapInner) * numGroupBars) - barGapInner) + barGap) * numGroups) - barGap + barGapInner;

    chartHeight = (groupHeight + 20) * (numGroups - 1);
    /*
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    if ('minX' in graphicConfig) {
        min = parseFloat(graphicConfig.minX, 10);
    } else if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        });
    });

    if ('maxX' in graphicConfig) {
        max = parseFloat(graphicConfig.maxX, 10);
    }

    var xScale = d3.scale.linear()
        .domain([
            min,
            max
        ])
        .range([0, chartWidth]);

    var yScale = d3.scale.linear()
        .range([chartHeight, 0]);

    var colorList = colorArray(graphicConfig, monochromeColors);
    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'][0]['values'], labelColumn))
        .range(colorList);
    
    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d.toFixed(0) + '%';
        });

    /*
     * Render axes to chart.
     */
    // chartElement.append('g')
    //     .attr('class', 'x axis')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    // chartElement.append('g')
    //     .attr('class', 'x grid')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxisGrid()
    //         .tickSize(-chartHeight, 0, 0)
    //         .tickFormat('')
    //     );

    /*
     * Render bars to chart.
     */
    var barGroups = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter()
        .append('g')
            .attr('class', 'g bars')
            .attr('transform', function(d, i) {
                return makeTranslate(0, (groupHeight + barGap) * i + 20);
            });

    barGroups.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter()
        .append('rect')
            .attr('x', function(d) {
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                if (i == 0) {
                    return 0;
                }

                return (barHeight * i) + (barGapInner * i);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('height', barHeight)
            .style('fill', function(d) {
            	return colorScale(d[labelColumn]);
            })
            .attr('class', function(d) {
                return 'y-' + d[labelColumn];
            });

    barGroups.append('text')
            .attr('x', 0)
            .attr('y', -8)
            .attr('class', 'group-label')
            .text(function (d) { return d.key; });

    var labelData = [];
    _.each(config['data'], function (d) {
        _.each(d.values, function (e) {
            labelData.push(e.label)
        });
    });

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(labelData)
        .enter()
        .append('li')
            .attr('style', function(d,i) {
                var index = Math.floor(i / 2);
                var top = (groupHeight + barGap) * index;

                if (i & 1 === 1) {
                    top += barHeight + barGapInner;
                }

                if (i == 0) {
                    top = 0;
                }

                top += 20;

                return formatStyle({
                    'width': (labelWidth - 10) + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': top + 'px;'
                });
            })
            .attr('class', function(d,i) {
                return classify(d);//['key']);
            })
            .append('span')
                .text(function(d) {
                    return d;//['key']
                });

    /*
     * Render bar values.
     */
    barGroups.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter()
        .append('text')
            .text(function(d) {
                return (graphicConfig.prefixX || '') + numFormat(d[valueColumn]) + (graphicConfig.suffixX || '');
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                if (i == 0) {
                    return 0;
                }

                return (barHeight * i) + barGapInner;
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    if (xStart + outsideOffset < 0) {
                        d3.select(this).classed('in', true)
                        return valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    }
                // Positive case
                } else {
                    if (xStart + valueGap + textWidth > chartWidth) {
                        d3.select(this).classed('in', true)
                        return -(valueGap + textWidth);
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }
                }
            })
            .attr('dy', (barHeight / 2) + 4);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
