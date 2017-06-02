// Global vars
var pymChild = null;
var isMobile = false;

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
    var labelWidth = parseInt(LABELS.labelWidth || 85);
    var labelMargin = parseInt(LABELS.labelMargin || 6);


    var margins = {
        top: parseInt(LABELS.marginTop || 0),
        right: parseInt(LABELS.marginRight || (labelWidth + labelMargin)),
        bottom: parseInt(LABELS.marginBottom || 0),
        left: parseInt(LABELS.marginLeft || 0),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#waffle-chart')
        .style('max-width', parseInt(LABELS.maxWidth) + 'px' || 420 + 'px')
        .style('margin', 'auto');
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

    var chartSvg = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        });
        

    var chartElement = chartSvg.append('g')
            .attr('transform', makeTranslate(margins.left, margins.top));

    var totalAmount = 0; // Init total number of squares

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
    totalAmount = d3.sum(DATA, function(d) { return d.amt; });

    // Value of a square
    squareValue = totalAmount / (heightSquares * widthSquares);
    
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


    // Create a transparent SVG to use as for patterns
    var svgPatterns = d3.select("#waffle-chart").append("svg")
        .attr('width', 0)
        .attr('height', 0)
        .style('position', 'absolute'); // so it doesn't affect flow

        svgDefs = svgPatterns.append('defs');

        svgDefs.append('pattern')
            .attr('id', 'diagonalHatchRight') // ID of pattern
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4)
        .append('path')
            .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2') // Draw // pattern
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            
        svgDefs.append('pattern')
            .attr('id', 'diagonalHatchLeft') // ID of pattern
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4)
        .append('path')
            .attr('d', 'M5,1 l-2,-2 M4,4 l-4,-4 M1,5 l-2,-2') // Draw \\ pattern
            .attr('stroke', 'white')
            .attr('stroke-width', 1);


    // Define the tooltip for squares
    var tooltip = d3.select("body")
        .append("div")
        .classed('tooltip', true)
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("the tooltip placeholder");


    /*
     * Render the squares
     */
    var squares = chartElement.selectAll('rect')
        .data(squareData)
        .enter()
        .call( function(selection) {
            // Render bottom layer of squares
            selection.append('rect')
                .attr("width", squareSize - gap)
                .attr("height", squareSize - gap)
                .attr("fill", function(d) {
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

            /* Render top layer of squares
            ----------------------------------------------------*/
            selection.append('rect')
                .attr("width", squareSize - gap)
                .attr("height", squareSize - gap)
                .attr("fill", function (d,i) {
                     switch (d.groupIndex % 4) {
                        case 0: return "rgba(255,255,255,0.0)"; // fully transparent
                        case 1: return "url(#diagonalHatchLeft)";
                        case 2: return "rgba(255,255,255,0.0)"; // fully transparent
                        case 3: return "url(#diagonalHatchRight)";
                    }
                })
                .attr("x", function(d, i) {
                    col = i%widthSquares;
                    var x = (col * (squareSize - gap)) + (col * gap); 
                    return x;
                })
                .attr("y", function(d, i) {
                    //group n squares for column
                    row = Math.floor(i/widthSquares);
                    return (row * (squareSize - gap)) + (row*gap);
                })
                .on("mouseover", function(d, i) {
                    return tooltip.style("visibility", "visible");
                })
                .on("click", function(d, i) { // for mobile
                    return tooltip.style("visibility", "visible");
                })
                .on("mousemove", function(d, i) {
                    tooltip.html('<div><strong>' + DATA[d.groupIndex].label + "</strong></div><div>"
                    +  d.amt + ", " + d.units + "%</div>");
                    return tooltip.style("top", (d3.event.pageY - 10)+"px").style("left",(d3.event.pageX + 14)+"px");
                })
                .on("mouseout", function(d, i) {
                    return tooltip.style("visibility", "hidden");
                });
        });


    /*
     * Output the legend
     */

    // Create a legend div wrapper
    var chartLegend = chartWrapper.append("ul")
        .attr('class', 'labels')
        .style({
            width: labelWidth + 'px',
            top: '0px',
            left: chartWidth + labelMargin + 'px',
            display: 'flex',
            'flex-direction': 'column',
            'justify-content': 'space-between',
            height: chartHeight + 'px',
            padding: (squareSize / 2) - 7 + 'px 0', // half square - half lineHeight
            'box-sizing': 'border-box'
        });

    // Append a li per data
    chartLegend.selectAll("li")
    .data(DATA)
    .enter()
    .append("li")
        .style('flex-grow', function (d) {
            return Math.floor((d.units - 1) / widthSquares);
        })
        .style("color", function(d, i) {
            return colorScale(i);
        })
        .style('position', 'relative')
        .style('display', 'flex')
        .style({
            'line-height': '1',
            'flex-direction': 'column',
            'justify-content': 'space-around',
        })
        .append("span")
            .style('text-align', 'left')
            .style('display', 'block')
            .html(function(d, i) {
                return d.label + " " + "<strong>" + d.units + "%</strong>";
            })
            .attr("title", function (d, i) {
                            return d.label + " " + d.amt + ", " + d.units + "%"
                        });

        // Output the total stats
        var chartTotal = chartWrapper.append("div")
            .classed('labels', true)
            .style('color', '#666')
            .text('Total data: ' + totalAmount);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;