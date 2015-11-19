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
var numFormat = d3.format(",");

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        graphicConfig = GRAPHIC_CONFIG;
        
        if (graphicConfig.timeFormatLarge) {
            fmtYearFull = d3.time.format(graphicConfig.timeFormatLarge);
        }

        if (graphicConfig.timeFormatSmall) {
            fmtYearAbbrev = d3.time.format(graphicConfig.timeFormatSmall);
        }

        loadLocalData(GRAPHIC_DATA);
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
        var date;

        if (graphicConfig.parseDateFormat) {
            date = d3.time.format(graphicConfig.parseDateFormat).parse(d['date']);
        } else {
            date = d3.time.format('%d/%m/%y').parse(d['date']);
            if (!date) {
                date = d3.time.format('%d/%m/%Y').parse(d['date']);
            }   
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
        right: 50,
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
        margins['right'] = 45;
    }    

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
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

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

    if (graphicData[0]['date']) {
        xFormat = function(d, i) {
            if (isMobile) {
                return fmtYearAbbrev(d);
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


    var colorList = colorArray(graphicConfig, monochromeColors);
    var colorScale = d3.scale.ordinal()
        .domain([0, colorList.length])
        .range(colorList);

    if (graphicConfig.xLabel) margins.bottom += 20;
    if (graphicConfig.yLabel) margins.top += 20;

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    var overlay = chartElement.append('rect')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .attr('fill', 'transparent');

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
            return (graphicConfig.prefixY || '') + numFormat(d) + (graphicConfig.suffixY || '');
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

    var highlighted = graphicConfig.highlighted ? graphicConfig.highlighted.split(/\s*,\s*/) : [];
    var lines = chartElement.append('g')
        .attr('class', 'lines visible-lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                if (highlighted.indexOf(d.key) !== -1) {
                    return highlightColor;
                }

                return colorScale(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

    if (graphicConfig.theme == "highlight") {
        var shadowLines = chartElement.append('g')
            .attr('class', 'lines shadow-lines')
            .selectAll('path')
            .data(d3.entries(formattedData))
            .enter()
            .append('path')
                .attr('class', function(d, i) {
                    return 'line line-' + i + ' ' + classify(d['key']);
                })
                .attr('stroke', function(d) {
                    return "transparent";
                })
                .attr('d', function(d) {
                    return line(d['value']);
                })
                .attr('data-index', function (d, i) { return i; })
                .style('stroke-width', '20px');
    }

    function labelXFunc (d, i) {
        var last = d['value'][d['value'].length - 1];

        return xScale(last[dateColumn] || last['x']) + 5;
    }

    var labels = chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formattedData))
        .enter().append('text')
            .attr('class', function (d, i) {
                return 'label-group label-' + i;
            })
            .attr('x', labelXFunc)
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                return yScale(last[valueColumn]) + 3;
            });

    labels
        .append("tspan")
            .attr('dy', '-1em')
            .attr('x', labelXFunc)
            .attr('class', 'text-label')
            .text(function(d) {
                return d.key;
            });
    labels
        .append("tspan")
            .attr('dy', '1.2em')
            .attr('x', labelXFunc)
            .text(function (d) {
                var last = d['value'][d['value'].length - 1];
                var value = last[valueColumn];

                var label = numFormat(last[valueColumn]);

                return label;
            });

    if (graphicConfig.xLabel) {
        var t = chartElement.append("text")
            .text(graphicConfig.xLabel)
            .attr("y", chartHeight + margins.bottom - 5)
            .attr("class", "axis-label");
        
        t.attr("x", (chartWidth - t.node().getComputedTextLength()) / 2)
    }

    if (graphicConfig.yLabel) {
        var t = chartElement.append("text")
            .text(graphicConfig.yLabel)
            .attr("x", -20)
            .attr("y", -15)
            .attr("class", "axis-label");
    }

    if (graphicConfig.theme == "highlight") {
        shadowLines.on("mouseover", function () {
            var index = this.getAttribute('data-index');
            chartElement.select(".visible-lines .line-" + index).attr('stroke', highlightColor);
            chartElement.selectAll(".label-" + index + " tspan").attr('fill', highlightColor);
        });

        shadowLines.on("mouseout", function () {
            var index = this.getAttribute('data-index');
            chartElement.select(".visible-lines .line-" + index).attr('stroke', highlightColors[0]);
            chartElement.selectAll(".label-" + index + " tspan").attr('fill', null);
        });
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
