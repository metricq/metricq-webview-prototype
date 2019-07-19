function Graticule(ctx, offsetDimension)
{
  this.ctx = ctx;
  this.graticuleDimensions = offsetDimension;
/* make these function local
  this.timeConstraints = [minTime, maxTime];
  this.valueConstraints = [minValue, maxValue];
  this.widthPerSecond = this.graticuleDimensions[2] / (this.timeConstraints[1] - this.timeConstraints[0]);
  this.valueSubtract = this.valueConstraints[0];
  this.valueMultiply = this.graticuleDimensions[3] / (this.valueConstraints[1] - this.valueConstraints[0]);
*/
  this.series = new Array();
  this.addSeries = function(styleOptions)
  {
    var newSeries = new Series(styleOptions);
    this.series.push(newSeries);
    return newSeries;
  };
  /* broken, don't call it */
  this.drawGrid = function(pixelsLeft, pixelsBottom)
  {
    ctx.fillStyle = "#2020f0";
    ctx.font = "14px Sans";
    var everyThatManyPixels = 40;
    var timeStretch = this.timeConstraints[1] - this.timeConstraints[0];
    var minMaxTimeInterval = [this.graticuleDimensions[2] / everyThatManyPixels * 0.8, this.graticuleDimensions[2] / everyThatManyPixels * 1.6];
    for(var i = 0; i < minMaxTimeInterval.length; ++i)
    {
      minMaxTimeInterval[i] = timeStretch / minMaxTimeInterval[i];
    }
    var possibleTimeIntervals = [1, 15, 30, 60, 300, 900, 1800, 3600, 7200, 10800, 43200, 86400];
    var chosenTimeInterval = 0;
    for(var i = 1; i < possibleTimeIntervals.length; ++i)
    {
      if(possibleTimeIntervals[i] < minMaxTimeInterval[0])
      {
        continue;
      } else
      {
        chosenTimeInterval = i;
        break;
      }
      
    }
    chosenTimeInterval = possibleTimeIntervals[chosenTimeInterval];
    for(var i = this.timeConstraints[0] - (this.timeConstraints[0] % chosenTimeInterval); i < this.timeConstraints[1]; i += chosenTimeInterval)
    {
      if(i >= this.timeConstraints[0])
      {
        var x = this.graticuleDimensions[0] + (i - this.timeConstraints[0]) * this.widthPerSecond;
        ctx.fillRect( x, this.graticuleDimensions[1], 2, this.graticuleDimensions[3] + pixelsBottom / 4 );
        ctx.fillText(dateToHHMMStr(new Date(i * 1000)), x - 20, this.graticuleDimensions[1] + this.graticuleDimensions[3] + pixelsBottom / 2 );
      }
    }

    ctx.fillStyle = "#f02020";
    for(var i = 0; i < this.graticuleDimensions[3]; i += everyThatManyPixels)
    {
      ctx.fillRect(this.graticuleDimensions[0] - pixelsLeft, i, this.graticuleDimensions[2] + pixelsLeft, 2);
      ctx.fillText(Math.round((this.valueSubtract + ((this.graticuleDimensions[3] - i) / this.valueMultiply)) * 100) / 100, this.graticuleDimensions[0] - pixelsLeft, i + 14);
    }
  }
  this.draw = function()
  {
    if(0 == this.series.length)
    {
      console.log("No series to plot");
      return;
    }
    var timeRange = this.figureOutTimeRange(),
        valueRange = this.figureOutValueRange();
    var timePerPixel = (timeRange[1] - timeRange[0]) / this.graticuleDimensions[2],
        valuesPerPixel = (valueRange[1] - valueRange[0]) / this.graticuleDimensions[3];
    for(var i = 0; i < this.series.length; ++i)
    {
      var pointWidth = 2;
      var halfPointWidth = 1;
      if(this.series[i].styleOptions)
      {
        if(this.series[i].styleOptions.color)
        {
          this.ctx.fillStyle = this.series[i].styleOptions.color;
        }
        if(this.series[i].styleOptions.width)
        {
          pointWidth = this.series[i].styleOptions.width;
        }
      }
      halfPointWidth = Math.round(pointWidth / 2);
      
      for(var j = 0,x,y; j < this.series[i].points.length; ++j)
      {
        x = this.graticuleDimensions[0] + Math.round((this.series[i].points[j].time - timeRange[0]) / timePerPixel);
        y = this.graticuleDimensions[1] + (this.graticuleDimensions[3] - Math.round((this.series[i].points[j].value - valueRange[0]) / valuesPerPixel));
        ctx.fillRect(x - halfPointWidth, y - halfPointWidth, pointWidth, pointWidth)
      }
    }
  }
  this.figureOutTimeRange = function ()
  {
    if(0 == this.series.length)
    {
       return [0,0];
    }
    var timeRange = this.series[0].getTimeRange();
    for(var i = 1; i < this.series.length; ++i)
    {
      var curRange = this.series[i].getTimeRange();
      if(curRange[0] < timeRange[0])
      {
        timeRange[0] = curRange[0];
      }
      if(curRange[1] > timeRange[1])
      {
        timeRange[1] = curRange[1];
      }
    }
    return timeRange;
  }
  this.figureOutValueRange = function ()
  {
    if(0 == this.series.length)
    {
       return [0,0];
    }
    var valueRange = this.series[0].getValueRange();
    for(var i = 1; i < this.series.length; ++i)
    {
      var curRange = this.series[i].getValueRange();
      if(curRange[0] < valueRange[0])
      {
        valueRange[0] = curRange[0];
      }
      if(curRange[1] > valueRange[1])
      {
        valueRange[1] = curRange[1];
      }
    }
    // add wiggle room
    valueRange[0] *= 0.9;
    valueRange[1] *= 1.1;
    return valueRange;
  }
}
function Series(styleOptions)
{
  this.points = new Array();
  this.styleOptions = styleOptions;
  this.addPoint = function (newPoint) {
    if(0 == this.points.length)
    {
      this.points.push(newPoint);
      return newPoint;
    } else
    {
      var middleIndex = undefined,
          bottom = 0
          head = this.points.length - 1;
      // binary search, where to insert the new point
      while(10 < (head - bottom))
      {
        middleIndex = bottom + Math.floor((head - bottom) / 2);
        if(this.points[middleIndex].time < newPoint.time)
        {
          bottom = middleIndex;
        } else
        {
          head = middleIndex;
        }
      }
      // for the remaining 10 elements binary search is too time intensive
      var i;
      for(i = bottom; i <= head; ++i)
      {
        if(this.points[i].time > newPoint.time)
        {
          this.points.splice(i, 0, [newPoint]);
          break;
        }
      }
      // if we could not insert the newPoint somewhere in between, put it at the end
      if(i == (head + 1))
      {
        this.points.push(newPoint);
      }
    }
    return newPoint;
  }
  this.getTimeRange = function()
  {
    if(0 == this.points.length)
    {
      return [0, 0];
    } else
    {
      return [this.points[0].time, this.points[this.points.length - 1].time];
    }
  }
  this.getValueRange = function()
  {
    if(0 == this.points.length)
    {
      return [0, 0];
    }
    var min = this.points[0].value, max = this.points[0].value;
    for(var i = 1; i < this.points.length; ++i)
    {
      if(this.points[i].value < min)
      {
        min = this.points[i].value;
      } else if(this.points[i].value > max)
      {
        max = this.points[i].value = max;
      }
    }
    return [min, max];
  }
}
function Point(paramTime, paramValue)
{
  this.time = paramTime;
  this.value = paramValue;
}
function dateToHHMMStr(curDate)
{
  return hhmmToStr(curDate.getHours(), curDate.getMinutes());
}
function hhmmToStr(minutes, seconds)
{
  var outStr = "";
  if(minutes < 10)
  {
    outStr += "0";
  }
  outStr += minutes;
  outStr += ":";
  if(seconds < 10)
  {
    outStr += "0";
  }
  outStr += seconds;
  return outStr; 
}
