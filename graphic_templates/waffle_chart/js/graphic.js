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
    renderWaffleChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a pie chart.
 */
var renderWaffleChart = function () {
    /*
     * Setup
     */
    var margins = {
        top: parseInt(LABELS.marginTop || 0, 10),
        right: parseInt(LABELS.marginRight || 15, 10),
        bottom: parseInt(LABELS.marginBottom || 20, 10),
        left: parseInt(LABELS.marginLeft || 15, 10),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#waffle-chart');
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphics-wrapper');

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = chartWidth;

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

    var colorList = colorArray(LABELS, MULTICOLORS);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    var radius = chartWidth / 2;

    var arc = d3.svg.arc()
        .outerRadius(radius)
        .innerRadius(0);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function (d) {
            return d.amt;
        });

    var g = chartElement.selectAll('.arc')
        .data(pie(DATA))
        .enter().append('g')
            .attr('class', 'arc')
            .attr('transform', makeTranslate(radius, radius));

    g.append('path')
        .attr('d', arc)
        .style('fill', function (d, i) {
            return colorScale(i);
        });

    var text = g.append('text')
        .attr('transform', function (d) {
            return 'translate(' + arc.centroid(d) + ')';
        })
        .each(function (d) {
            // Finds "\n" in text and splits it into tspans
            var words = d.data.label.replace(/\\n/g, '\n').split('\n');

            for (var i = 0; i < words.length; i++) {
                var tspan = d3.select(this).append('tspan').text(words[i]);
                if (i > 0) {
                    tspan.attr({
                        x: 0,
                        dy: '1em',
                    });
                }
            }
        });

    text.append('tspan')
        .attr('class', 'value')
        .text(function (d) {
            return formattedNumber(
                d.data.amt,
                LABELS.valuePrefix,
                LABELS.valueSuffix,
                LABELS.maxDecimalPlaces
            );
        })
        .attr({
            x: 0,
            dy: '1.5em',
        });

};



// var renderPieChart = function () {
//     /*
//      * Setup
//      */
//     var margins = {
//         top: parseInt(LABELS.marginTop || 0, 10),
//         right: parseInt(LABELS.marginRight || 15, 10),
//         bottom: parseInt(LABELS.marginBottom || 20, 10),
//         left: parseInt(LABELS.marginLeft || 15, 10),
//     };

//     // Clear existing graphic (for redraw)
//     var containerElement = d3.select('#waffle-chart');
//     containerElement.html('');

//     /*
//      * Create the root SVG element.
//      */
//     var chartWrapper = containerElement.append('div')
//         .attr('class', 'graphics-wrapper');

//     // Calculate actual chart dimensions
//     var innerWidth = chartWrapper.node().getBoundingClientRect().width;
//     var chartWidth = innerWidth - margins.left - margins.right;
//     var chartHeight = chartWidth;

//     var chartElement = chartWrapper.append('svg')
//         .attr({
//             width: chartWidth + margins.left + margins.right,
//             height: chartHeight + margins.top + margins.bottom,
//         })
//         .append('g')
//             .attr('transform', makeTranslate(margins.left, margins.top));

//     var overlay = chartElement.append('rect')
//         .attr({
//             width: chartWidth,
//             height: chartHeight,
//             fill: 'transparent',
//         });

//     var colorList = colorArray(LABELS, MULTICOLORS);
//     var colorScale = d3.scale.ordinal()
//         .range(colorList);

//     var radius = chartWidth / 2;

//     var arc = d3.svg.arc()
//         .outerRadius(radius)
//         .innerRadius(0);

//     var pie = d3.layout.pie()
//         .sort(null)
//         .value(function (d) {
//             return d.amt;
//         });

//     var g = chartElement.selectAll('.arc')
//         .data(pie(DATA))
//         .enter().append('g')
//             .attr('class', 'arc')
//             .attr('transform', makeTranslate(radius, radius));

//     g.append('path')
//         .attr('d', arc)
//         .style('fill', function (d, i) {
//             return colorScale(i);
//         });

//     var text = g.append('text')
//         .attr('transform', function (d) {
//             return 'translate(' + arc.centroid(d) + ')';
//         })
//         .each(function (d) {
//             // Finds "\n" in text and splits it into tspans
//             var words = d.data.label.replace(/\\n/g, '\n').split('\n');

//             for (var i = 0; i < words.length; i++) {
//                 var tspan = d3.select(this).append('tspan').text(words[i]);
//                 if (i > 0) {
//                     tspan.attr({
//                         x: 0,
//                         dy: '1em',
//                     });
//                 }
//             }
//         });

//     text.append('tspan')
//         .attr('class', 'value')
//         .text(function (d) {
//             return formattedNumber(
//                 d.data.amt,
//                 LABELS.valuePrefix,
//                 LABELS.valueSuffix,
//                 LABELS.maxDecimalPlaces
//             );
//         })
//         .attr({
//             x: 0,
//             dy: '1.5em',
//         });

// };

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
