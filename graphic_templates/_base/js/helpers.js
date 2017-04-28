/*
 * Basic Javascript helpers used in analytics.js and graphics code.
 */

var PTYCOLORS = {
    ptyalp: '#C93636', ptylab: '#C93636',
    ptylib: '#006DBD', ptylnp: '#006DBD',
    ptynat: '#008761',
    ptygrn: '#7AAC00',
    ptyoth: '#666666',
};

var HIGHLIGHTCOLORS = {
    active: '#478CCC',
    inactive: '#CCCCCC',
};

var MULTICOLORS = [
    '#1F79CD', '#FF7C0A', '#00B3A7', '#D662B1', '#71A12D', '#926CB5', '#F55446',
];

var MONOCHROMECOLORS = [
    '#1B79CC', '#47A6FF', '#136C9C', '#8796A1', '#2B4E78', '#5686B0', '#5E6F7A',
];

var SINGLECOLORS = [
    '#478CCC',
];

var COLORS = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

/*
 * Convert arbitrary strings to valid css classes.
 * via: https://gist.github.com/mathewbyrne/1280286
 *
 * NOTE: This implementation must be consistent with the Python classify
 * function defined in base_filters.py.
 */
var classify = function(str) {
    return str.toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

/*
 * Convert key/value pairs to a style string.
 */
var formatStyle = function(props) {
    var s = '';

    for (var key in props) {
        s += key + ': ' + props[key].toString() + '; ';
    }

    return s;
}

/*
 * Create a SVG tansform for a given translation.
 */
var makeTranslate = function(x, y) {
    var transform = d3.transform();

    transform.translate[0] = x;
    transform.translate[1] = y;

    return transform.toString();
}

/*
 * Parse a url parameter by name.
 * via: http://stackoverflow.com/a/901144
 */
var getParameterByName = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/*
 * Returns array of colors to use in the chart.
 */
var colorArray = function (config, defaultColorArr) {
    var colorArr = defaultColorArr;

    if (config.colors && (!config.theme || config.theme == 'custom')) {
        // use "color" content
        colorArr = config.colors.split(/\s*,\s*/);
    } else if (config.theme) {
        // use predefined color "theme"
        if (config.theme == 'monochrome') {
            colorArr = MONOCHROMECOLORS;
        } else if (config.theme == 'multicolor') {
            colorArr = MULTICOLORS;
        } else if (config.theme == 'single') {
            colorArr = SINGLECOLORS;
        } else if (config.theme == 'highlight') {
            colorArr = [HIGHLIGHTCOLORS.inactive];
        }
    }

    // replace political party color keywords with real hex colors
    for (var i = 0; i < colorArr.length; ++i) {
        var color = colorArr[i];
        if (color in PTYCOLORS) {
            colorArr[i] = PTYCOLORS[color];
        }
    }

    return colorArr;
};

/*
 * Takes a number and returns a formatted string that includes the correct
 * number of decimals, commas as thousand seperators, and suffix / prefix.
 */
var formattedNumber = function (num, prefix, suffix, maxDecimalPlaces) {
    num = parseFloat(num); // convert to float (in case it is passed in as a string )
    maxDecimalPlaces = parseInt(maxDecimalPlaces || 10, 10); // get number of decimal places to show
    var numString = num.toFixed(maxDecimalPlaces); // reduce decimal places
    num = parseFloat(numString); // convert back to float again (this drops any trailing zeros)
    numString = d3.format(',')(num); // d3 formatter that adds the commas
    numString = (prefix || '') + numString; // add any set prefix (e.g. $)
    numString = numString + (suffix || ''); // add any set suffix (e.g. %)
    return numString;
};

/*
 * Determine the aspect ratio from a string with some fallbacks
 * If fallback is a number it will use that for all breakpoints
 * Otherwise fallback can be an object containing "base" and "mobile" properties
 */
var getAspectRatio = function (ratioStr, fallback) {
    if (ratioStr) {
        var ratioArr = /^(\d+)x(\d+)$/.exec(ratioStr);
        if (ratioArr) {
            return ratioArr[1] / ratioArr[2];
        }
    }

    if (typeof fallback === 'number') {
        return fallback;
    }

    var key = 'base';
    if (typeof isMobile !== 'undefined' && isMobile) {
        key = 'mobile';
    }

    var defaultFallbacks = {
        base: 16 / 9,
        mobile: 4 / 3,
    };

    if (fallback) {
        return fallback[key] || defaultFallbacks[key];
    }

    return defaultFallbacks[key];

};

var colorFormula = function (val) {
    val = val / 255;
    if (val <= 0.03928) {
        return val / 12.92;
    } else {
        return Math.pow(((val + 0.055) / 1.055), 2.4);
    }
};

var relativeLuminance = function (rgb) {
    var r = colorFormula(rgb.r);
    var g = colorFormula(rgb.g);
    var b = colorFormula(rgb.b);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/*
 * Takes a foreground color and optional background color (defaults to white)
 * and returns a foreground color that is WCAG AA accessible. It tests the
 * contrast and darkens / brightens the foreground color until it is compliant.
 * Using color contrast logic from https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
var getAccessibleColor = function (foreground, background) {
    background = background || '#fff';

    var AA_CONTRAST_RATIO_THRESHOLD = 4.53;
    var isDarkTextOnLightBackground;
    var adjustedForeground;

    var testContrastRatio = function (foreground, background) {
        var fl = relativeLuminance(d3.rgb(foreground));
        var bl = relativeLuminance(d3.rgb(background));

        isDarkTextOnLightBackground = bl > fl;

        var l1 = isDarkTextOnLightBackground ? bl : fl;
        var l2 = isDarkTextOnLightBackground ? fl : bl;

        var contrastRatio = (l1 + 0.05) / (l2 + 0.05);

        return contrastRatio >= AA_CONTRAST_RATIO_THRESHOLD;
    };

    var getAdjustedColor = function (color) {
        var rgb = d3.rgb(color);
        rgb = isDarkTextOnLightBackground ? rgb.darker(0.1) : rgb.brighter(0.1);
        return rgb.toString();
    };

    while (!testContrastRatio(foreground, background)) {
        adjustedForeground = getAdjustedColor(foreground);
        if (adjustedForeground === foreground) {
            // can't get any darker/brighter so return false
            return false;
        }

        foreground = adjustedForeground;
    }

    return foreground;

};

var makePointsString = function (arrOfArrs) {
    return arrOfArrs.map(function (arr) {
        return arr.join(',');
    }).join(' ');
};

/*
 * Convert a url to a location object.
 */
var urlToLocation = function(url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
};

/*
 * format month abbrs in AP style
 */
var getAPMonth = function(dateObj) {
    var apMonths = [ 'Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.' ];
    var thisMonth = +fmtMonthNum(dateObj) - 1;
    return apMonths[thisMonth];
}

/*
 * Wrap a block of SVG text to a given width
 * adapted from http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = text.attr('dx') ? parseFloat(text.attr('dx')) : 0;
        var dy = text.attr('dy') ? parseFloat(text.attr('dy')) : 0;

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}

/*
 * Constructs a location object from a url
 */
var getLocation = function(href) {
    var l = document.createElement("a");
    l.href = href;
    return l;
};

/*
 * Checks if we are in production based on the url hostname
 * When embedded with pym it checks the parentUrl param
 * - If a url is given checks that
 * - If no url is given checks window.location.href
 */
var isProduction = function(u) {
    var result = true;
    var u = u || window.location.href;
    var re_embedded = /^.*parentUrl=(.*)$/;
    // Check if we are inside the dailygraphics local rig
    var m = u.match(re_embedded)
    if (m) {
        u = decodeURIComponent(m[1])
    }
    l = getLocation(u);
    if (l.hostname.startsWith("localhost") ||
        l.hostname.startsWith("stage-") ||
        l.hostname.startsWith("www-s1")) {
        result = false
    }
    return result;
}

/*
 * Polyfill for String.trim()
 */
if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}
