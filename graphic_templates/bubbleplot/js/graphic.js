// Global vars
var pymChild = null;
var isMobile = false;
var isDateScale = !!DATA[0].date;
var xCol = isDateScale ? 'date' : 'x';
var GROUPED_DATA;
var IS_BUBBLEPLOT = true; // THIS SHOULD BE THE ONLY DIFFERENCE BETWEEN scatterplot & bubbleplot JS

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
    DATA = DATA.map(function (obj, i) {
        obj.id = i;
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
            } else if (key === 'y' || key === 'z') {
                formattedValue = +value; // turn string into number
            } else {
                formattedValue = value;
            }

            memo[key] = formattedValue;
            return memo;
        }, {});
    });

    // sort by z value (descending) to ensure smaller bubbles appear over larger ones
    if (IS_BUBBLEPLOT) {
        DATA.sort(function (a, b) {
            return b.z - a.z;
        });
    }

    // find most average data point on the X and Y values
    if (LABELS.mostAverage === 'on') {
        var meanX = d3.mean(DATA, function (d) { return d.x; });

        var extentX = d3.extent(DATA, function (d) { return d.x; });

        var rangeX = extentX[1] - extentX[0];

        var meanY = d3.mean(DATA, function (d) { return d.y; });

        var extentY = d3.extent(DATA, function (d) { return d.y; });

        var rangeY = extentY[1] - extentY[0];

        DATA.map(function (d) {
            d.meanDiffX = Math.abs(meanX - d.x) / rangeX;
            d.meanDiffY = Math.abs(meanY - d.y) / rangeY;
            d.meanDiff = d.meanDiffX * d.meanDiffY;
            return d;
        });

        var minMeanDiff = d3.min(DATA, function (d) {
            return d.meanDiff;
        });

        DATA.map(function (d) {
            d.isMostAverage = (d.meanDiff === minMeanDiff);
            return d;
        });
    }

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

    var groups = GROUPED_DATA.map(function (d) {
        return d.key;
    });

    var legendContainer = containerElement.append('div').attr('class', 'legend');

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
    var minY = (function (manual) {
        if (manual) {
            return parseFloat(manual, 10);
        }

        return d3.min(DATA, function (d) {
            return Math.floor(d.y / roundTicksFactor) * roundTicksFactor;
        });
    })(LABELS.minValue);

    var maxY = (function (manual) {
        if (manual) {
            return parseFloat(manual, 10);
        }

        return d3.max(DATA, function (d) {
            return Math.ceil(d.y / roundTicksFactor) * roundTicksFactor;
        });
    })(LABELS.maxValue);

    var xFormat = (function () {
        if (isDateScale) {
            if (!isMobile && LABELS.timeFormatLarge) {
                return d3.time.format(LABELS.timeFormatLarge);
            } else if (isMobile && LABELS.timeFormatSmall) {
                return d3.time.format(LABELS.timeFormatSmall);
            } else {
                return d3.time.format.multi([
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
        }

        return function (d) {
            return d;
        };
    })();

    var minX = (function () {
        if (isDateScale) {
            return d3.min(DATA, function (d) {
                return d.date;
            });
        }

        return d3.min(DATA, function (d) {
            return Math.floor(d.x / roundTicksFactor) * roundTicksFactor;
        });
    })();

    var maxX = (function () {
        if (isDateScale) {
            return d3.max(DATA, function (d) {
                return d.date;
            });
        }

        return d3.max(DATA, function (d) {
            return Math.ceil(d.x / roundTicksFactor) * roundTicksFactor;
        });
    })();

    var xScale = (function () {
            return isDateScale ? d3.time.scale() : d3.scale.linear();
        })()
        .domain([minX, maxX])
        .range([0, chartWidth]);

    var yScale = d3.scale.linear()
        .domain([minY, maxY])
        .range([chartHeight, 0]);

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);

    var colorScale = d3.scale.ordinal()
        .domain(groups)
        .range(colorList);

    var accessibleColorScale = d3.scale.ordinal()
        .domain(groups)
        .range(colorList.map(function (color) {
            return getAccessibleColor(color);
        }));

    var svg = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        });

    var defs = svg.append('defs');

    var chartElement = svg.append('g')
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

    if (LABELS.mostAverage === 'on') {

        var mostAverageXPos;
        var mostAverageYPos;
        var mostAverageColor;

        DATA.forEach(function (d) {
            if (d.isMostAverage) {
                mostAverageXPos = xScale(isDateScale ? d.date : d.x);
                mostAverageYPos = yScale(d.y);
                mostAverageColor = colorScale(d.Group);
            }
        });

        // TODO: test most average with date axis
        if (mostAverageXPos && mostAverageYPos) {
            var mostAverage = chartElement.append('g').attr('class', 'most-average');
            mostAverage.append('rect').attr({
                x: 0,
                y: 0,
                width: mostAverageXPos,
                height: mostAverageYPos,
            });
            mostAverage.append('rect').attr({
                x: mostAverageXPos,
                y: mostAverageYPos,
                width: xScale(maxX) - mostAverageXPos,
                height: yScale(minY) - mostAverageYPos,
            });
            mostAverage.append('line').attr({
                x1: mostAverageXPos,
                x2: mostAverageXPos,
                y1: yScale(minY),
                y2: yScale(maxY),
            });
            mostAverage.append('line').attr({
                x1: xScale(minX),
                x2: xScale(maxX),
                y1: mostAverageYPos,
                y2: mostAverageYPos,
            });
        }

        defs.append('pattern')
            .attr({
                id: 'diagonalHatchGrey',
                patternUnits: 'userSpaceOnUse',
                width: 4,
                height: 4,
            })
            .append('path')
                .attr({
                    d: 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2',
                    stroke: '#000',
                    'stroke-width': 2,
                });

        defs.append('pattern')
            .attr({
                id: 'diagonalHatch',
                patternUnits: 'userSpaceOnUse',
                width: 4,
                height: 4,
            })
            .append('path')
                .attr({
                    d: 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2',
                    stroke: mostAverageColor,
                    'stroke-width': 2,
                });

    }

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

    // create generic shapes used by markers
    var markerArea = isMobile ? 16 : 36; // draw shapes with a consistent area
    var circleRadius = Math.sqrt(markerArea / Math.PI);

    if (IS_BUBBLEPLOT) {
        var minZ = d3.min(DATA, function (d) {
            return d.z;
        });

        var bubbleScale = markerArea / minZ;
    }

    // Data labels
    var labelGroup = chartElement.append('g')
        .attr('class', 'labels')
        .selectAll('g')
        .data(DATA)
        .enter().append('g')
            .attr('class', function (d) {
                var classArray = ['label'];
                if (d.LabelPosition) {
                    classArray.push(classify(d.LabelPosition));
                }

                if (d.LabelPriority) {
                    classArray.push(classify(d.LabelPriority));
                }

                return classArray.join(' ');
            })
            .attr({
                id: function (d) {
                    return 'label-' + d.id;
                },

                fill: function (d) {
                    return accessibleColorScale(d.Group);
                },
            });

    ['outline', 'text'].forEach(function (cls) {
        var labelText = labelGroup.append('text')
            .attr('class', cls)
            .attr({
                x: function (d) {
                    return xScale(isDateScale ? d.date : d.x);
                },

                y: function (d) {
                    return yScale(d.y);
                },
            });

        DATA.map(function (d) {
            if (IS_BUBBLEPLOT) {
                d.bubbleArea = d.z * bubbleScale;
                d.bubbleRadius = Math.sqrt(d.bubbleArea / Math.PI);
            }

            d.labelOffset = (IS_BUBBLEPLOT ? d.bubbleRadius : circleRadius) + 3;
            return d;
        });

        labelText.append('tspan')
            .text(function (d) {
                return d.Label;
            })
            .attr({
                dy: function (d) {
                    switch (d.LabelPosition) {
                        case 'left':
                        case 'right':
                            return IS_BUBBLEPLOT ? '-0.5em' : 0;
                        case 'below':
                            return d.labelOffset;
                        default: // above
                            return IS_BUBBLEPLOT ? -d.labelOffset - 12 : -d.labelOffset;
                    }
                },
            });

        if (IS_BUBBLEPLOT) {

            labelText.append('tspan')
                .attr('class', 'value')
                .text(function (d) {
                    return d.z;
                })
                .attr({
                    x: function (d) {
                        return xScale(isDateScale ? d.date : d.x);
                    },

                    dy: '1em',
                });

        }

        labelText.selectAll('tspan')
            .attr({
                dx: function (d) {
                    switch (d.LabelPosition) {
                        case 'left':
                            return -d.labelOffset;
                        case 'right':
                            return d.labelOffset;
                    }
                },
            });

    });

    var shapesArr = [];

    // Point markers
    GROUPED_DATA.forEach(function (group, i) {
        var shape = (function (groupIndex) {
            if (IS_BUBBLEPLOT) {
                return 'bubble';
            } else {
                switch (groupIndex) {
                    // first 2 groups will use default circle shape
                    case 2:
                        return 'diamond'; // ⬥
                    case 3:
                        return 'triangle-up'; // ▲
                    case 4:
                        return 'square'; // ■
                    case 5:
                        return 'pentagon'; // ⬟
                    case 6:
                        return 'triangle-down'; // ▼
                    default:
                        return 'circle'; // ●
                }
            }
        })(i);

        shapesArr.push(shape);

        // alias for use by legend
        defs.append('use')
            .attr({
                'xlink:href': '#' + shape,
                id: 'group' + i,
            });

        // add the markers to the chart
        chartElement.append('g')
            .attr('class', 'point ' + classify(group.key))
            .attr({
                fill: colorScale(group.key),
                stroke: colorScale(group.key),
            })
            .selectAll('use')
            .data(group.values)
            .enter().append('use')
            .attr({
                'xlink:href': function (d) {
                    if (IS_BUBBLEPLOT) {
                        return '#bubble-' + d.z;
                    }

                    return '#' + shape;
                },

                x: function (d) {
                    return xScale(isDateScale ? d.date : d.x);
                },

                y: function (d) {
                    return yScale(d.y);
                },

                fill: function (d) {
                    if (d.isMostAverage) {
                        return 'url(#diagonalHatch)';
                    }
                },

            })
            .on({
                mouseover: function (d) {
                    var el = chartElement.select('#label-' + d.id).classed('hover', true);
                    chartElement.select('g.hover-labels').append(function () {
                        return el.node();
                    });
                },

                mouseout: function (d) {
                    var el = chartElement.select('#label-' + d.id).classed('hover', false);
                    chartElement.select('g.labels').append(function () {
                        return el.node();
                    });
                },
            });

    });

    chartElement.append('g')
        .attr('class', 'hover-labels');

    if (IS_BUBBLEPLOT) {

        // create a bubble def for each unique bubble size
        d3.map(DATA, function (d) {
            return d.z;
        }).keys().forEach(function (z) {
            var bubbleArea = z * bubbleScale;
            var bubbleRadius = Math.sqrt(bubbleArea / Math.PI);
            defs.append('circle')
                .attr({
                    id: 'bubble-' + z,
                    r: bubbleRadius,
                });
        });

        defs.append('circle')
            .attr({
                id: 'bubble',
                r: circleRadius,
            });

    } else {
        var inShapesArr = function (shape) {
            return shapesArr.indexOf(shape) !== -1;
        };

        if (inShapesArr('circle')) {
            defs.append('circle')
                .attr({
                    id: 'circle',
                    r: circleRadius,
                });
        }

        var containsDiamond = inShapesArr('diamond');
        if (containsDiamond || inShapesArr('square')) {
            var squareSide = Math.sqrt(markerArea);
            defs.append('rect')
                .attr('class', 'marker')
                .attr({
                    id: 'square',
                    height: squareSide,
                    width: squareSide,
                    x: -squareSide / 2,
                    y: -squareSide / 2,
                });

            if (containsDiamond) {
                defs.append('use')
                    .attr({
                        'xlink:href': '#square',
                        id: 'diamond',
                        transform: 'rotate(45 0 0)',
                    });
            }
        }

        var containsTriangleDown = inShapesArr('triangle-down');
        if (containsTriangleDown || inShapesArr('triangle-up')) {
            defs.append('polygon')
                .attr({
                    id: 'triangle-up',
                    points: function () {
                        var side = Math.sqrt(markerArea / (Math.sqrt(3) / 4));
                        var height = Math.sqrt(Math.pow(side, 2) - Math.pow((side / 2), 2));
                        var innerRadius = Math.sqrt(3) / 6 * side;

                        var x = {
                            left: -side / 2,
                            centre: 0,
                            right: side / 2,
                        };

                        var y = {
                            top: innerRadius - height,
                            bottom: innerRadius,
                        };

                        return makePointsString([
                            [x.left, y.bottom],
                            [x.right, y.bottom],
                            [x.centre, y.top],
                        ]);
                    },
                });

            if (containsTriangleDown) {
                defs.append('use')
                    .attr({
                        'xlink:href': '#triangle-up',
                        id: 'triangle-down',
                        transform: 'rotate(180 0 0)',
                    });
            }
        }

        if (inShapesArr('pentagon')) {
            defs.append('polygon')
                .attr({
                    id: 'pentagon',
                    points: function () {
                        var side = Math.sqrt(4 * markerArea / Math.sqrt(25 + 10 * Math.sqrt(5)));
                        var width = side / 2 * (1 + Math.sqrt(5));
                        var height = side / 2 * (Math.sqrt(5 + 2 * Math.sqrt(5)));
                        var radius = side / 10 * Math.sqrt(50 + 10 * Math.sqrt(5));
                        var sideOffset = Math.sqrt(Math.pow(side, 2) - Math.pow(width / 2, 2));

                        var x = {
                            left: -width / 2,
                            centreLeft: -side / 2,
                            centre: 0,
                            centreRight: side / 2,
                            right: width / 2,
                        };

                        var y = {
                            top: -radius,
                            middle: sideOffset - radius,
                            bottom: height - radius,
                        };

                        return makePointsString([
                            [x.left, y.middle],
                            [x.centre, y.top],
                            [x.right, y.middle],
                            [x.centreRight, y.bottom],
                            [x.centreLeft, y.bottom],
                        ]);
                    },
                });
        }
    }

    var legendLineHeight = 23;

    // Add a groups legend
    if (GROUPED_DATA.length > 1) {

        var groupsLegend = legendContainer.append('div')
            .attr('class', 'groups')
            .selectAll('div')
            .data(GROUPED_DATA)
            .enter().append('div')
            .style('color', function (d) {
                return accessibleColorScale(d.key);
            });

        groupsLegend // add markers
            .append('svg')
                .attr({
                    width: 15,
                    height: legendLineHeight,
                })
                .append('use')
                    .attr('class', 'point')
                    .attr({
                        'xlink:href': function (d, i) {
                            return '#group' + i;
                        },

                        x: 15 / 2,
                        y: legendLineHeight / 2,

                        fill: function (d) {
                            return colorScale(d.key);
                        },

                        stroke: function (d) {
                            return colorScale(d.key);
                        },
                    });

        groupsLegend // add text labels
            .append('span')
                .text(function (d) {
                    return d.key;
                });

        if (LABELS.trendlines === 'on') {
            groupsLegend // add markers
                .append('svg')
                    .attr({
                        width: 21,
                        height: legendLineHeight,
                    })
                    .append('line')
                        .attr('class', 'trendline')
                        .attr({
                            x1: 9,
                            x2: 18,
                            y1: legendLineHeight / 2,
                            y2: legendLineHeight / 2,

                            stroke: function (d) {
                                return colorScale(d.key);
                            },
                        });

            groupsLegend // add text labels
                .append('span')
                    .text('Trend line');

        }
    }

    // add a magnitude / Z axis legend
    if (IS_BUBBLEPLOT) {

        var magnitudeLegend = legendContainer.append('div')
            .attr('class', 'magnitude');

        var magLegSvg = magnitudeLegend.append('svg');

        var offset = 1;
        var buffer = 3;

        [2, 4, 7].forEach(function (radius) {
            defs.append('circle')
                .attr({
                    id: 'mag' + radius,
                    r: radius,
                });

            magLegSvg.append('use')
                .attr('class', 'point')
                .attr({
                    'xlink:href': function (d, i) {
                        return '#mag' + radius;
                    },

                    x: radius + offset,
                    y: legendLineHeight / 2,
                });

            offset += (radius * 2) + buffer;
        });

        magLegSvg.attr({
            width: offset,
            height: legendLineHeight,
        });

        magnitudeLegend.append('span').text(LABELS.zLabel);

    }

    if (LABELS.mostAverage === 'on') {
        var mostAverageLegend = legendContainer.append('div')
            .attr('class', 'most-average');

        var mostAvgLegSvg = mostAverageLegend.append('svg')
            .attr({
                width: legendLineHeight + 5,
                height: legendLineHeight,
            });

        mostAvgLegSvg.append('line').attr({
            x1: legendLineHeight / 2,
            x2: legendLineHeight / 2,
            y1: 0,
            y2: legendLineHeight,
        });

        mostAvgLegSvg.append('line').attr({
            x1: 0,
            x2: legendLineHeight,
            y1: legendLineHeight / 2,
            y2: legendLineHeight / 2,
        });

        mostAvgLegSvg.append('use')
            .attr('class', 'point')
            .attr({
                'xlink:href': function (d, i) {
                    return '#group' + i;
                },

                x: legendLineHeight / 2,
                y: legendLineHeight / 2,
                fill: 'url(#diagonalHatchGrey)',
            });

        mostAverageLegend.append('span').text('Most average');

    }

    if (LABELS.trendlines === 'on') {

        // returns slope, intercept and r-square of the line
        var leastSquares = function (xSeries, ySeries) {
            var reduceSumFunc = function (prev, cur) {
                return prev + cur;
            };

            var xBar = xSeries.reduce(reduceSumFunc) / xSeries.length;
            var yBar = ySeries.reduce(reduceSumFunc) / ySeries.length;

            var ssXX = xSeries.map(function (d) {
                return Math.pow(d - xBar, 2);
            }).reduce(reduceSumFunc);

            /*
            var ssYY = ySeries.map(function (d) {
                return Math.pow(d - yBar, 2);
            }).reduce(reduceSumFunc);
            */

            var ssXY = xSeries.map(function (d, i) {
                return (d - xBar) * (ySeries[i] - yBar);
            }).reduce(reduceSumFunc);

            var slope = ssXY / ssXX;

            return {
                slope: slope,
                intercept: yBar - (xBar * slope),

                //rSquare: Math.pow(ssXY, 2) / (ssXX * ssYY),
            };
        };

        GROUPED_DATA.forEach(function (group) {

            // get the x and y values for least squares
            var xSeries = group.values.map(function (d) { return d.x; });

            var ySeries = group.values.map(function (d) { return d.y; });

            var ls = leastSquares(xSeries, ySeries);

            var getTrendlineXY = function (x) {
                var y = x * ls.slope + ls.intercept;

                if (y < minY) {
                    return {
                        x: (minY - ls.intercept) / ls.slope,
                        y: minY,
                    };
                } else if (y > maxY) {
                    return {
                        x: (maxY - ls.intercept) / ls.slope,
                        y: maxY,
                    };
                }

                return {
                    x: x,
                    y: y,
                };
            };

            var start = getTrendlineXY(minX);
            var finish = getTrendlineXY(maxX);

            chartElement.append('line')
                .attr('class', 'trendline ' + classify(group.key))
                .attr({
                    x1: xScale(start.x),
                    y1: yScale(start.y),
                    x2: xScale(finish.x),
                    y2: yScale(finish.y),
                    stroke: colorScale(group.key),
                });

        });
    }

};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
