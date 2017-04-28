// Global vars
var pymChild = null;
var isMobile = false;
var isDateScale = !!DATA[0].date;
var xCol = isDateScale ? 'date' : 'x';
var KEY_NESTED_DATA;
var X_NESTED_DATA;
var FLAT_DATA = [];

var lineKeys = d3.set(d3.map(DATA[0]).keys());
lineKeys.remove(xCol);

// D3 formatters
var bisectDate = d3.bisector(function (d) { return d.values[0].x; }).left;
var dataSeries = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function () {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
};

/*
 * Format graphic data for processing by D3.
 */
var formatData = function () {
    DATA = DATA.map(function (obj) {
        return d3.entries(obj).reduce(function (memo, val) {
            var key = val.key;
            var value = val.value;
            var formattedValue;
            if (key === xCol) {
                if (isDateScale) {
                    if (LABELS.parseDateFormat) {
                        formattedValue = d3.time.format(LABELS.parseDateFormat).parse(value);
                    }

                    if (!formattedValue) {
                        // fall back to guessing date format
                        formattedValue = d3.time.format('%d/%m/%y').parse(value) ||
                                         d3.time.format('%d/%m/%Y').parse(value);
                    }
                } else {
                    formattedValue = value; // leave as string
                }
            } else {
                formattedValue = +value; // turn string into number
            }

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
                x: v[xCol],
                amt: v[d],
                key: d,
            };
        }));
    });

    KEY_NESTED_DATA = d3.nest()
        .key(function (d) { return d.key; })
        .entries(FLAT_DATA);

    X_NESTED_DATA = d3.nest()
        .key(function (d) { return d.x; })
        .entries(FLAT_DATA);

};

/*
 * Format graphic data for processing by D3.
 */
var formatData1 = function() {
    DATA.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': DATA.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'] != null;
            })
        });
    }
};


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
    renderLineChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a line chart.
 */
var renderLineChart = function () {
    /*
     * Setup
     */
    var strokeDashArrayAliases = {
        solid: '0',
        dotted: '1, 4',
        dashed1: '18, 5',
        dashed2: '7, 5',
    };

    var aspectRatio = getAspectRatio(LABELS.ratio);

    var margins = {
        top: parseInt(LABELS.marginTop || 5, 10),
        right: parseInt(LABELS.marginRight || 50, 10),
        bottom: parseInt(LABELS.marginBottom || 35, 10),
        left: parseInt(LABELS.marginLeft || 30, 10),
    };

    if (LABELS.xLabel) {
        margins.bottom += 20;
    }

    if (LABELS.yLabel) {
        margins.top += 20;
    }

    if (isMobile) {
        margins.right = margins.right * 0.9;
    }

    var roundTicksFactor = parseInt(LABELS.roundTicksFactor || 5, 10);

    var ticksX = parseInt(LABELS.ticksX || 10, 10);
    var ticksY = parseInt(LABELS.ticksY || 10, 10);
    if (isMobile) {
        ticksX = parseInt(LABELS.mobileTicksX || 5, 10);
        ticksY = parseInt(LABELS.mobileTicksY || 5, 10);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
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

    /*
     * Create D3 scale objects.
     */
    var minY;
    if (LABELS.minValue) {
        minY = parseFloat(LABELS.minValue, 10);
    } else {
        minY = d3.min(KEY_NESTED_DATA, function (c) {
            return d3.min(c.values, function (v) {
                var n = v.amt;
                return Math.floor(n / roundTicksFactor) * roundTicksFactor;
            });
        });
    }

    var maxY;
    if (LABELS.maxValue) {
        maxY = parseFloat(LABELS.maxValue, 10);
    } else {
        maxY = d3.max(KEY_NESTED_DATA, function (c) {
            return d3.max(c.values, function (v) {
                var n = v.amt;
                return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
            });
        });
    }

    var xFormat;
    var xScale;

    if (isDateScale) {
        if (!isMobile && LABELS.timeFormatLarge) {
            xFormat = d3.time.format(LABELS.timeFormatLarge);
        } else if (isMobile && LABELS.timeFormatSmall) {
            xFormat = d3.time.format(LABELS.timeFormatSmall);
        } else {
            xFormat = d3.time.format.multi([
                ['.%L', function (d) { return d.getMilliseconds(); }],

                [':%S', function (d) { return d.getSeconds(); }],

                ['%-I:%M', function (d) { return d.getMinutes(); }],

                ['%-I\n%p', function (d) { return d.getHours(); }],

                ['%a\n%-d', function (d) { return d.getDay() && d.getDate() != 1; }],

                ['%b\n%-d', function (d) { return d.getDate() != 1; }],

                ['%B', function (d) { return d.getMonth(); }],

                ['%Y', function () { return true; }],
            ]);
        }

        xScale = d3.time.scale()
            .domain(d3.extent(DATA, function (d) {
                return d.date;
            }))
            .range([0, chartWidth]);
    } else {
        xFormat = function (d, i) {
            return d;
        };

        xScale = d3.scale.ordinal()
            .rangePoints([0, chartWidth])
            .domain(DATA.map(function (d) {
                return d.x;
            }));
    }

    var yScale = d3.scale.linear()
        .domain([minY, maxY])
        .range([chartHeight, 0]);

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);

    var lineKeyScale = d3.scale.ordinal().domain(lineKeys);

    var colorScale = lineKeyScale.copy()
        .range(colorList);

    var accessibleColorScale = lineKeyScale.copy()
        .range(colorList.map(function (color) {
            return getAccessibleColor(color);
        }));

    var chartElement = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        .append('g')
            .attr('transform', makeTranslate(margins.left, margins.top));

    var overlay = chartElement.append('rect')
        .attr({
            width: chartWidth,
            height: chartHeight,
            fill: 'transparent',
        });

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(xFormat)
        .outerTickSize(0);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function (d) {
            return formattedNumber(d, LABELS.prefixY, LABELS.suffixY, LABELS.maxDecimalPlaces);
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .classed('x axis', true)
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis)
        .selectAll('g text')
            .each(function () {
                // Finds "\n" in text and splits it into tspans
                var el = d3.select(this);
                var words = el.text().replace(/\\n/g, '\n').split('\n');
                el.text('');

                for (var i = 0; i < words.length; i++) {
                    var tspan = el.append('tspan').text(words[i]);
                    if (i > 0) {
                        tspan.attr({
                            x: 0,
                            dy: '1em',
                        });
                    }
                }
            });

    chartElement.append('g')
        .classed('y axis', true)
        .call(yAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function () {
        return xAxis;
    };

    var yAxisGrid = function () {
        return yAxis;
    };

    chartElement.append('g')
        .classed('x grid', true)
        .attr('transform', makeTranslate(0, chartHeight))
        .call(
            xAxisGrid()
                .tickSize(-chartHeight, 0, 0)
                .tickFormat('')
        );

    chartElement.append('g')
        .classed('y grid', true)
        .call(
            yAxisGrid()
                .tickSize(-chartWidth, 0, 0)
                .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate(LABELS.interpolate || 'monotone')
        .x(function (d) {
            return xScale(d.x);
        })
        .y(function (d) {
            return yScale(d.amt);
        });

    var highlighted = LABELS.highlighted ? LABELS.highlighted.split(/\s*,\s*/) : []; //??
    var lineStyleArr = LABELS.lineStyles ? LABELS.lineStyles.split(/\s*,\s*/) : [];
    var lines = chartElement.append('g')
        .classed('lines visible-lines', true)
        .selectAll('path')
        .data(KEY_NESTED_DATA)
        .enter()
        .append('path')
            .attr('class', function (d, i) {
                return 'line line-' + i + ' ' + classify(d.key);
            })
            .attr({
                'stroke-linecap': 'round',

                'stroke-dasharray': function (d, i) {
                    return strokeDashArrayAliases[lineStyleArr[i]];
                },

                stroke: function (d) {
                    if (highlighted.indexOf(d.key) !== -1) {
                        return HIGHLIGHTCOLORS.active;
                    }

                    return colorScale(d.key);
                },

                d: function (d) {
                    return line(d.values);
                },

            });

    if (LABELS.theme == 'highlight') {
        var shadowLines = chartElement.append('g')
            .classed('lines shadow-lines', true)
            .selectAll('path')
            .data(KEY_NESTED_DATA)
            .enter()
            .append('path')
                .attr('class', function (d, i) {
                    return 'line line-' + i + ' ' + classify(d.key);
                })
                .attr({
                    stroke: function (d) {
                        return 'transparent';
                    },

                    d: function (d) {
                        return line(d.values);
                    },

                    'data-index': function (d, i) {
                        return i;
                    },
                });

        shadowLines.on({
            mouseover: function () {
                var index = this.getAttribute('data-index');
                lines.filter('.line-' + index)
                    .attr('stroke', HIGHLIGHTCOLORS.active);
                labels.selectAll('.label-' + index)
                    .style('color', getAccessibleColor(HIGHLIGHTCOLORS.active));
            },

            mouseout: function () {
                var index = this.getAttribute('data-index');
                lines.filter('.line-' + index)
                    .attr('stroke', HIGHLIGHTCOLORS.inactive);
                labels.selectAll('.label-' + index)
                    .style('color', getAccessibleColor(HIGHLIGHTCOLORS.inactive));
            },
        });

    }

    var getGroupedData = function (obj, labelHeight) {
        labelHeight = labelHeight || 40;
        var groupedArr = [];
        obj.values
            .map(function (d, i) {
                d.i = i;
                d.accessibleColor = accessibleColorScale(d.key);
                d.yPos = yScale(d.amt); // add yPos
                return d;
            })
            .sort(function (a, b) { // sort by yPos
                return a.yPos - b.yPos;
            })
            .forEach(function (d, i, array) { // grouping
                if (i === 0) {
                    // start new group
                    groupedArr.push([d]);
                } else {
                    var prevGroupIndex = groupedArr.length - 1;
                    var noOfItemsInLastGroup = groupedArr[prevGroupIndex].length;
                    var actualPixelDiff = Math.abs(d.yPos - array[i - 1].yPos);
                    var minPixelDiff = (noOfItemsInLastGroup + 1) * labelHeight / 2;
                    if (actualPixelDiff > minPixelDiff) {
                        // start new group
                        groupedArr.push([d]);
                    } else {
                        // add to previous group
                        groupedArr[prevGroupIndex].push(d);
                    }
                }
            });

        return groupedArr;
    };

    // labels on right of data
    var lastObj = X_NESTED_DATA[X_NESTED_DATA.length - 1];
    var noOfLabelLines = lastObj.values[0].key.split('\\n').length + 1;

    var labels = chartWrapper.append('div')
        .classed('label-wrapper', true)
        .selectAll('div.label')
            .data(getGroupedData(lastObj, noOfLabelLines * 20))
        .enter().append('div')
            .classed('label', true)
            .html(function (d) {
                var h = '';
                for (var i = 0; i < d.length; ++i) {
                    var thisData = d[i];
                    h += '<div class="label-' + thisData.i + '" style="color: ' + thisData.accessibleColor + '">' +
                        thisData.key.replace(/\\n/g, '<br>') +
                        '<br><strong>' +
                        formattedNumber(thisData.amt, LABELS.valuePrefix, LABELS.valueSuffix, LABELS.maxDecimalPlaces) +
                        '</strong>' +
                        '</div>';
                }

                return h;
            })
            .style({
                left: (xScale(lastObj.values[0].x) + margins.left + 10) + 'px',

                top: function (d) {
                    var yPosAvg = d.reduce(function (memo, num) {
                        return memo + num.yPos;
                    }, 0) / d.length;
                    if (LABELS.yLabel) {
                        yPosAvg += 20;
                    }

                    return Math.max(-10, (yPosAvg - (this.clientHeight / 2))) + 'px';
                },
            });

    if (LABELS.xLabel) {
        chartElement.append('text')
            .text(LABELS.xLabel)
            .classed('axis-label', true)
            .attr({
                x: function () {
                    return (chartWidth - this.getComputedTextLength()) / 2;
                },

                y: chartHeight + margins.bottom - 5,
            });
    }

    if (LABELS.yLabel) {
        chartElement.append('text')
            .text(LABELS.yLabel)
            .classed('axis-label', true)
            .attr({
                x: -20,
                y: -15,
            });
    }

    if (LABELS.circleMarker !== 'off') {
        chartElement.append('g')
            .selectAll('circle')
            .data(FLAT_DATA)
            .enter().append('circle')
            .classed('point', true)
            .attr({
                r: 1.5,

                cx: function (d) {
                    return xScale(d.x);
                },

                cy: function (d) {
                    return yScale(d.amt);
                },

                fill: function (d) {
                    return colorScale(d.key);
                },

                stroke: function (d) {
                    return colorScale(d.key);
                },

            });
    }

    if (LABELS.tooltip !== 'off') {
        var tooltipWrapper = chartWrapper.append('div')
            .classed('tooltip-wrapper', true);

        chartElement.on({
            mousemove: function (e) {
                var posX = d3.mouse(overlay.node())[0];
                var xVal;
                var obj;
                if (isDateScale) {
                    var hoverDate = xScale.invert(posX);
                    var index = bisectDate(X_NESTED_DATA, hoverDate, 1);
                    obj = X_NESTED_DATA[index - 1];
                    var obj2 = X_NESTED_DATA[index];

                    // choose the closest object to the mouse
                    if (index < X_NESTED_DATA.length - 1 && hoverDate - obj.values[0].x > obj2.values[0].x - hoverDate) {
                        obj = obj2;
                    }

                    xVal = obj.values[0].x;
                } else {
                    var domain = xScale.domain();
                    var range = xScale.range();
                    var i = d3.bisect(range, posX);
                    var left = domain[i - 1];
                    var right = domain[i];
                    X_NESTED_DATA.some(function (d) {
                        return d.key === left && (obj = d, true);
                    });

                    if (!obj) {
                        return;
                    }

                    xVal = left;

                    if (i < domain.length - 1 && posX - xScale(left) > xScale(right) - posX) {
                        X_NESTED_DATA.some(function (d) {
                            return d.key === right && (obj = d, true);
                        });

                        xVal = right;
                    }
                }

                var tooltip = tooltipWrapper.selectAll('div.tooltip')
                    .data(getGroupedData(obj));

                tooltip.enter().append('div').classed('tooltip', true);
                tooltip.exit().remove();

                tooltip.html(function (d) {
                    var h = '';
                    for (var i = 0; i < d.length; ++i) {
                        var thisData = d[i];
                        h += '<div style="color: ' + thisData.accessibleColor + '">' +
                            thisData.key.replace(/\\n/g, ' ') +
                            ' <strong>' +
                            formattedNumber(thisData.amt, LABELS.valuePrefix, LABELS.valueSuffix, LABELS.maxDecimalPlaces) +
                            '</strong>' +
                            '</div>';
                    }

                    return h;
                })
                .style({
                    left: function (d) {
                        var offset = this.clientWidth / 2;
                        return (xScale(xVal) - offset + margins.left) + 'px';
                    },

                    top: function (d) {
                        var yPosAvg = d.reduce(function (memo, num) {
                            return memo + num.yPos;
                        }, 0) / d.length;
                        return (yPosAvg - (this.clientHeight / 2)) + 'px';
                    },
                });

            },

            mouseout: function (e) {
                tooltipWrapper.selectAll('div.tooltip').remove();
            },

        });

    }

};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;