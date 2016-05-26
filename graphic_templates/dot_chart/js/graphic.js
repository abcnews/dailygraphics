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
        d.min = +d.min;
        d.max = +d.max;
    });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart!
    renderDotChart({
        container: '#dot-chart',
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a bar chart.
 */
var renderDotChart = function (config) {
    /*
     * Setup
     */
    var barHeight = 20;
    var barGap = 5;
    var labelWidth = 60;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    var margins = {
        top: parseInt(LABELS.marginTop || 0, 10),
        right: parseInt(LABELS.marginRight || 20, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || (labelWidth + labelMargin), 10),
    };

    var ticksX = 4;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 6;
        margins.right = 30;
    }

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
    var chartHeight = ((barHeight + barGap) * DATA.length);

    var chartElement = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        .append('g')
            .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

    var max = d3.max(DATA, function (d) {
        return Math.ceil(d.max / roundTicksFactor) * roundTicksFactor;
    });

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.linear()
        .domain([0, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function (d) {
            return d + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function () {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render range bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(DATA)
        .enter()
        .append('line')
            .attr({
                x1: function (d, i) {
                    return xScale(d.min);
                },

                x2: function (d, i) {
                    return xScale(d.max);
                },

                y1: function (d, i) {
                    return i * (barHeight + barGap) + (barHeight / 2);
                },

                y2: function (d, i) {
                    return i * (barHeight + barGap) + (barHeight / 2);
                },
            });

    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(DATA)
        .enter().append('circle')
            .attr('cx', function (d, i) {
                return xScale(d.amt);
            })
            .attr('cy', function (d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', dotRadius);

    /*
     * Render bar labels.
     */
    containerElement
        .append('ul')
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
            .style({
                width: labelWidth + 'px',
                height: barHeight + 'px',
                left: 0,
                top: function (d, i) {
                    return (i * (barHeight + barGap)) + 'px';
                },
            })
            .attr('class', function (d) {
                return classify(d.label);
            })
            .append('span')
                .text(function (d) {
                    return d.label;
                });

    /*
     * Render bar values.
     */
    _.each(['shadow', 'value'], function (cls) {
        chartElement.append('g')
            .attr('class', cls)
            .selectAll('text')
            .data(DATA)
            .enter().append('text')
                .attr('x', function (d, i) {
                    return xScale(d.max) + 6;
                })
                .attr('y', function (d, i) {
                    return i * (barHeight + barGap) + (barHeight / 2) + 3;
                })
                .text(function (d) {
                    return d.amt.toFixed(1) + '%';
                });
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
