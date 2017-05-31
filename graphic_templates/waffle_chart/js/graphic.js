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
    var labelWidth = parseInt(LABELS.labelWidth || 85);
    var labelMargin = parseInt(LABELS.labelMargin || 6);

    var margins = {
        top: parseInt(LABELS.marginTop || 0),
        right: parseInt(LABELS.marginRight || 0),
        bottom: parseInt(LABELS.marginBottom || 0),
        left: parseInt(LABELS.marginLeft || (labelWidth + labelMargin)),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#waffle-chart')
        .style('max-width', '460px')
        .style('margin', 'auto');
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphics-wrapper')

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = (innerWidth - margins.left - margins.right >= parseInt(LABELS.maxWidth))
        ? parseInt(LABELS.maxWidth) : innerWidth - margins.left - margins.right;
    var chartHeight = chartWidth;

    var chartSvg = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        

    var chartElement = chartSvg.append('g')
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
                .append("title")
                    .text(function (d, i) {
                        return "Label: " + DATA[d.groupIndex].label + " | " +  d.amt + " , " + d.units + "%"
                    });
            // Render top layer of squares
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
                .append("title")
                    .text(function (d, i) {
                        return "Label: " + DATA[d.groupIndex].label + " | " +  d.amt + ", ~" + d.units + "%"
                    });
        });


    /*
     * Output the legend
     */

    // Just an SVG text test that probably won't work

    // squares.append('text')
    //     .attr('alignment-baseline', 'hanging')
    //     .attr("x", function(d, i) {
    //         col = i%widthSquares;
    //         var x = (col * (squareSize - gap)) + (col * gap); 
    //         return -35;
    //     })
    //     .attr('y', function(d, i) { 
    //         row = Math.floor(i/widthSquares);
    //         return (row * (squareSize - gap)) + (row*gap);
    //     })
    //     .text("hello");


    // Create a legend div wrapper
    var chartLegend = chartWrapper.append("ul")
        .attr('class', 'labels')
        .style({
            width: labelWidth + 'px',
            top: '0px',
            left: 0,
        });

    percentTotal = 0;

    // Append a li per data
    chartLegend.selectAll("li")
    .data(DATA)
    .enter()
    .append("li")
    // Control labels positioning according to data
    .style('top', function(d, i) {
            if (percentTotal < 10) {
                percentTotal += d.units;
                return "0px";
            }
            if (percentTotal >= 10 && percentTotal < 20) {
                percentTotal += d.units;
                return squareSize + "px";
            }
            if (percentTotal >= 20 && percentTotal < 30) {
                percentTotal += d.units;
                return (squareSize * 2) + "px";
            }
            if (percentTotal >= 30 && percentTotal < 40) {
                percentTotal += d.units;
                return (squareSize * 3) + "px";
            }
            if (percentTotal >= 40 && percentTotal < 50) {
                percentTotal += d.units;
                return (squareSize * 4) + "px";
            }
            if (percentTotal >= 50 && percentTotal < 60) {
                percentTotal += d.units;
                return (squareSize * 5) + "px";
            }
            if (percentTotal >= 60 && percentTotal < 70) {
                percentTotal += d.units;
                return (squareSize * 6) + "px";
            }
            if (percentTotal >= 70 && percentTotal < 80) {
                percentTotal += d.units;
                return (squareSize * 7) + "px";
            }
            if (percentTotal >= 80 && percentTotal < 90) {
                percentTotal += d.units;
                return (squareSize * 8) + "px";
            }
            if (percentTotal >= 90) {
                percentTotal += d.units;
                return (squareSize * 9) + "px";
            }
        })
        .style("color", function(d, i) { 
            return colorScale(i);
        })
        .style({
            width: labelWidth + 'px',
            height: squareSize + 'px',
            left: 0,
            position: "absolute"
        })
        .append("span")
        
        .html(function(d, i) {
            return d.label + " " + "<strong>" + d.units + "%</strong>";
        })
        .attr("title", function (d, i) {
                        return d.label + " " + d.amt + ", ~" + d.units + "%"
                    });
};


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;