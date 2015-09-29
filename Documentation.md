# Chart Builder

## Line Chart

### Type of X axis
Name the X axis in the data sheet `x` for ordinal data or `date` for time based data.

**ratio**
> Default: `4x3` on mobile, `16x9` otherwise
Specify a custom aspect ratio. The graphic is responsive and resizable and will retain this ratio.

**colors**
> Default: `blue, red, yellow, orange, teal`
Comma separated list of colors for each line. e.g. "red, blue, green, yellow". You can also specify the colors as RGB hex values (see http://www.colorpicker.com/) preceded with `#`.

**interpolate**
> Default: `monotone`
Which function to use for smoothing the lines. Common values will be "linear" and "monotone". See https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate

**parseDateFormat**
> Default: `%d/%m/%y`
Specify the date format the data exists in. Use this guide to construct the template: https://github.com/mbostock/d3/wiki/Time-Formatting

**timeFormatLarge**
> Default: `%b %Y`
How to format dates and times when the graphic is large. See https://github.com/mbostock/d3/wiki/Time-Formatting

**timeFormatSmall**
> Default: `%y`
How to format dates and times when the graphic is small (such as on mobile).

**minValue**
> Default: smallest value in the data rounded *down* to the nearest multiple of `roundTicksFactor`
Minimum value on the Y axis.

**maxValue**
> Default: largest value in the data rounded *up* to the nearest multiple of `roundTicksFactor`
Maximum value on the Y axis.

**roundTicksFactor**
> Default: `5`
Use this when relying on the default min or max value. When calculating the min and max Y value, it will round to the nearest factor or multiple of this number.

**ticksX**
> Default: `10`
How many ticks on the X axis.

**ticksY**
> Default: `10`
How many ticks on the Y axis.

**marginTop**
> Default: `5`
Spacing at the top of the graphic in pixels.

**marginRight**
> Default: `80`

**marginBottom**
> Default: `20`

**marginLeft**
> Default: `30`

**prefixY**
> Default: empty string
A string to put in front of the ticks in the Y axis. e.g. `$`.

**suffixY**
> Default: empty string
A string to put at the end of the ticks in the Y axis. e.g. `%`.

**xLabel**
> Default: none
Label the X axis. You may need to increase the margins if the label doesn't fit.

**yLabel**
> Default: none
Label the Y axis.

## Bar Chart

**barColors**
> Default: teal
Custom fill color for bars in the bar chart. For multiple colors, separate colors with a comma.

**valueGap**
> Default: `6`
Spacing between the end of the bar and the value.

**barHeight**
> Default: `30`
The height of the bars.

**barGap**
> Default: `5`
Vertical spacing between each bar.

**labelWidth**
> Default: `85`
Width in pixels of the labels.

**labelMargin**
> Default: `6`
Spacing between the label and the bar.

**marginTop**
> Default: `0`
Spacing at the top of the graphic in pixels.

**marginRight**
> Default: `15`

**marginBottom**
> Default: `20`

**marginLeft**
> Default: `labelWidth + labelMargin`

**maxX**
> Default: largest value in the data rounded *up* to the nearest multiple of `roundTicksFactor`
Maximum value on the X axis.

**roundTicksFactor**
> Default: `5`
Use this when relying on the default min or max value. When calculating the maxX value, it will round to the nearest factor or multiple of this number.

**ticksX**
> Default: `4`
How many ticks on the X axis.
