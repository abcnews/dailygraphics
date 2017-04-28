// Global config
var SIDEBAR_THRESHOLD = 280;

// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;

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

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['start'] = +d['start'];
        d['end'] = +d['end'];
    });
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

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Render the chart!
    renderSlopegraph({
        container: '#slopegraph',
        width: containerWidth,
        data: DATA,
        labels: LABELS
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a line chart.
 */
var renderSlopegraph = function () {
    /*
     * Setup
     */
    var startLabel = LABELS.start_label;
    var endLabel = LABELS.end_label;

    var aspectRatio = getAspectRatio(LABELS.ratio, {
        base: 3 / 2,
        mobile: 2 / 3,
    });

    var margins = {
        top: parseInt(LABELS.marginTop || 20, 10),
        right: parseInt(LABELS.marginRight || 30, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || 30, 10),
    };

    var labelWidth = parseInt(LABELS.labelWidth || 80, 10);
    var valueGap = parseInt(LABELS.valueGap || 6, 10);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#slopegraph');
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var horizMargins = margins.left + margins.right;
    var vertMargins = margins.top + margins.bottom;
    var labelAndGapWidth = labelWidth + valueGap;
    var noOfLabelCols = isMobile ? 1 : 2;
    var chartWidth = innerWidth - horizMargins - (labelAndGapWidth * noOfLabelCols);
    var chartHeight = Math.ceil(innerWidth / aspectRatio) - vertMargins;

    /*
     * Create D3 scale objects.
     */

    var xLabels = [startLabel, endLabel];

    var xScale = d3.scale.ordinal()
        .domain(xLabels)
        .range([0, chartWidth]);

    var min = d3.min(config['data'], function(d) {
        var rowMin = d3.min([d[startColumn], d[endColumn]]);
        return Math.floor(rowMin / roundTicksFactor) * roundTicksFactor;
    });

    var max = d3.max(config['data'], function(d) {
        var rowMax = d3.max([d[startColumn], d[endColumn]]);
        return Math.ceil(rowMax / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var labelScale = d3.scale.ordinal()
        .domain(DATA.map(function (d) {
            return d.label;
        }));

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);
    var colorScale = labelScale.copy()
        .range(colorList);

    var accessibleColorScale = labelScale.copy()
        .range(colorList.map(function (color) {
            return getAccessibleColor(color);
        }));

    var leftOffset = isMobile ? margins.left : margins.left + labelAndGapWidth;

    var chartSVG = chartWrapper.append('svg')
        .attr({
            width: chartWidth + horizMargins + (labelAndGapWidth * noOfLabelCols),
            height: chartHeight + vertMargins,
        });

    var chartElement = chartSVG.append('g')
            .attr('transform', makeTranslate(leftOffset, margins.top));

    /*
     * Render axes to chart.
     */
    chartWrapper.selectAll('svg').append('g')
        .attr('class', 'x axis')
        .selectAll('text')
        .data(xLabels)
        .enter()
        .append('text')
            .style('text-anchor', function (d, i) {
                if (i) {
                    return 'end';
                }
            })
            .attr('x', function (d, i) {
                if (i) {
                    return innerWidth;
                }
            })
            .text(function (d) {
                return d;
            });

    /*
     * Render lines to chart.
     */
    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('line')
        .data(DATA)
        .enter()
        .append('line')
            .attr('class', function (d, i) {
                return 'line ' + classify(d.label);
            })
            .attr({
                x1: xScale(startLabel),
                y1: function (d) {
                    return yScale(d.start);
                },

                x2: xScale(endLabel),
                y2: function (d) {
                    return yScale(d.end);
                },
            })
            .style('stroke', function (d) {
                return colorScale(d.label);
            });

    /*
     * Uncomment if needed:
     * Move a particular line to the front of the stack
     */

    // svg.select('line.unaffiliated').moveToFront();

    var getGroupedSortedData = function (key) {
        return d3.nest()
            .key(function (d) {
                return d[key];
            })
            .sortKeys(function (a, b) {
                return parseFloat(b) - parseFloat(a);
            })
            .entries(DATA);
    };

    var DATA_GROUPED_START = getGroupedSortedData('start');
    var DATA_GROUPED_END = getGroupedSortedData('end');

    /*
     * Render values.
     */
    var addValues = function (cls) {
        return chartElement.append('g')
            .attr('class', 'value ' + cls)
            .selectAll('text')
            .data((cls === 'start') ? DATA_GROUPED_START : DATA_GROUPED_END)
            .enter()
            .append('text')
                .attr('class', function (d) {
                    return d.values.map(function (v) {
                        return classify(v.label);
                    }).join(' ');
                })
                .attr({
                    x: xScale(cls === 'start' ? startLabel : endLabel),
                    y: function (d) {
                        return yScale(d.values[0][cls]);
                    },

                    dx: (cls === 'start' ? -valueGap : valueGap),
                    dy: 4,
                    fill: function (d) {
                        return accessibleColorScale(d.values[0].label);
                    },
                })
                .text(function (d) {
                    return formattedNumber(
                        d.values[0][cls],
                        LABELS.valuePrefix,
                        LABELS.valueSuffix,
                        LABELS.maxDecimalPlaces
                    );
                });
    };

    var valuesStart = addValues('start');
    var valuesEnd = addValues('end');

    /*
     * Render labels.
     */

    var addLabels = function (elem, d) {
        var g = d3.select(elem);
        d.values.forEach(function (v, i) {
            g.append('text')
                .attr('class', classify(v.label))
                .attr({
                    x: 0,
                    fill: accessibleColorScale(v.label),
                })
                .text(v.label)
                .call(wrapText, labelWidth, '1.1em')
                .attr({
                    y: function () {
                        if (!i) {
                            return 0;
                        }

                        var textElems = g.selectAll('text').filter(function (d, j) {
                            return j < i;
                        });

                        return getCombinedHeightOfElements(textElems);
                    },
                });
        });
    };

    var prevStartYLimit;
    var prevEndYLimit;

    if (!isMobile) {
        // get the width of the widest start value
        var valuesStartMaxWidth = getMaxElemWidth(valuesStart);
        var labelsStart = chartElement.append('g')
            .attr('class', 'label start')
            .selectAll('g')
            .data(DATA_GROUPED_START)
            .enter()
            .append('g')
                .each(function (d) {
                    addLabels(this, d);
                })
                .attr('transform', function (d, i) {
                    var x = xScale(startLabel) - (valuesStartMaxWidth + (valueGap * 2));
                    var y = yScale(d.values[0].start) + 4;

                    if (i) {
                        if (y < prevStartYLimit) {
                            y = prevStartYLimit;

                            valuesStart.filter(function (e, j) {
                                return i === j;
                            }).attr({
                                y: prevStartYLimit - 4,
                            });
                        }

                    }

                    // set prev value for the next item
                    var textElems = d3.select(this).selectAll('text');
                    prevStartYLimit = y + getCombinedHeightOfElements(textElems);

                    return makeTranslate(x, y);
                });
    } else {
        // Need to reposition values so they don't overlap
        // (on mobile they don't have the labels)
        valuesStart.each(function (d, i) {

            var selection = d3.select(this);
            var y = parseFloat(selection.attr('y'), 10);

            if (i) {
                if (y < prevStartYLimit) {
                    y = prevStartYLimit;
                    selection.attr({
                        y: prevStartYLimit,
                    });
                }
            }

            // set prev value for the next item
            prevStartYLimit = y + this.getBBox().height;
        });

    }

    // get the width of the widest end value
    var valuesEndMaxWidth = getMaxElemWidth(valuesEnd);
    var labelsEnd = chartElement.append('g')
        .attr('class', 'label end')
        .selectAll('g')
        .data(DATA_GROUPED_END)
        .enter()
        .append('g')
            .each(function (d) {
                addLabels(this, d);
            })
            .attr('transform', function (d, i) {
                var x = xScale(endLabel) + valuesEndMaxWidth + (valueGap * 2);
                var y = yScale(d.values[0].end) + 4;

                if (i) {
                    if (y < prevEndYLimit) {
                        y = prevEndYLimit;

                        // move the value down too
                        valuesEnd.filter(function (e, j) {
                            return i === j;
                        }).attr({
                            y: prevEndYLimit - 4,
                        });
                    }

                }

                // set prev value for the next item
                var textElems = d3.select(this).selectAll('text');
                prevEndYLimit = y + getCombinedHeightOfElements(textElems);

                return makeTranslate(x, y);
            });

    // increase height to accommodate multiline labels
    chartSVG.attr('height', d3.max([prevStartYLimit, prevEndYLimit]) + vertMargins);

    chartElement.selectAll('.value, .label, .lines')
        .attr('transform', 'translate(0,15)');

};

var getMaxElemWidth = function (elems) {
    var maxWidth = 0;
    elems.each(function () {
        var width = d3.select(this).node().getComputedTextLength();
        if (width > maxWidth) {
            maxWidth = width;
        }
    });

    return maxWidth;
};

var getCombinedHeightOfElements = function (selection) {
    var height = 0;
    selection.each(function (t, j) {
        height = height + this.getBBox().height;
    });

    return height;
};

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
        this.parentNode.appendChild(this);
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
