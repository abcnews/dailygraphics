# Chart Builder

* [Chart configuration options](#chart-configuration-options)
  * [Common](#common-options)
  * [Line Chart](#line-chart)
  * [Bar Chart](#bar-chart)
  * [Grouped Bar Chart](#grouped-bar-chart)
  * [Column Chart](#column-chart)
  * [Pie Chart](#pie-chart)
* [Common issues](#common-issues)
* [Development](#development)

## Chart configuration options

### Common

#### headline
> Default: empty string

Heading that appears above the graph.

#### subhed
> Default: empty string

Text that appears above the graph.

#### footnote
> Default: empty string

Small text that appears below the graph under a heading of "Notes".

#### source
> Default: empty string

Small text that appears below the graph prefixed with "Source: ".

#### credit
> Default: empty string

Small text that appears below the graph prefixed with "Credit: ".

#### theme
> single, monochrome, multicolor, highlight.

Use one of the themes to render the chart. Each chart type has a different default theme.

- `single` - only one color, the ABC blue
- `monochrome` -  variations of ABC blue and grey
- `multicolor` - multiple colors designed for color blindness
- `highlight` - line, bar and column chart support the highlight theme that renders everything a dull grey and blue when hovered or "highlighted"
- `custom` - use the colors defined in the [colors](#colors) option

#### colors

Comma separated list of colors for each data set. These can be defined in a few different ways:

1. RGB hex values preceded with `#`. e.g. `#f00, #f12e41, #def78e` (see http://www.colorpicker.com/)
2. Color keywords. e.g. `red, blue, green, yellow` (see https://developer.mozilla.org/en/docs/Web/CSS/color_value for full list of available color keywords).
3. Special political party keywords to use ABC News standard party colors. e.g. `ptylab, ptylib, ptynat, ptygrn`

These different value types can be combined. e.g. `red, #abcdef, ptynat, #333`

#### card
> Default: `on`

By default the chart will be displayed in the ABC card container. Set to `off` to remove the card styling.

#### marginTop
> Default: `5`

Spacing at the top of the graphic in pixels.

#### marginRight
> Default: `80`

#### marginBottom
> Default: `20`

#### marginLeft
> Default: `30`

#### maxDecimalPlaces
> Default: 10

Maximum number of decimal places to show on the formatted data labels. Any trailing zeros will be omitted.

### Line Chart

Name the X axis in the data sheet `x` for ordinal data or `date` for time based data. You *must* ensure the [parseDateFormat](#parseDateFormat) option matches the data so the chart builder knows how to interpret the dates correctly.

#### ratio
> Default: `4x3` on mobile, `16x9` otherwise

Specify a custom aspect ratio. The graphic is responsive and resizable and will retain this ratio.

#### interpolate
> Default: `monotone`

Which function to use for smoothing the lines. Common values will be "linear" and "monotone". See https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate

#### parseDateFormat
> Default: `%d/%m/%y`

Specify the date format the data exists in. Use this guide to construct the template: https://github.com/mbostock/d3/wiki/Time-Formatting

Some common formats for dates would be:

* `%d/%m/%y` (matches day/month/year with preceding zeros and the abbreviated year, e.g. 01/01/16 -  31/12/16) THIS IS THE DEFAULT
* `%d/%m/%Y` (matches day/month/year with preceding zeros and the full year, e.g. 01/01/2016 -  31/12/2016)
* `%-d/%-m/%y` (matches day/month/year with no preceding zeros and the abbreviated year, e.g. 1/1/16 -  31/12/16)
* `%-d/%-m/%Y` (matches day/month/year with no preceding zeros and the full year, e.g. 1/1/2016 -  31/12/2016)
* `%m/%d/%y` (matches month/day/year with preceding zeros and the abbreviated year, e.g. 01/01/16 -  12/31/16)
* `%m/%d/%Y` (matches month/day/year with preceding zeros and the full year, e.g. 01/01/2016 -  12/31/2016)
* `%-m/%-d/%y` (matches month/day/year with no preceding zeros and the abbreviated year, e.g. 1/1/16 -  12/31/16)
* `%-m/%-d/%Y` (matches month/day/year with no preceding zeros and the full year, e.g. 1/1/2016 -  12/31/2016)

#### timeFormatLarge
> Default: a customized multi-resolution time format

How to format dates and times when the graphic is large. See https://github.com/mbostock/d3/wiki/Time-Formatting

You can use `\n` in this value to break the output over multiple lines.

#### timeFormatSmall
> Default: a customized multi-resolution time format

How to format dates and times when the graphic is small (such as on mobile).  See https://github.com/mbostock/d3/wiki/Time-Formatting

You can use `\n` in this value to break the output over multiple lines.

#### minValue
> Default: smallest value in the data rounded *down* to the nearest multiple of `roundTicksFactor`

Minimum value on the Y axis.

#### maxValue
> Default: largest value in the data rounded *up* to the nearest multiple of `roundTicksFactor`

Maximum value on the Y axis.

#### roundTicksFactor
> Default: `5`

Use this when relying on the default min or max value. When calculating the min and max Y value, it will round to the nearest factor or multiple of this number.

#### ticksX
> Default: `10`

How many ticks on the X axis.

#### ticksY
> Default: `10`

How many ticks on the Y axis.

#### prefixY
> Default: empty string

A string to put in front of the ticks in the Y axis. e.g. `$`.

#### suffixY
> Default: empty string

A string to put at the end of the ticks in the Y axis. e.g. `%`.

#### xLabel
> Default: none

Label the X axis. You may need to increase the margins if the label doesn't fit.

#### yLabel
> Default: none

Label the Y axis.

#### circleMarker
> Default: `on`

Set to `off` to hide the data point dots.

#### tooltip
> Default: `on`

Set to `off` to hide the tooltips.


### Bar Chart

#### valueGap
> Default: `6`

Spacing between the end of the bar and the value.

#### barHeight
> Default: `30`

The height of the bars.

#### barGap
> Default: `5`

Vertical spacing between each bar.

#### labelWidth
> Default: `85`

Width in pixels of the labels.

#### labelMargin
> Default: `6`

Spacing between the label and the bar.

#### minX
> Default: lowest value in the data rounded *down* to the nearest multiple of `roundTicksFactor` or rounded up to zero

Minimum value on the X axis.

#### maxX
> Default: largest value in the data rounded *up* to the nearest multiple of `roundTicksFactor`

Maximum value on the X axis.

#### roundTicksFactor
> Default: `5`

Use this when relying on the default min or max value. When calculating the maxX value, it will round to the nearest factor or multiple of this number.

#### ticksX
> Default: `4`

How many ticks on the X axis.

#### prefixX
> Default: empty string

A string to put in front of the ticks in the X axis. e.g. `$`.

#### suffixX
> Default: empty string

A string to put at the end of the ticks in the X axis. e.g. `%`.

### Grouped Bar Chart

Grouped Bar Charts have all the same options as [Bar Charts](#bar-chart) with one extra:

#### groupGap
> Default: `30`

Vertical spacing between each bar group.

### Column Chart

#### valueGap
> Default: `6`

#### roundTicksFactor
> Default: `50`

### Pie Chart

#### showLabels

## Common issues

If your data is displaying but not being plotted in the correct coordinates it is likely that you are using a date format different to the default (or the one specified by `parseDateFormat`). You can either update your dates in the data to use the default date format, or define a `parseDateFormat` that matches the date format you are using. See [parseDateFormat](#parseDateFormat) for more information.

## Development

For local development it is easier to create debug graphics so they don't require you to setup OAuth to use Google Spreadsheets. The path of the graphics is specified in `app_config.py`. By default it is located in the directory above the dailygraphics repo in a folder called `graphics`.

### Creating a debug graphic

Change directory to the dailygraphics repo before running `fab` commands.

~~~
fab add_line_chart:graphname,debug=1
~~~

(Alternately you can FTP down an existing graphic from NewsDev3: `/var/www/html/tools/chart-builder/graphics/` )

### (Re)Building a debug graphic

This rebuilds the local copy with any graphic template changes and content changes to the xlsx file in the graphic folder.

~~~
fab debug_deploy:graphname,template=line_chart
~~~

### Viewing a debug graphic

Navigate to the graphic folder and run a HTTP server:

~~~
python -m SimpleHTTPServer 8000
~~~

Then visit http://localhost:8000/build

### Modifying the data

There should be a xlsx file of the same name as the graphic in the graphic directory. Modify this file and run the debug_deploy command.
