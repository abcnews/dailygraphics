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
        d.amt = +d.amt;
    });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart!
    renderBarChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a bar chart.
 */
var renderBarChart = function () {
    /*
     * Setup
     */
    var numBars = DATA.length;

    var barHeight = parseInt(LABELS.barHeight || (numBars > 2 ? 10 : 30), 10);
    var barGap = parseInt(LABELS.barGap || 10, 10);
    var labelWidth = parseInt(LABELS.labelWidth || 85, 10);
    var labelMargin = parseInt(LABELS.labelMargin || 6, 10);
    var valueGap = parseInt(LABELS.valueGap || 6, 10);
    var labelLineHeight = barHeight >= 20 ? 14 : barHeight;

    var margins = {
        top: parseInt(LABELS.marginTop || 0, 10),
        right: parseInt(LABELS.marginRight || 20, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || (labelWidth + labelMargin), 10),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#bar-chart');
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

    var overlay = chartElement.append('rect')
        .attr({
            width: chartWidth,
            height: chartHeight,
            fill: 'transparent',
        });

    /*
     * Create D3 scale objects.
     */
    var minX;
    if (LABELS.minX) {
        minX = parseFloat(LABELS.minX, 10);
    } else {
        minX = d3.min(DATA, function (d) {
            return d.amt;
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
            return d.amt;
        });
    }

    var xScale = d3.scale.linear()
        .domain([minX, maxX])
        .range([0, chartWidth]);

    var colorList = colorArray(LABELS, SINGLECOLORS);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    var accessibleColorScale = d3.scale.ordinal()
        .range(colorList.map(function (color) {
            return getAccessibleColor(color);
        }));

    /*
     * Render bars to chart.
     */
    var bars = chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(DATA)
        .enter()
        .append('rect')
            .attr('class', function (d, i) {
                return 'bar-' + i + ' ' + classify(d.label);
            })
            .attr({
                x: function (d) {
                    if (d.amt >= 0) {
                        return xScale(0);
                    }

                    return xScale(d.amt);
                },

                y: function (d, i) {
                    return i * (barHeight + barGap);
                },

                width: function (d) {
                    return Math.abs(xScale(0) - xScale(d.amt));
                },

                height: barHeight,

                fill: function (d, i) {
                    return colorScale(i);
                },
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
            .attr('class', function (d) {
                return classify(d.label);
            })
            .style({
                'line-height': labelLineHeight + 'px',
                width: labelWidth + 'px',
                height: barHeight + 'px',
                left: 0,
                top: function (d, i) {
                    return (i * (barHeight + barGap)) + 'px';
                },
            })
            .append('span')
                .text(function (d) {
                    return d.label;
                });

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(DATA)
        .enter()
        .append('text')
            .text(function (d) {
                return formattedNumber(
                    d.amt,
                    LABELS.valuePrefix,
                    LABELS.valueSuffix,
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

                fill: function (d, i) {
                    return accessibleColorScale(i);
                },

            });

    if (LABELS.theme == 'highlight') {
        chartWrapper.on('mousemove', function (e) {
            var posY = d3.mouse(chartWrapper.node())[1];
            var barIndex = Math.floor(posY / (barHeight + barGap));

            bars.attr('fill', function (d, i) {
                    return colorScale(i);
                })
                .filter(':nth-child(' + (barIndex + 1) + ')')
                    .attr('fill', HIGHLIGHTCOLORS.active);
        });
    }

};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
