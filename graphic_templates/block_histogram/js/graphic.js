// Global config
var COLOR_BINS = [-4, -2, 0, 2, 4, 6, 8, 10];

// Global vars
var pymChild = null;
var isMobile = false;
var binnedData = [];

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
    var numBins = COLOR_BINS.length - 1;

    // init the bins
    for (var i = 0; i < numBins; i++) {
        binnedData[i] = [];
    }

    // put states in bins
    DATA.forEach(function (d) {
        if (d.amt !== null) {
            var amt = +d.amt;
            var state = d.usps;

            for (var i = 0; i < numBins; i++) {
                if (amt >= COLOR_BINS[i] && amt < COLOR_BINS[i + 1]) {
                    binnedData[i].unshift(state);
                    break;
                }
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
    renderBlockHistogram();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a bar chart.
 */
var renderBlockHistogram = function () {
    /*
     * Setup
     */
    var blockHeight = isMobile ? 18 : 30;

    var blockGap = parseInt(LABELS.blockGap || 1, 10);

    var margins = {
        top: parseInt(LABELS.marginTop || 20, 10),
        right: parseInt(LABELS.marginRight || 12, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || 10, 10),
    };

    var ticksY = parseInt(LABELS.ticksY || 4, 10);

    // Determine largest bin
    var largestBin = binnedData.reduce(function (p, v) {
        return v.length > p.length ? v : p;
    }, []).length;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#block-histogram');
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = (blockHeight + blockGap) * largestBin;

    var chartElement = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        .append('g')
            .attr('transform', makeTranslate(margins.left, margins.top));

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(COLOR_BINS.slice(0, -1))
        .rangeRoundBands([0, chartWidth], 0.1);

    var yScale = d3.scale.linear()
        .domain([0, largestBin])
        .rangeRound([chartHeight, 0]);

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);

    var colorScale = d3.scale.ordinal()
        .range(colorList);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .outerTickSize(0)
        .tickFormat(function (d) {
            if (d > 0) {
                return '+' + d + '%';
            } else {
                return d + '%';
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

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
    var yAxisGrid = function () {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Shift tick marks
     */
    chartElement.selectAll('.x.axis .tick')
        .attr('transform', function () {
            var el = d3.select(this);
            var transform = d3.transform(el.attr('transform'));

            transform.translate[0] = transform.translate[0] - (xScale.rangeBand() / 2) - ((xScale.rangeBand() * 0.1) / 2);
            transform.translate[1] = 3;

            return transform.toString();
        });

    var lastTick = chartElement.select('.x.axis')
        .append('g')
        .attr('class', 'tick')
        .attr('transform', function () {
            var transform = d3.transform();
            var lastBin = xScale.domain()[xScale.domain().length - 1];

            transform.translate[0] = xScale(lastBin) + xScale.rangeBand() + ((xScale.rangeBand() * 0.1) / 2);
            transform.translate[1] = 3;

            return transform.toString();
        });

    lastTick.append('line')
        .attr({
            x1: 0,
            x2: 0,
            y1: 0,
            y2: 6,
        });

    lastTick.append('text')
        .attr({
            'text-anchor': 'middle',
            x: 0,
            y: 9,
            dy: '0.71em',
        })
        .text(function () {
            var t = COLOR_BINS[COLOR_BINS.length - 1];
            if (t > 0) {
                return '+' + t + '%';
            } else {
                return t + '%';
            }
        });

    /*
     * Render bins to chart.
     */
    var bins = chartElement.selectAll('.bin')
        .data(binnedData)
        .enter().append('g')
            .attr('class', function (d, i) {
                return 'bin bin-' + i;
            })
            .attr('transform', function (d, i) {
                return makeTranslate(xScale(COLOR_BINS[i]), 0);
            })
            .attr('fill', function (d, i) {
                return colorScale(i);
            });

    bins.selectAll('rect')
        .data(function (d) {
            return d3.entries(d);
        })
        .enter().append('rect')
            .attr('width', xScale.rangeBand())
            .attr('x', 0)
            .attr('y', function (d, i) {
                return chartHeight - ((blockHeight + blockGap) * (i + 1));
            })
            .attr('height', blockHeight)
            .attr('class', function (d) {
                return classify(d.value);
            });

    /*
     * Render bin values.
     */
    bins.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(function (d) {
                return d3.entries(d);
            })
        .enter().append('text')
            .attr('x', (xScale.rangeBand() / 2))
            .attr('y', function (d, i) {
                return chartHeight - ((blockHeight + blockGap) * (i + 1));
            })
            .attr('dy', (blockHeight / 2) + 4)
            .text(function (d) {
                return d.value;
            });

    /*
     * Render annotations
     */
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    annotations.append('text')
        .attr('class', 'label-top')
        .attr('x', xScale(0))
        .attr('dx', -15)
        .attr('text-anchor', 'end')
        .attr('y', -10)
        .html(LABELS.annotation_left);

    annotations.append('text')
        .attr('class', 'label-top')
        .attr('x', xScale(0))
        .attr('dx', 5)
        .attr('text-anchor', 'begin')
        .attr('y', -10)
        .html(LABELS.annotation_right);

    annotations.append('line')
        .attr('class', 'axis-0')
        .attr('x1', xScale(0) - ((xScale.rangeBand() * 0.1) / 2))
        .attr('y1', -margins.top)
        .attr('x2', xScale(0) - ((xScale.rangeBand() * 0.1) / 2))
        .attr('y2', chartHeight);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
