// Global vars
var pymChild = null;
var isMobile = false;

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
    DATA.forEach(function (d) {
        d.start = +d.start;
        d.end = +d.end;
    });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart!
    renderSlopegraph();

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
        right: parseInt(LABELS.marginRight || 185, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || 40, 10),
    };

    if (isMobile) {
        margins.right = 145;
    }

    var labelGap = parseInt(LABELS.labelGap || 45, 10);
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
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = Math.ceil(innerWidth / aspectRatio) - margins.top - margins.bottom;

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain([startLabel, endLabel])
        .range([0, chartWidth]);

    var minY = d3.min(DATA, function (d) {
        return Math.min(d.start, d.end);
    });

    var maxY = d3.max(DATA, function (d) {
        return Math.max(d.start, d.end);
    });

    var yScale = d3.scale.linear()
        .domain([minY, maxY])
        .range([chartHeight, 0]);

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    var accessibleColorScale = d3.scale.ordinal()
        .range(_.map(colorList, function (color) {
            return getAccessibleColor(color);
        }));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(2)
        .innerTickSize(0)
        .tickFormat(function (d) {
            return d;
        });

    var chartElement = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        .append('g')
            .attr('transform', makeTranslate(margins.left, margins.top));

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .call(xAxis)
        .selectAll('text')
            .style('text-anchor', function (d, i) {
                if (i) {
                    return 'start';
                }

                return 'end';
            })
            .attr('dx', function (d, i) {
                if (i) {
                    return valueGap;
                }

                return -valueGap;
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
            .attr('x1', xScale(startLabel))
            .attr('y1', function (d) {
                return yScale(d.start);
            })
            .attr('x2', xScale(endLabel))
            .attr('y2', function (d) {
                return yScale(d.end);
            })
            .style('stroke', function (d, i) {
                return colorScale(i);
            });

    /*
     * Uncomment if needed:
     * Move a particular line to the front of the stack
     */

    // svg.select('line.unaffiliated').moveToFront();

    /*
     * Render values.
     */
    chartElement.append('g')
        .attr('class', 'value start')
        .selectAll('text')
        .data(DATA)
        .enter()
        .append('text')
            .attr('class', function (d) {
                return classify(d.label);
            })
            .attr('x', xScale(startLabel))
            .attr('y', function (d) {
                return yScale(d.start);
            })
            .attr('text-anchor', 'end')
            .attr('dx', -valueGap)
            .attr('dy', 3)
            .style('fill', function (d, i) {
                return accessibleColorScale(i);
            })
            .text(function (d) {
                return formattedNumber(
                    d.start,
                    LABELS.prefixY,
                    LABELS.suffixY,
                    LABELS.maxDecimalPlaces
                );
            });

    chartElement.append('g')
        .attr('class', 'value end')
        .selectAll('text')
        .data(DATA)
        .enter()
        .append('text')
            .attr('class', function (d) {
                return classify(d.label);
            })
            .attr('x', xScale(endLabel))
            .attr('y', function (d) {
                return yScale(d.end);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', valueGap)
            .attr('dy', 3)
            .style('fill', function (d, i) {
                return accessibleColorScale(i);
            })
            .text(function (d) {
                return formattedNumber(
                    d.end,
                    LABELS.prefixY,
                    LABELS.suffixY,
                    LABELS.maxDecimalPlaces
                );
            });

    /*
     * Render labels.
     */
    chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(DATA)
        .enter()
        .append('text')
            .attr('class', function (d, i) {
                return classify(d.label);
            })
            .attr('x', xScale(endLabel))
            .attr('y', function (d) {
                return yScale(d.end);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', labelGap)
            .attr('dy', 3)
            .style('fill', function (d, i) {
                return accessibleColorScale(i);
            })
            .text(function (d) {
                return d.label;
            })
            .call(wrapText, (margins.right - labelGap), 16);

    chartElement.selectAll('.value, .label, .lines')
        .attr('transform', 'translate(0,15)');

};

/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function (texts, width, lineHeight) {
    texts.each(function () {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));

        var tspan = text.text(null)
            .append('tspan')
            .attr({
                x: x,
                y: y,
                dx: dx + 'px',
                dy: dy + 'px',
            });

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr({
                        x: x,
                        y: y,
                        dx: dx + 'px',
                        dy: lineNumber * lineHeight,
                        'text-anchor': 'begin',
                    })
                    .text(word);
            }
        }
    });
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
