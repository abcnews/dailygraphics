# ABC News dailygraphics

A fork of [NPR Visuals' dailygraphics project](https://github.com/nprapps/dailygraphics). See their [README.md](https://github.com/nprapps/dailygraphics/blob/master/README.md) for original documentation.

This project is used with the [Chart Builder](https://github.com/abcnews/chart-builder/) project to provide editors a web interface for creating new graphics.


* [Chart configuration options](#chart-configuration-options)
  * [Common](#common)
  * [Line Chart](#line-chart)
  * [Bar Chart](#bar-chart)
  * [Grouped Bar Chart](#grouped-bar-chart)
  * [Stacked Bar Chart](#stacked-bar-chart)
  * [Column Chart](#column-chart)
  * [Stacked Column Chart](#stacked-column-chart)
  * [Slopegraph](#slopegraph)
  * [Dot Chart](#dot-chart)
  * [Pie Chart](#pie-chart)
  * [Scatterplot](#scatterplot)
  * [Responsive HTML Table](#responsive-html-table) (TODO)
  * [Block Histogram](#block-histogram) (TODO)
  * [USA State Grid Map](#usa-state-grid-map) (TODO)
  * [Locator Map](#locator-map) (TODO)
  * [Graphic](#graphic) (TODO)
* [Common issues](#common-issues)
* [Development](#development)

## Chart configuration options

See the [graphic config matrix](https://github.com/abcnews/dailygraphics/blob/master/graphic-config-matrix.csv) for an overview.



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

#### card
> Default: `on`

By default the chart will be displayed in the ABC card container. Set to `off` to remove the card styling.

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
3. Special political party keywords to use ABC News standard party colors:
  * `ptylab` or `ptyalp` - Labor
  * `ptylib` or `ptylnp` - Liberal
  * `ptynat` - National
  * `ptygrn` - Green
  * `ptyoth` - Other

These different value types can be combined. e.g. `red, #abcdef, ptynat, #333`

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
> Default: `10`

Maximum number of decimal places to show on the formatted value labels and axes. Any trailing zeros will be omitted.

#### valuePrefix
> Default: empty string

A string to put in front of the values. e.g. `$`.

#### valueSuffix
> Default: empty string

A string to put at the end of the values. e.g. `%`.



### Line Chart

Name the X axis in the data sheet `x` for ordinal data or `date` for time based data. If it is time based data you *must* ensure it matches the [parseDateFormat](#parseDateFormat) option so the chart builder knows how to interpret the dates correctly.

#### ratio
> Default: `4x3` on mobile, `16x9` otherwise

Specify a custom aspect ratio. The graphic is responsive and resizable and will retain this ratio.

#### interpolate
> Default: `monotone`

Which function to use for smoothing the lines. Common values will be "linear" and "monotone". See https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate

#### lineStyles
> Default: `solid`

Comma separated list of line style for each data set. There are 4 line style options:

1. `solid`
2. `dotted`
3. `dashed1`
4. `dashed2`

E.g. `solid, dotted, solid, dotted, dashed1`

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

Approximate number of ticks to show on the X axis. Only applies to date-based line charts. Otherwise every x value has a tick.

#### mobileTicksX
> Default: `5`

#### ticksY
> Default: `10`

Approximate number of ticks to show on the Y axis.

#### mobileTicksY
> Default: `5`

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
> Default: `30` if 2 or fewer bars in chart/group and `10` if more

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



### Grouped Bar Chart

Grouped Bar Charts have all the same options as [Bar Charts](#bar-chart).



### Stacked Bar Chart

Stacked Bar Charts have all the same options as [Bar Charts](#bar-chart).



### Column Chart

#### valueGap
> Default: `6`

#### ratio
> Default: `4x3` on mobile, `16x9` otherwise

Specify a custom aspect ratio. The graphic is responsive and resizable and will retain this ratio.



### Stacked Column Chart

Stacked Column Charts have all the same options as [Column Charts](#column-chart).



### Slopegraph

#### ratio
> Default: `4x3` on mobile, `16x9` otherwise

Specify a custom aspect ratio. The graphic is responsive and resizable and will retain this ratio.

#### start_label

#### end_label

#### labelWidth

#### valueGap



### Dot Chart

#### barHeight

#### barGap

#### labelWidth

#### labelMargin

#### valueMinWidth

#### dotRadius

#### ticksX

#### mobileTicksX

#### roundTicksFactor

#### prefixX
> Default: empty string

A string to put in front of the ticks in the X axis. e.g. `$`.

#### suffixX
> Default: empty string

A string to put at the end of the ticks in the X axis. e.g. `%`.



### Pie Chart

No further config options.



### Scatterplot

NOT READY FOR USE IN PRODUCTION

Plot points on a X and Y axis.

Order of data values matter for determining which points and labels appears on top when they overlap.

Data points can be categorised by groups which affects their shape and colour.

Each data point also has a LabelPosition and LabelPriority value that determines where and when the Label should appear.

#### mostAverage

Highlights the most average data point for the X and Y axes.

#### trendlines

Adds trendlines for each group.





### Responsive HTML Table

NOT READY FOR USE IN PRODUCTION

#### hdr_state

#### hdr_usps

#### hdr_ap

#### hdr_value



### Block Histogram

NOT READY FOR USE IN PRODUCTION

#### blockGap

#### ticksY

#### annotation_left

#### annotation_right


### USA State Grid Map

NOT READY FOR USE IN PRODUCTION

No further config options.



### Locator Map

NOT READY FOR USE IN PRODUCTION

#### ratio
> Default: `4x3` on mobile, `16x9` otherwise

Specify a custom aspect ratio. The graphic is responsive and resizable and will retain this ratio.



### Graphic

NOT READY FOR USE IN PRODUCTION

#### ratio
> Default: `4x3` on mobile, `16x9` otherwise

Specify a custom aspect ratio. The graphic is responsive and resizable and will retain this ratio.



## Common issues

If your data is displaying but not being plotted in the correct coordinates it is possible that you are either:

1. Using a date format different to the default (or the one specified by `parseDateFormat`). You can either update your dates in the data to use the default date format, or define a `parseDateFormat` that matches the date format you are using. See [parseDateFormat](#parseDateFormat) for more information.

2. The date cells in the Google Sheets are being formatted in the sheet itself. This means that what is presented in the sheet is a different format to the underlying data. In this case there are two options:
  1. Change the date cells to be formatted as "Plain text" via the `Format` > `Number` menu.
  2. Update the `parseDateFormat` to match the underlying data format as seen in the function bar. This appears to be `%-m/%-d/%Y` for dates (have not confirmed this works)

## Development

For local development it is easier to create debug graphics so they don't require you to setup OAuth to use Google Spreadsheets. The path of the graphics is specified in `app_config.py`. By default it is located in the directory above the dailygraphics repo in a folder called `graphics`.

### Initial setup

Before running `fab` commands you need to change directory to the dailygraphics repo and run:

~~~
source "/usr/local/bin/virtualenvwrapper.sh"
workon dailygraphics
~~~

### Creating a debug graphic

~~~
fab add_line_chart:GRAPHIC-NAME,debug=1
~~~

(Alternately you can FTP down an existing graphic from NewsDev3: `/var/www/html/tools/chart-builder/graphics/` )

### (Re)Building a debug graphic

This rebuilds the local copy with any graphic template changes and content changes to the .xlsx file in the graphic folder.

~~~
fab debug_deploy:GRAPHIC-NAME,template=line_chart
~~~

### Viewing a debug graphic

Navigate to the graphic folder and run a HTTP server:

~~~
python -m SimpleHTTPServer 8000
~~~

Then visit http://localhost:8000/ or http://localhost.abc.net.au:8000/ (for web fonts to work) and navigate into the graphic `build` directory.

### Modifying the data

There should be a xlsx file of the same name as the graphic in the graphic directory. Modify this file and run the debug_deploy command.
