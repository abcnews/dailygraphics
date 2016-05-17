// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicConfig = null;
var numFormat = d3.format(",");

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        graphicConfig = GRAPHIC_CONFIG;
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['amt'] = +d['amt'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderPieChart({
        container: '#graphic',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a pie chart.
 */
var renderPieChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var margins = {
        top: parseInt(graphicConfig.marginTop || 0, 10),
        right: parseInt(graphicConfig.marginRight || 15, 10),
        bottom: parseInt(graphicConfig.marginBottom || 20, 10),
        left: parseInt(graphicConfig.marginLeft || 15, 10),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins['left'] - margins['right'];
    var chartHeight = chartWidth;

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    var overlay = chartElement.append('rect')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .attr('fill', 'transparent');

    var colorList = colorArray(graphicConfig, multiColors);
    var colorScale = d3.scale.ordinal()
        .range(colorList);

    var radius = chartWidth / 2 - 10;
    var arc = d3.svg.arc()
        .outerRadius(radius)
        .innerRadius(0);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { return d[valueColumn]; });

    var g = chartElement.selectAll(".arc")
        .data(pie(DATA))
        .enter().append("g")
        .attr("class", "arc")
        .attr("transform", "translate("+(chartWidth/2)+","+(chartHeight/2)+")");

    g.append("path")
        .attr("d", arc)
        .style("fill", function(d, i) { return colorScale(i); });

    if (graphicConfig.showLabels) {
        g.append("text")
            .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
            .style("text-anchor", "middle")
            .attr("fill", "white")
            .text(function(d) {
                return d.data[labelColumn];
            });
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
