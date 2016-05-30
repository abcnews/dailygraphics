// Global vars
var pymChild = null;
var isMobile = false;

// D3 formatters
var bisectDate = d3.bisector(function (d) { return d.date; }).left;

/*
 * Initialize graphic
 */
var onWindowLoaded = function () {
    if (Modernizr.svg) {
        if (DATA[0].date) {
            formatData();
        }

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
        var date;

        if (LABELS.parseDateFormat) {
            date = d3.time.format(LABELS.parseDateFormat).parse(d.date);
        } else {
            date = d3.time.format('%d/%m/%y').parse(d.date);
            if (!date) {
                date = d3.time.format('%d/%m/%Y').parse(d.date);
            }
        }

        d.date = date;

        for (var key in d) {
            if (key != 'date') {
                d[key] = +d[key];
            }
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
    renderLineChart();

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
    var dateColumn = 'date';

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

    var formattedData = {};
    var flatData = [];

    /*
     * Restructure tabular data for easier charting.
     */
    var i = 0;
    for (var column in DATA[0]) {
        if (column == dateColumn || column == 'x') {
            continue;
        }

        formattedData[column] = DATA.map(function (d) {
            return {
                x: d[dateColumn] || d.x,
                amt: +d[column],
            };
        });

        flatData = flatData.concat(DATA.map(function (d) {
            return {
                x: d[dateColumn] || d.x,
                amt: +d[column],
                i: i,
                key: column,
            };
        }));

        i++;
    }

    /*
     * Create D3 scale objects.
     */
    var minY;
    if (LABELS.minValue) {
        minY = parseFloat(LABELS.minValue, 10);
    } else {
        minY = d3.min(d3.entries(formattedData), function (c) {
            return d3.min(c.value, function (v) {
                var n = v.amt;
                return Math.floor(n / roundTicksFactor) * roundTicksFactor;
            });
        });
    }

    var maxY;
    if (LABELS.maxValue) {
        maxY = parseFloat(LABELS.maxValue, 10);
    } else {
        maxY = d3.max(d3.entries(formattedData), function (c) {
            return d3.max(c.value, function (v) {
                var n = v.amt;
                return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
            });
        });
    }

    var xFormat;
    var xScale;

    if (DATA[0].date) {
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
                return d[dateColumn];
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

        // .range([0, chartWidth]);

        dateColumn = 'x';
    }

    var yScale = d3.scale.linear()
        .domain([minY, maxY])
        .range([chartHeight, 0]);

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);
    var colorScale = d3.scale.ordinal()
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
                var words = el.text().replace('\\n', '\n').split('\n');
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
            return xScale(d[dateColumn] || d.x);
        })
        .y(function (d) {
            return yScale(d.amt);
        });

    var highlighted = LABELS.highlighted ? LABELS.highlighted.split(/\s*,\s*/) : [];
    var lineStyleArr = LABELS.lineStyles ? LABELS.lineStyles.split(/\s*,\s*/) : [];
    var lines = chartElement.append('g')
        .classed('lines visible-lines', true)
        .selectAll('path')
        .data(d3.entries(formattedData))
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

                stroke: function (d, i) {
                    if (highlighted.indexOf(d.key) !== -1) {
                        return highlightColor;
                    }

                    return colorScale(i);
                },

                d: function (d) {
                    return line(d.value);
                },

            });

    if (LABELS.theme == 'highlight') {
        var shadowLines = chartElement.append('g')
            .classed('lines shadow-lines', true)
            .selectAll('path')
            .data(d3.entries(formattedData))
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
                        return line(d.value);
                    },

                    'data-index': function (d, i) {
                        return i;
                    },

                })
                .style('stroke-width', '20px');

        shadowLines.on({
            mouseover: function () {
                var index = this.getAttribute('data-index');
                chartElement.select('.visible-lines .line-' + index)
                    .attr('stroke', highlightColor);
                chartElement.selectAll('.label-' + index + ' tspan')
                    .attr('fill', highlightColor);
            },

            mouseout: function () {
                var index = this.getAttribute('data-index');
                chartElement.select('.visible-lines .line-' + index)
                    .attr('stroke', HIGHLIGHTCOLORS[0]);
                chartElement.selectAll('.label-' + index + ' tspan')
                    .attr('fill', null);
            },
        });

    }

    function labelXFunc(d, i) {
        var last = d.value[d.value.length - 1];
        return xScale(last[dateColumn] || last.x) + 5;
    }

    var getGroupedData = function (obj, labelHeight) {
        labelHeight = labelHeight || 40;

        // convert object into array of objects
        var dataArr = [];
        for (var key in obj) {
            dataArr.push({
                label: key,
                value: obj[key],
                yPos: yScale(obj[key]),
                accessibleColor: accessibleColorScale(dataArr.length),
            });
        }

        // sort by yPos
        dataArr.sort(function (a, b) {
            return a.yPos - b.yPos;
        });

        // grouping
        var groupedArr = [];
        for (var i = 0; i < dataArr.length; ++i) {
            var thisData = dataArr[i];
            if (i === 0) {
                // start new group
                groupedArr.push([thisData]);
            } else {
                var noOfItemsInLastGroup = groupedArr[groupedArr.length - 1].length;
                var actualPixelDiff = Math.abs(thisData.yPos - dataArr[i - 1].yPos);
                var minPixelDiff = (noOfItemsInLastGroup * labelHeight / 2) + (labelHeight / 2);
                if (actualPixelDiff > minPixelDiff) {
                    // start new group
                    groupedArr.push([thisData]);
                } else {
                    // add to previous group
                    groupedArr[groupedArr.length - 1].push(thisData);
                }
            }
        }

        return groupedArr;
    };

    // labels on right of data
    var lastObj;
    var lastObjxVal;

    lastObj = _.clone(DATA[DATA.length - 1]);
    if (dateColumn === 'date') {
        lastObjxVal = lastObj.date;
        delete lastObj.date;
    } else {
        lastObjxVal = lastObj.x;
        delete lastObj.x;
    }

    var labelLines;
    for (var key in lastObj) {
        labelLines = key.split('\\n').length + 1;
        break;
    }

    chartWrapper.append('div')
        .classed('label-wrapper', true)
        .selectAll('div.label')
            .data(getGroupedData(lastObj, labelLines * 20))
        .enter().append('div')
            .classed('label', true)
            .html(function (d) {
                var h = '';
                for (var i = 0; i < d.length; ++i) {
                    var thisData = d[i];
                    h += '<div style="color: ' + thisData.accessibleColor + '">' +
                        thisData.label.replace('\\n', '<br>') +
                        '<br><strong>' +
                        formattedNumber(thisData.value, LABELS.prefixY, LABELS.suffixY, LABELS.maxDecimalPlaces) +
                        '</strong>' +
                        '</div>';
                }

                return h;
            })
            .style({
                left: function (d) {
                    return (xScale(lastObjxVal) + margins.left + 10) + 'px';
                },

                top: function (d) {
                    var yPosAvg = _.reduce(d, function (memo, num) {
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
            .data(flatData)
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

                fill: function (d, i) {
                    return colorScale(d.i);
                },

                stroke: function (d, i) {
                    return colorScale(d.i);
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
                if (dateColumn === 'date') {
                    var x = xScale.invert(posX);
                    var index = bisectDate(DATA, x, 1);
                    obj = _.clone(DATA[index - 1]);
                    var obj2 = _.clone(DATA[index]);

                    // choose the closest object to the mouse
                    if (index < DATA.length - 1 && x - obj.date > obj2.date - x) {
                        obj = obj2;
                    }

                    xVal = obj.date;
                    delete obj.date;
                } else {
                    var domain = xScale.domain();
                    var range = xScale.range();
                    var i = d3.bisect(range, posX);
                    var left = domain[i - 1];
                    var right = domain[i];

                    // var obj = getObjectFromArray(DATA, dateColumn, left);
                    obj = _.clone(_.findWhere(DATA, { x: left }));
                    if (!obj) {
                        return;
                    }

                    xVal = left;

                    if (i < domain.length - 1 && posX - xScale(left) > xScale(right) - posX) {
                        obj = _.clone(_.findWhere(DATA, { x: right }));
                        xVal = right;
                    }

                    delete obj.x;
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
                            thisData.label.replace('\\n', ' ') +
                            ' <strong>' +
                            formattedNumber(thisData.value, LABELS.prefixY, LABELS.suffixY, LABELS.maxDecimalPlaces) +
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
                        var yPosAvg = _.reduce(d, function (memo, num) {
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
