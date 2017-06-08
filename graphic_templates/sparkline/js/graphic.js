// Global vars
var pymChild = null;
var isMobile = false;
var xCol = 'x';
// var KEY_NESTED_DATA;
// var X_NESTED_DATA;
// var FLAT_DATA = [];

var lineKeys = d3.set(d3.map(DATA[0]).keys());

/* Initialize the graphic.
----------------------------------------------------*/
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
 * Re-format graphic data for processing by D3.
 */



var formatData = function () {

    // Map through data anc convert to numbers
    DATA = DATA.map(function (obj) {
        return d3.entries(obj).reduce(function (memo, val) {
            var key = val.key;
            var value = val.value;
            var formattedValue;
            
            formattedValue = +value; // turn string into number

            memo[key] = formattedValue;
            return memo;
        }, {});
    });


};


/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
    containerWidth = containerWidth || DEFAULT_WIDTH;
    isMobile = (containerWidth <= MOBILE_THRESHOLD);

    // Render the chart
    renderSparklineChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a Sparkline chart.
 */
var renderSparklineChart = function () {
    /*
     * Setup
     */
    var labelWidth = parseInt(LABELS.labelWidth || 85);
    var labelMargin = parseInt(LABELS.labelMargin || 6);

    var aspectRatio = getAspectRatio(LABELS.ratio);

    var circleRadius = 2.5;


    var margins = {
        top: parseInt(LABELS.marginTop || 0),
        right: parseInt(LABELS.marginRight || 0), //(labelWidth + labelMargin)),
        bottom: parseInt(LABELS.marginBottom || 0),
        left: parseInt(LABELS.marginLeft || labelWidth + labelMargin),
    };

    if (isMobile) {
        margins.right = margins.right * 0.9;
    }

    // var roundTicksFactor = parseInt(LABELS.roundTicksFactor || 5, 10);

    // var ticksX = parseInt(LABELS.ticksX || 10, 10);
    // var ticksY = parseInt(LABELS.ticksY || 10, 10);
    // if (isMobile) {
    //     ticksX = parseInt(LABELS.mobileTicksX || 5, 10);
    //     ticksY = parseInt(LABELS.mobileTicksY || 5, 10);
    // }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#sparkline-chart')
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphics-wrapper')

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = Math.ceil(innerWidth / aspectRatio) - margins.top - margins.bottom;

    var xScale = d3.scale.linear().range([0 + circleRadius, chartWidth - circleRadius]);
    var yScale = d3.scale.linear().range([chartHeight - circleRadius, 0 + circleRadius]);

    xScale.domain([0, DATA.length] );
    yScale.domain(d3.extent(DATA, function(d) { return d.amt; }));


    var colorList = colorArray(LABELS, MONOCHROMECOLORS);

    var lineKeyScale = d3.scale.ordinal().domain(lineKeys);

    var colorScale = lineKeyScale.copy()
        .range(colorList);

    var accessibleColorScale = lineKeyScale.copy()
        .range(colorList.map(function (color) {
            return getAccessibleColor(color);
        }));


    var chartSvg = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        });
        

    var chartElement = chartSvg.append('g')
            .attr('transform', makeTranslate(margins.left, margins.top));


    var overlay = chartElement.append('rect')
        .attr({
            width: chartWidth,
            height: chartHeight,
            fill: 'transparent',
        });


    // Draw a sparline (do multiple in future)
    var line = d3.svg.line()
        .interpolate("linear")
        .x(function(d, i) {
            return xScale(i);
        })
        .y(function(d) {
            return yScale(d.amt);
        });

    chartElement.append('path')
        .datum(DATA)
        .classed('sparkline', true)
        .attr('d', line);

    chartElement.append('circle')
        .attr('class', 'sparkcircle')
        .attr('cx', xScale(DATA.length - 1))
        .attr('cy', yScale(DATA[DATA.length - 1].amt))
        .attr('r', circleRadius);

    // Set minimum and maximup variables
    var yMin = d3.min(DATA, function(d) { return d.amt; });
    var yMax = d3.max(DATA, function(d) { return d.amt; });

    DATA.forEach(function(d, i) {
        // Find and mark minimum point
        if (d.amt === yMin) { 
            chartElement.append('circle')
                .attr('class', 'sparkcircle data-minimum')
                .attr('cx', xScale(i))
                .attr('cy', yScale(d.amt))
                .attr('r', circleRadius);
        }

        // Find and mark maximum point
        if (d.amt === yMax) {
            chartElement.append('circle')
                .attr('class', 'sparkcircle data-maximum')
                .attr('cx', xScale(i))
                .attr('cy', yScale(d.amt))
                .attr('r', circleRadius);
        }
    });

};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;