// Global vars
var pymChild = null;
var isMobile = false;
// var xCol = 'x';
var KEY_NESTED_DATA;
// var X_NESTED_DATA;
var FLAT_DATA = [];

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

    /*
     * Restructure tabular data for easier charting.
     */
    lineKeys.forEach(function (d) {
        FLAT_DATA = FLAT_DATA.concat(DATA.map(function (v) {
            return {
                // x: v[xCol],
                amt: v[d],
                key: d,
            };
        }));
    });





    KEY_NESTED_DATA = d3.nest()
        .key(function (d) { return d.key; })
        .entries(FLAT_DATA);

    KEY_NESTED_DATA.forEach(function(d, i) {
        // console.log(i);
        // console.log(d.values);
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
    var labelWidth = parseInt(LABELS.labelWidth || 50);
    var labelMargin = parseInt(LABELS.labelMargin || 6);

    var aspectRatio = getAspectRatio(LABELS.ratio);

    var sparklineHeight = 50;
    var circleRadius = 2;


    var margins = {
        top: parseInt(LABELS.marginTop || 0),
        right: parseInt(LABELS.marginRight || 0), //(labelWidth + labelMargin)),
        bottom: parseInt(LABELS.marginBottom || 0),
        left: parseInt(LABELS.marginLeft || labelWidth + labelMargin),
    };

    if (isMobile) {
        margins.right = margins.right * 0.9;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#sparkline-chart')
    containerElement.html('');


    function drawSparklines(chartData) {
        
        /*
        * Create the root SVG element.
        */
        var chartWrapper = containerElement.append('div')
            .attr('class', 'graphics-wrapper')

        // Calculate actual chart dimensions
        var innerWidth = chartWrapper.node().getBoundingClientRect().width;
        var chartWidth = innerWidth - margins.left - margins.right;
        var chartHeight = sparklineHeight; //Math.ceil(innerWidth / aspectRatio) - margins.top - margins.bottom;

        var xScale = d3.scale.linear().range([0 + circleRadius, chartWidth - circleRadius]);
        var yScale = d3.scale.linear().range([chartHeight - circleRadius, 0 + circleRadius]);

        xScale.domain([0, chartData.values.length] );
        yScale.domain(d3.extent(chartData.values, function(d) { return d.amt; }));

        var colorList = colorArray(LABELS, MONOCHROMECOLORS);

        var minAmt;
        var maxAmt;
        var endAmt = chartData.values[chartData.values.length - 1].amt;


        // Left side label key
        chartWrapper.append('div')
            .classed('sparkline-key', true)
            .style({
                'position': 'absolute',
                'height': chartHeight + 'px',
            })
            .append('ul')
            .classed('labels', true)
            .append('li')
            .append('span')
            .style('line-height', chartHeight + 'px')
            .style('min-width', labelWidth + 'px')
            .text(chartData.key);


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


        // Draw a sparkline
        var line = d3.svg.line()
            .interpolate("linear")
            .x(function(d, i) {
                return xScale(i);
            })
            .y(function(d) {
                return yScale(d.amt);
            });

        chartElement.append('path')
            .datum(chartData.values)
            .classed('sparkline', true)
            .attr('d', line);


        // Set minimum and maximup variables
        var yMin = d3.min(chartData.values, function(d) { return d.amt; });
        var yMax = d3.max(chartData.values, function(d) { return d.amt; });

        chartData.values.forEach(function(d, i) {
            // Find and mark minimum point
            if (d.amt === yMin) {
                minAmt = d.amt;

                chartElement.append('circle')
                    .attr('class', 'sparkcircle data-minimum')
                    .attr('cx', xScale(i))
                    .attr('cy', yScale(minAmt))
                    .attr('r', circleRadius);
            }

            // Find and mark maximum point
            if (d.amt === yMax) {
                maxAmt = d.amt;

                chartElement.append('circle')
                    .attr('class', 'sparkcircle data-maximum')
                    .attr('cx', xScale(i))
                    .attr('cy', yScale(maxAmt))
                    .attr('r', circleRadius);
            }
        });


        chartElement.append('circle')
            .attr('class', 'sparkcircle')
            .attr('cx', xScale(chartData.values.length - 1))
            .attr('cy', yScale(endAmt))
            .attr('r', circleRadius);


        console.log(minAmt + " " + maxAmt + " " + endAmt);

    };



    // For each data column render a chart
    KEY_NESTED_DATA.forEach(function(d, i) {
            drawSparklines(d);
        });

    


};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;