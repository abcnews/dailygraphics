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

/*
 * Convert arbitrary strings to valid css classes.
 * via: https://gist.github.com/mathewbyrne/1280286
 *
 * NOTE: This implementation must be consistent with the Python classify
 * function defined in base_filters.py.
 */
var classify = function (str) {
    return str.toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

/*
 * Create a SVG tansform for a given translation.
 */
var makeTranslate = function (x, y) {
    var transform = d3.transform();

    transform.translate[0] = x;
    transform.translate[1] = y;

    return transform.toString();
};

/*
 * Parse a url parameter by name.
 * via: http://stackoverflow.com/a/901144
 */
var getParameterByName = function (name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

/*
 * Convert a url to a location object.
 */
var urlToLocation = function (url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
};

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
