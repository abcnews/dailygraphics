// Global vars
var pymChild = null;
var isMobile = false;
var isDateScale = !!DATA[0].date;
var xCol = isDateScale ? 'date' : 'x';
var GROUPED_DATA;

/*
 * Initialize graphic
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
                    formattedValue = +value; // turn string into number
                }
            } else if (key === 'y') {
                formattedValue = +value; // turn string into number
            } else {
                formattedValue = value;
            }

            memo[key] = formattedValue;
            return memo;
        }, {});
    });

    GROUPED_DATA = d3.nest()
        .key(function (d) {
            return d.Group;
        })
        .entries(DATA);

};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart!
    renderScatterplot();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a line chart.
 */
var renderScatterplot = function () {
    /*
     * Setup
     */
    var aspectRatio = getAspectRatio(LABELS.ratio);

    var margins = {
        top: parseInt(LABELS.marginTop || 5, 10),
        right: parseInt(LABELS.marginRight || 10, 10),
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
    var containerElement = d3.select('#scatterplot');
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
        minY = d3.min(DATA, function (d) {
            return Math.floor(d.y / roundTicksFactor) * roundTicksFactor;
        });
    }

    var maxY;
    if (LABELS.maxValue) {
        maxY = parseFloat(LABELS.maxValue, 10);
    } else {
        maxY = d3.max(DATA, function (d) {
            return Math.ceil(d.y / roundTicksFactor) * roundTicksFactor;
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
        xFormat = function (d) {
            return d;
        };

        var minX = d3.min(DATA, function (d) {
            return Math.floor(d.x / roundTicksFactor) * roundTicksFactor;
        });

        var maxX = d3.max(DATA, function (d) {
            return Math.ceil(d.x / roundTicksFactor) * roundTicksFactor;
        });

        xScale = d3.scale.linear()
            .domain([minX, maxX])
            .range([0, chartWidth]);
    }

    var yScale = d3.scale.linear()
        .domain([minY, maxY])
        .range([chartHeight, 0]);

    var groups = GROUPED_DATA.map(function (d) {
        return d.key;
    });

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);

    var colorScale = d3.scale.ordinal()
        .domain(groups)
        .range(colorList);

    var accessibleColorScale = d3.scale.ordinal()
        .domain(groups)
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

    var labelGroup = chartElement.append('g')
        .selectAll('g')
        .data(DATA)
        .enter().append('g');

    ['shadow label', 'label'].forEach(function (cls) {
        labelGroup.append('text')
            .attr('class', function (d) {
                return cls + ' ' + (d.LabelPosition || '');
            })
            .text(function (d) {
                return d.Label;
            })
            .attr({
                x: function (d) {
                    return xScale(isDateScale ? d.date : d.x);
                },

                y: function (d) {
                    return yScale(d.y);
                },

                dx: function (d) {
                    var pos = d.LabelPosition || 'above';
                    if (pos === 'left') {
                        return -6;
                    } else if (pos === 'right') {
                        return 6;
                    }

                    return 0;
                },

                dy: function (d) {
                    var pos = d.LabelPosition || 'above';
                    if (pos === 'above') {
                        return -6;
                    } else if (pos === 'below') {
                        return 6;
                    }

                    return 0;
                },

                fill: function (d) {
                    return accessibleColorScale(d.Group);
                },

            });

    });

    var squareSide = 6;
    var area = Math.pow(squareSide, 2);
    var circleRadius = Math.sqrt(area / Math.PI); // to give same area as square
    var triangleSide = Math.sqrt(area / (Math.sqrt(3) / 4)); // to give same area as square
    var triangleHeight = Math.sqrt(Math.pow(triangleSide, 2) - Math.pow((triangleSide / 2), 2));
    var triangleCentre = Math.sqrt(3) / 6 * triangleSide;
    var pentagonSide = Math.sqrt(4 * area / Math.sqrt(25 + 10 * Math.sqrt(5)));
    var pentagonWidth = pentagonSide / 2 * (1 + Math.sqrt(5));
    var pentagonHeight = pentagonSide / 2 * (Math.sqrt(5 + 2 * Math.sqrt(5)));
    var pentagonRadius = pentagonSide / 10 * Math.sqrt(50 + 10 * Math.sqrt(5));
    var pentagonSideOffset = Math.sqrt(Math.pow(pentagonSide, 2) - Math.pow(pentagonWidth / 2, 2));

    var makePointsString = function (arrOfArrs) {
        return arrOfArrs.map(function (arr) {
            return arr.join(',');
        }).join(' ');
    };

    GROUPED_DATA.forEach(function (group, i) {
        var groupElem = chartElement.append('g')
            .attr('class', classify(group.key))
            .attr({
                fill: colorScale(group.key),
                stroke: colorScale(group.key),
            });

        switch (i) {
            case 1: // diamond
                groupElem
                    .selectAll('rect')
                    .data(group.values)
                    .enter().append('rect')
                    .classed('point', true)
                    .attr({
                        height: squareSide,
                        width: squareSide,

                        x: function (d) {
                            return xScale(isDateScale ? d.date : d.x) - (squareSide / 2);
                        },

                        y: function (d) {
                            return yScale(d.y) - (squareSide / 2);
                        },

                        transform: function (d) {
                            var x = xScale(isDateScale ? d.date : d.x);
                            var y = yScale(d.y);
                            return 'rotate(45 ' + x + ' ' + y + ')';
                        },

                    });
                break;
            case 2: // up triangle
                groupElem
                    .selectAll('polygon')
                    .data(group.values)
                    .enter().append('polygon')
                    .classed('point', true)
                    .attr({
                        points: function (d) {
                            var xOffset = xScale(isDateScale ? d.date : d.x) - triangleSide / 2;
                            var yOffset = yScale(d.y) - triangleHeight + triangleCentre;
                            var topY = yOffset;
                            var bottomY = topY + triangleHeight;
                            var leftX = xOffset;
                            var centreX = leftX + (triangleSide / 2);
                            var rightX = leftX + triangleSide;
                            return makePointsString([
                                [leftX, bottomY],
                                [rightX, bottomY],
                                [centreX, topY],
                            ]);
                        },
                    });
                break;
            case 3: // square
                groupElem
                    .selectAll('rect')
                    .data(group.values)
                    .enter().append('rect')
                    .classed('point', true)
                    .attr({
                        height: squareSide,
                        width: squareSide,

                        x: function (d) {
                            return xScale(isDateScale ? d.date : d.x) - (squareSide / 2);
                        },

                        y: function (d) {
                            return yScale(d.y) - (squareSide / 2);
                        },

                    });
                break;
            case 4: // pentagon
                groupElem
                    .selectAll('polygon')
                    .data(group.values)
                    .enter().append('polygon')
                    .classed('point', true)
                    .attr({
                        points: function (d) {
                            var xOffset = xScale(isDateScale ? d.date : d.x) - pentagonWidth / 2;
                            var yOffset = yScale(d.y) - pentagonRadius;
                            var topY = yOffset;
                            var midY = topY + pentagonSideOffset;
                            var bottomY = topY + pentagonHeight;
                            var leftX = xOffset;
                            var centreLeftX = leftX + ((pentagonWidth - pentagonSide) / 2);
                            var centreX = centreLeftX + (pentagonSide / 2);
                            var centreRightX = centreX + (pentagonSide / 2);
                            var rightX = leftX + pentagonWidth;
                            return makePointsString([
                                [leftX, midY],
                                [centreX, topY],
                                [rightX, midY],
                                [centreRightX, bottomY],
                                [centreLeftX, bottomY],
                            ]);
                        },
                    });
                break;
            case 5: // down triangle
                groupElem
                    .selectAll('polygon')
                    .data(group.values)
                    .enter().append('polygon')
                    .classed('point', true)
                    .attr({
                        points: function (d) {
                            var xOffset = xScale(isDateScale ? d.date : d.x) - triangleSide / 2;
                            var yOffset = yScale(d.y) - triangleCentre;
                            var topY = yOffset;
                            var bottomY = topY + triangleHeight;
                            var leftX = xOffset;
                            var centreX = leftX + (triangleSide / 2);
                            var rightX = leftX + triangleSide;
                            return makePointsString([
                                [leftX, topY],
                                [rightX, topY],
                                [centreX, bottomY],
                            ]);
                        },
                    });
                break;
            default: // circle
                groupElem
                    .selectAll('circle')
                    .data(group.values)
                    .enter().append('circle')
                    .classed('point', true)
                    .attr({
                        r: circleRadius,

                        cx: function (d) {
                            return xScale(isDateScale ? d.date : d.x);
                        },

                        cy: function (d) {
                            return yScale(d.y);
                        },

                    });
        }

    });

};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
