// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var graphicConfig = null;

// D3 formatters
var numFormat = d3.format(",");

var bisectDate = d3.bisector(function(d) { return d.date; }).left;

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        graphicConfig = GRAPHIC_CONFIG;
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
        if (parts[0] && parts[1]) {
            aspectWidth = parseInt(parts[0], 10);
            aspectHeight = parseInt(parts[1], 10);
        }
    }

    var margins = {
        top: parseInt(graphicConfig.marginTop || 5, 10),
        right: parseInt(graphicConfig.marginRight || 50, 10),
        bottom: parseInt(graphicConfig.marginBottom || 35, 10),
        left: parseInt(graphicConfig.marginLeft || 30, 10)
    };

    var ticksX = parseInt(graphicConfig.ticksX || 10, 10);
    var ticksY = parseInt(graphicConfig.ticksY || 10, 10);
    var roundTicksFactor = parseInt(graphicConfig.roundTicksFactor || 5, 10);

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins.right = margins.right * 0.9;
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
    var flatData = [];

    /*
     * Restructure tabular data for easier charting.
     */
    var i = 0;
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

        flatData = flatData.concat(graphicData.map(function(d) {
            return {
                'x': d[dateColumn] || d['x'],
                'amt': +d[column],
                'i': i,
                'key': column
            };
        }));

        i++;
    }

    /*
     * Create D3 scale objects.
     */

    var minY = graphicConfig.minValue ? parseFloat(graphicConfig.minValue, 10) : d3.min(d3.entries(formattedData), function(c) {
        return d3.min(c['value'], function(v) {
            var n = v[valueColumn];
            return Math.floor(n / roundTicksFactor) * roundTicksFactor;
        });
    });

    var maxY = graphicConfig.maxValue ? parseFloat(graphicConfig.maxValue, 10) : d3.max(d3.entries(formattedData), function(c) {
        return d3.max(c['value'], function(v) {
            var n = v[valueColumn];
            return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
        });
    });

    var xFormat;
    var xScale;

    if (graphicData[0]['date']) {

        if (!isMobile && graphicConfig.timeFormatLarge) {
            xFormat = d3.time.format(graphicConfig.timeFormatLarge);
        } else if (isMobile && graphicConfig.timeFormatSmall) {
            xFormat = d3.time.format(graphicConfig.timeFormatSmall);
        } else {
            xFormat = d3.time.format.multi([
                [".%L", function(d) { return d.getMilliseconds(); }],
                [":%S", function(d) { return d.getSeconds(); }],
                ["%-I:%M", function(d) { return d.getMinutes(); }],
                ["%-I\n%p", function(d) { return d.getHours(); }],
                ["%a\n%-d", function(d) { return d.getDay() && d.getDate() != 1; }],
                ["%b\n%-d", function(d) { return d.getDate() != 1; }],
                ["%B", function(d) { return d.getMonth(); }],
                ["%Y", function() { return true; }]
            ]);
        }

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

        dateColumn = 'x';
    }

    var yScale = d3.scale.linear()
        .domain([ minY, maxY ])
        .range([ chartHeight, 0 ]);


    var colorList = colorArray(graphicConfig, monochromeColors);
    var colorScale = d3.scale.ordinal()
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
            .attr('stroke', function(d, i) {
                if (highlighted.indexOf(d.key) !== -1) {
                    return highlightColor;
                }

                return colorScale(i);
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

    var tooltipWrapper = chartWrapper.append("div").attr("class", "tooltip-wrapper");

    if (graphicConfig.circleMarker !== 'off') {
        chartElement.append('g')
            .selectAll('circle')
            .data(flatData)
            .enter().append('circle')
            .attr("class", "point")
            .attr('r', 1.5)
            .attr("cx", function (d) {
                return xScale(d.x);
            })
            .attr("cy", function (d) {
                return yScale(d.amt);
            })
            .attr("fill", function (d, i) {
                return colorScale(d.i);
            })
            .attr("stroke", function (d, i) {
                return colorScale(d.i);
            });
    }

    if (graphicConfig.tooltip !== 'off') {
    chartElement.on("mousemove", function (e) {
        var pos = d3.mouse(overlay.node());
        var domain = xScale.domain();
        var range = xScale.range();
        var xVal, obj;

        if (dateColumn === 'date') {
            var x = xScale.invert(pos[0]);
            var index = bisectDate(graphicData, x, 1);
            obj = _.clone(graphicData[index - 1]);
            var obj2 = _.clone(graphicData[index]);

            // choose the closest object to the mouse
            if (index < graphicData.length - 1 && x - obj.date > obj2.date - x) {
                obj = obj2;
            }

            xVal = obj.date;
            delete obj.date;
        } else {
            var i = d3.bisect(range, pos[0]);
            var left = domain[i - 1];
            var right = domain[i];

            // var obj = getObjectFromArray(graphicData, dateColumn, left);
            obj = _.clone(_.findWhere(graphicData, {x: left}));
            xVal = left;

            if (i < domain.length - 1 && pos[0] - xScale(left) > xScale(right) - pos[0]) {
                obj = _.clone(_.findWhere(graphicData, {x: right}));
                xVal = right;
            }

            delete obj.x;
        }

        var couples = [];
        var visited = {};
        for (var key in obj) {
            var y1 = yScale(obj[key]);

            for (var key2 in obj) {
                if (key === key2) continue;
                if (visited[key + key2]) continue;
                if (visited[key2 + key]) continue;

                var y2 = yScale(obj[key2]);

                // must have a gap of 40 pixels else be merged
                var diff = y1 - y2;
                if (Math.abs(diff) < 40) {
                    // merge
                    var o = {};
                    o[key] = y1;
                    o[key2] = y2;
                    couples.push(o);

                    visited[key + key2] = true;
                    visited[key2 + key] = true;
                }
            }
        }

        var buckets = [];
        visited = {};
        for (var i = 0; i < couples.length; ++i) {
            var keys = Object.keys(couples[i]);
            var bucket;

            for (var j = 0; j < buckets.length; ++j) {
                var b = buckets[j];
                if (b[keys[0]] || b[keys[1]]) {
                    bucket = b;
                }
            }

            if (!bucket) {
                bucket = {};
                bucket[keys[0]] = couples[i][keys[0]];
                bucket[keys[1]] = couples[i][keys[1]];
                buckets.push(bucket);
            }

            bucket[keys[0]] = couples[i][keys[0]];
            bucket[keys[1]] = couples[i][keys[1]];
            visited[keys[0]] = true;
            visited[keys[1]] = true;
        }

        for (var k in obj) {
            if (!visited[k]) {
                var b = {};
                b[k] = obj[k];
                buckets.push(b);
            }
        }

        var transformed = [];
        for (var i = 0; i < buckets.length; ++i) {
            var bucket = buckets[i];
            var keys = Object.keys(bucket);
            keys.sort(function (a, b) {
                return bucket[a] - bucket[b];
            });
            transformed.push(keys);
        }

        var s = tooltipWrapper
            .selectAll("div.tooltip")
            .data(transformed)
            .html(function (d) {
                var h = "";
                for (var i = 0; i < d.length; ++i) {
                    h += "<div>"+d[i]+" <strong>"+obj[d[i]]+"</strong></div>"
                }
                return h;
            })
            .style("left", function (d) {
                var offset = this.clientWidth / 2;
                return (xScale(xVal) - offset + margins.left) + "px";
            })
            .style("top", function (d) {
                return (yScale(obj[d[0]]) - this.clientHeight / 2) + "px";
            });

        s.enter()
            .append("div")
            .attr("class", "tooltip")
            .html(function (d) {
                
                var h = "";
                for (var i = 0; i < d.length; ++i) {
                    h += "<div>"+d[i]+" <strong>"+obj[d[i]]+"</strong></div>"
                }
                return h;
            })
            .style("left", function (d) {
                var offset = this.clientWidth / 2;
                return (xScale(xVal) - offset + margins.left) + "px";
            })
            .style("top", function (d) {
                return (yScale(obj[d[0]]) - this.clientHeight / 2) + "px";
            })
            
        
        s.exit().remove();
    });
    }

    // Finds "\n" in text and splits it into tspans
    var insertLinebreaks = function () {
        var el = d3.select(this);
        var words = el.text().replace('\\n', '\n').split('\n');
        el.text('');

        for (var i = 0; i < words.length; i++) {
            var tspan = el.append('tspan').text(words[i]);
            if (i > 0) {
                tspan.attr('x', 0).attr('dy', '1em');
            }
        }
    };

    chartWrapper.selectAll('g.x.axis g text').each(insertLinebreaks);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
