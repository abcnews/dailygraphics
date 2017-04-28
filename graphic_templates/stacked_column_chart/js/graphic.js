// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values', 'total' ];

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

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        var y0 = 0;

        d.values = [];
        d.total = 0;

        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                continue;
            }

            d[key] = +d[key];

            var y1 = y0 + d[key];
            d.total += d[key];

            d.values.push({
                name: key,
                y0: y0,
                y1: y1,
                val: d[key],
            });

            y0 = y1;
        }
    });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderStackedColumnChart({
        container: '#stacked-column-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
};

/*
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function () {
    /*
     * Setup chart container.
     */
    var aspectRatio = getAspectRatio(LABELS.ratio);
    var valueGap = parseInt(LABELS.valueGap || 6, 10);

    var margins = {
        top: parseInt(LABELS.marginTop || 5, 10),
        right: parseInt(LABELS.marginRight || 0, 10),
        bottom: parseInt(LABELS.marginBottom || 30, 10),
        left: parseInt(LABELS.marginLeft || 0, 10),
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-column-chart');
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    // Calculate actual chart dimensions
    var innerWidth = chartWrapper.node().getBoundingClientRect().width;
    var chartWidth = innerWidth - margins.left - margins.right;
    var chartHeight = Math.ceil(innerWidth / aspectRatio) - margins.top - margins.bottom;

    var chartElement = chartWrapper.append('svg')
        .attr({
            width: chartWidth + margins.left + margins.right,
            height: chartHeight + margins.top + margins.bottom,
        })
        .append('g')
            .attr('transform', makeTranslate(margins.left, margins.top));

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(DATA.map(function (d) { return d.label; }))
        .rangeRoundBands([0, chartWidth], 0.1);

    var minY = d3.min(DATA, function (d) {
        return d.total;
    });

    if (minY > 0) {
        minY = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        .range([ COLORS['teal2'], COLORS['teal5'] ]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
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
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickSize(0)
        .tickPadding(10);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis)
        .select('path').remove();

    var colorScaleDomain = d3.keys(DATA[0]).filter(function (d) {
        return d != 'label' && d != 'values' && d != 'total'; // ??
    });

    var colorList = colorArray(LABELS, MONOCHROMECOLORS);
    var colorScale = d3.scale.ordinal()
        .domain(colorScaleDomain)
        .range(colorList);

    var accessibleColorScale = d3.scale.ordinal()
        .domain(colorScaleDomain)
        .range(colorList.map(function (color) {
            return getAccessibleColor(color);
        }));

    var accessibleColorScaleInvert = d3.scale.ordinal()
        .domain(colorScaleDomain)
        .range(colorList.map(function (color) {
            return getAccessibleColor(color, '#000');
        }));

    DATA.forEach(function (d) {
        d.values.forEach(function (v) {
            if (relativeLuminance(d3.rgb(colorScale(v.name))) < 0.5) {
                v.invert = true;
                v.accessibleColor = accessibleColorScale(v.name);
            } else {
                v.accessibleColor = accessibleColorScaleInvert(v.name);
            }
        });
    });

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(colorScaleDomain)
        .enter().append('li')
            .attr('class', function (d, i) {
                return 'key-item key-' + i + ' ' + classify(d);
            });

    legend.append('b')
        .style('background-color', function (d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function (d) {
            return d;
        })
        .style('color', function (d) {
            return accessibleColorScale(d);
        });

    /*
     * Render bars to chart.
     */
    var bars = chartElement.selectAll('.bars')
        .data(DATA)
        .enter()
        .append('g')
            .attr('class', 'bar')
            .attr('transform', function (d) {
                return makeTranslate(xScale(d.label), 0);
            });

    bars.selectAll('rect')
        .data(function (d) {
            return d.values;
        })
        .enter()
        .append('rect')
            .attr('class', function (d) {
                return classify(d.name);
            })
            .attr({
                y: function (d) {
                    if (d.y1 < d.y0) {
                        return yScale(d.y0);
                    }

                    return yScale(d.y1);
                },

                width: xScale.rangeBand(),

                height: function (d) {
                    return Math.abs(yScale(d.y0) - yScale(d.y1));
                },

                fill: function (d) {
                    return d.accessibleColor;
                },
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    /*
     * Render values to chart.
     */
    bars.selectAll('text')
        .data(function (d) {
            return d.values;
        })
        .enter()
        .append('text')
            .text(function (d) {
                return formattedNumber(
                    d.val,
                    LABELS.valuePrefix,
                    LABELS.valueSuffix,
                    LABELS.maxDecimalPlaces
                );
            })
            .attr('class', function (d) {
                if (d.invert) {
                    return classify(d.name) + ' invert';
                }

                return classify(d.name);
            })
            .attr({
                x: function (d) {
                    return xScale.rangeBand() / 2;
                },

                y: function (d) {
                    var thisElem = d3.select(this);
                    var textHeight = thisElem.node().getBBox().height;
                    var ys0 = yScale(d.y0);
                    var ys1 = yScale(d.y1);
                    var barHeight = Math.abs(ys0 - ys1);
                    var barCenter = ys1 + ((ys0 - ys1) / 2);
                    var isTextTooBig = textHeight + valueGap * 2 > barHeight;
                    thisElem.classed('hidden', isTextTooBig);
                    return barCenter + (textHeight / 2);
                },

            });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
