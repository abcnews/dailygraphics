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
 * Render a waffle chart.
 */
var renderWaffleChart = function () {
    /*
     * Setup
     */
    var margins = {
        top: parseInt(LABELS.marginTop || 0, 10),
        right: parseInt(LABELS.marginRight || 0, 10),
        bottom: parseInt(LABELS.marginBottom || 0, 10),
        left: parseInt(LABELS.marginLeft || 0, 10),
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

    var total = 0;
    var width,
        height,
        widthSquares = 10,
        heightSquares = 10,
        squareSize = chartWidth / widthSquares,
        squareValue = 0, // Set later
        gap = 1,
        theData = []; 


    var colorList = colorArray(LABELS, MULTICOLORS);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    //total population
    total = d3.sum(DATA, function(d) { return d.amt; });

    //value of a square
    squareValue = total / (widthSquares * heightSquares);


    //remap data
    DATA.forEach(function(d, i) 
    {
        d.amt = +d.amt;

        d.units = Math.floor(d.amt/squareValue);
        theData = theData.concat(
            Array(d.units+1).join(1).split('').map(function()
            {
                return {  squareValue:squareValue,                    
                        units: d.units,
                        amt: d.amt,
                        groupIndex: i};
            })
            );
    });

    chartElement.selectAll('rect')
        .data(theData)
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
            col = i%heightSquares;
            var x = (col * (squareSize - gap)) + (col * gap); 
            return x;
        })
        .attr("y", function(d, i)
            {
            //group n squares for column
            row = Math.floor(i/heightSquares);
            return (row * (squareSize - gap)) + (row*gap);
            })
        .append("title")
            .text(function (d,i) 
            {
                return "Label: " + DATA[d.groupIndex].label + " | " +  d.amt + " , " + d.units + "%"
            });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
