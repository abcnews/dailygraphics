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
var formatData = function () {
    DATA.forEach(function (d) {
        d.amt = +d.amt;
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

    // Render the chart!
    renderColumnChart({
        container: '#column-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a column chart.
 */
var renderColumnChart = function () {
    /*
     * Setup chart container.
     */
    var aspectRatio = getAspectRatio(LABELS.ratio);
    var valueGap = parseInt(LABELS.valueGap || 6, 10);

    var margins = {
        top: parseInt(LABELS.marginTop || 30, 10),
        right: parseInt(LABELS.marginRight || 0, 10),
        bottom: parseInt(LABELS.marginBottom || 30, 10),
        left: parseInt(LABELS.marginLeft || 0, 10),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#column-chart');
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
    var xScale = d3.scale.ordinal()
        .domain(DATA.map(function (d) { return d.label; }))
        .rangeRoundBands([0, chartWidth], 0.1);

    var minY = d3.min(DATA, function (d) {
        return d.amt;
    });

    if (minY > 0) {
        minY = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickSize(0)
        .tickPadding(10);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis)
        .select('path').remove();

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
        .classed('bars', true)
        .selectAll('rect')
        .data(DATA)
        .enter()
        .append('rect')
            .attr('class', function (d) {
                return 'bar bar-' + classify(d.label);
            })
            .attr({
                x: function (d) {
                    return xScale(d.label);
                },

                y: function (d) {
                    if (d.amt < 0) {
                        return yScale(0);
                    }

                    return yScale(d.amt);
                },

                width: xScale.rangeBand(),

                height: function (d) {
                    return Math.abs(yScale(d.amt) - yScale(0));
                },

                fill: function (d, i) {
                    return colorScale(i);
                },
            });

    if (LABELS.theme == 'highlight') {
        var highlightIndex;

        chartWrapper.on('mousemove', function (e) {
            var posX = d3.mouse(chartWrapper.node())[0];
            var index = Math.floor(posX / (xScale.rangeBand() + valueGap));

            if (highlightIndex === index) {
                return;
            }

            highlightIndex = index;

            bars.attr('fill', function (d, i) {
                    return colorScale(i);
                })
                .filter(':nth-child(' + (index + 1) + ')')
                    .attr('fill', HIGHLIGHTCOLORS.active);

            values.classed('over', false)
                .filter(':nth-child(' + (index + 1) + ')')
                    .classed('over', true);
        });
    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    /*
     * Render bar values.
     */
    var values = chartElement.append('g')
        .classed('value', true)
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
                    return xScale(d.label) + (xScale.rangeBand() / 2);
                },

                y: function (d) {
                    if (d.amt < 0) {
                        return yScale(0) - valueGap;
                    }

                    return yScale(d.amt) - valueGap;
                },

                fill: function (d, i) {
                    return accessibleColorScale(i);
                },

            });

};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
