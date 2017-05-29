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

    // Render the chart
    renderWaffleChart();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a waffle chart.
 */
var renderWaffleChart = function () {
    /*
     * Setup
     */
    var margins = {
        top: parseInt(LABELS.marginTop || 0),
        right: parseInt(LABELS.marginRight || 0),
        bottom: parseInt(LABELS.marginBottom || 0),
        left: parseInt(LABELS.marginLeft || 0),
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
    var chartWidth = (innerWidth - margins.left - margins.right >= parseInt(LABELS.maxWidth))
        ? parseInt(LABELS.maxWidth) : innerWidth - margins.left - margins.right;
    var chartHeight = chartWidth;

    var chartElement = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        .append('g')
            .attr('transform', makeTranslate(margins.left, margins.top));

    var total = 0; // Init total number of squares

    var widthSquares = 10,
        heightSquares = 10,
        squareSize = chartHeight / heightSquares,
        squareValue = 0, // Set later
        gap = 1,
        squareData = []; // Data for individual squares


    var colorList = colorArray(LABELS, MULTICOLORS);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    // Total of all data
    total = d3.sum(DATA, function(d) { return d.amt; });

    // Value of a square
    squareValue = total / (heightSquares * widthSquares);

    // Remap data for individual squares
    DATA.forEach(function(d, i) {
        d.amt = +d.amt;

        d.units = Math.floor(d.amt/squareValue);
        squareData = squareData.concat(
            Array(d.units+1).join(1).split('').map(function()
            {
                return {
                    squareValue:squareValue,                 
                    units: d.units,
                    amt: d.amt,
                    groupIndex: i
                };
            })
        );
    });

    

    /*
     * Render the squares
     */
    chartElement.selectAll('rect')
        .data(squareData)
        .enter()
        .append('rect')
        .attr("width", squareSize - gap)
        .attr("height", squareSize - gap)
        .attr("fill", function(d)
        {
            return colorScale(d.groupIndex);
        })
        .attr("x", function(d, i)
        {
            col = i%widthSquares;
            var x = (col * (squareSize - gap)) + (col * gap); 
            return x;
        })
        .attr("y", function(d, i) {
            //group n squares for column
            row = Math.floor(i/widthSquares);
            return (row * (squareSize - gap)) + (row*gap);
        })
        .append("title")
            .text(function (d, i) {
                return "Label: " + DATA[d.groupIndex].label + " | " +  d.amt + " , " + d.units + "%"
            });

    /*
     * Output the legend
     */

    // Create a legend div wrapper
    var chartLegend = chartWrapper.append("div")  
        .attr('class', 'legend-wrapper');

    console.log(DATA);

    chartLegend.selectAll("div")
    .data(DATA)
    .enter()
    .append("div")
        .html(function(d, i) { return d.label })
        .style("color", function(d, i) { return colorScale(i)});


    // chartLegend.append("div")  
    //     .html("Category 1: 7% ")
    //     .style("color", "#1F79CD");


    // chartLegend.append("div")  
    //     .html("Category 2: 6% ")
    //     .style("color", "#FF7C0A");

};



/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;




// Unused code below here

        /* a square */
        // .append("svg")
        // .attr("width", "20")
        // .attr("height", "20")
        // .append("rect")
        //     .attr("width", "20")
        //     .attr("height", "20")
        //     .attr("fill", "blue");