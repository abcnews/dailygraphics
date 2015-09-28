// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var graphicConfig = null;

// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%b %Y');

var defaultColors = [ COLORS['blue3'], COLORS['red3'], COLORS['yellow3'], COLORS['orange3'], COLORS['teal3'] ];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        graphicConfig = GRAPHIC_CONFIG;
        loadLocalData(GRAPHIC_DATA);
        
        if (graphicConfig.timeFormatLarge) {
            fmtYearFull = d3.time.format(graphicConfig.timeFormatLarge);
        }

        if (graphicConfig.timeFormatSmall) {
            fmtYearAbbrev = d3.time.format(graphicConfig.timeFormatSmall);
        }
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    if (graphicData[0].date) {
        formatData();
    }

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = data;

        if (graphicData[0].date) {
            formatData();
        }

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d) {
        var date = d3.time.format('%d/%m/%y').parse(d['date']);
        if (!date) {
            date = d3.time.format('%d/%m/%Y').parse(d['date']);
        }

        d['date'] = date;

        for (var key in d) {
            if (key != 'date') {
                d[key] = +d[key];
            }
        }
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
    renderLineChart({
        container: '#graphic',
        width: containerWidth,
        data: graphicData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;
    if ('ratio' in graphicConfig) {
        var parts = graphicConfig.ratio.split("x");
        aspectWidth = parseInt(parts[0], 10);
        aspectHeight = parseInt(parts[1], 10);
    }

    var margins = {
        top: 5,
        right: 80,
        bottom: 20,
        left: 30
    };

    if (graphicConfig.marginTop) {
        margins.top = parseInt(graphicConfig.marginTop, 10);
    }

    if (graphicConfig.marginRight) {
        margins.right = parseInt(graphicConfig.marginRight, 10);
    }

    if (graphicConfig.marginBottom) {
        margins.bottom = parseInt(graphicConfig.marginBottom, 10);
    }

    if (graphicConfig.marginLeft) {
        margins.left = parseInt(graphicConfig.marginLeft, 10);
    }

    var ticksX = parseInt(graphicConfig.ticksX || 10, 10);
    var ticksY = parseInt(graphicConfig.ticksY || 10, 10);
    var roundTicksFactor = parseInt(graphicConfig.roundTicksFactor || 5, 10);

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var formattedData = {};

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in graphicData[0]) {
        if (column == dateColumn || column == 'x') {
            continue;
        }

        formattedData[column] = graphicData.map(function(d) {
            return {
                'x': d[dateColumn] || d['x'],
                'amt': +d[column]
            };
        });
    }

    /*
     * Create D3 scale objects.
     */

    var minY = 'minValue' in graphicConfig ? parseFloat(graphicConfig.minValue, 10) : d3.min(d3.entries(formattedData), function(c) {
        return d3.min(c['value'], function(v) {
            var n = v[valueColumn];
            return Math.floor(n / roundTicksFactor) * roundTicksFactor;
        });
    });

    var maxY = 'maxValue' in graphicConfig ? parseFloat(graphicConfig.maxValue, 10) : d3.max(d3.entries(formattedData), function(c) {
        return d3.max(c['value'], function(v) {
            var n = v[valueColumn];
            return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
        });
    });

    var xFormat;
    var xScale;

    if (formattedData['date']) {
        xFormat = function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        };

        xScale = d3.time.scale()
        .domain(d3.extent(config['data'], function(d) {
            return d[dateColumn];
        }))
        .range([ 0, chartWidth ])
    } else {
        xFormat = function (d, i) {
            return d;
        };

        xScale = d3.scale.ordinal()
        .rangePoints([0, chartWidth])
        .domain(graphicData.map(function (d) { 
            return d['x']; 
        }))
        // .range([0, chartWidth]);
    }

    var yScale = d3.scale.linear()
        .domain([ minY, maxY ])
        .range([ chartHeight, 0 ]);


    var colorList = defaultColors;
    if ('colors' in graphicConfig) {
        colorList = graphicConfig.colors.split(/\s*,\s*/);
    }

    var colorScale = d3.scale.ordinal()
        .domain([0, colorList.length])
        .range(colorList);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(d3.entries(formattedData))
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['key']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['key']);
        });

    legend.append('label')
        .text(function(d) {
            return d['key'];
        });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(xFormat);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function (d) {
            return (graphicConfig.prefixY || '') + d + (graphicConfig.suffixY || '');
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate(graphicConfig.interpolate || 'monotone')
        .x(function(d) {
            return xScale(d[dateColumn] || d['x']);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formattedData))
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['value'][d['value'].length - 1];

                return xScale(last[dateColumn] || last['x']) + 5;
            })
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .text(function(d) {
                var last = d['value'][d['value'].length - 1];
                var value = last[valueColumn];

                var label = last[valueColumn].toFixed(1);

                if (!isMobile) {
                    label = d['key'] + ': ' + label;
                }

                return label;
            });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
