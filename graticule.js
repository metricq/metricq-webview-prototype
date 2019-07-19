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
  this.figureOutLogarithmicSteps = function(rangeStart, rangeEnd, maxStepsAllowed)
  {
    var deltaRange = rangeEnd - rangeStart;
    // due to floating point errors we have to increment deltaRange slightly
    // so as to arrive at the correct logarithmic value
    var powerTen = Math.floor(Math.log(deltaRange * 1.0000000001)/Math.log(10));
    var stepSize = Math.pow(10, powerTen);
    if((deltaRange / stepSize) > maxStepsAllowed)
    {
      if((deltaRange / (stepSize * 5)) < maxStepsAllowed)
      {
        stepSize *= 5;
      } else if((deltaRange / (stepSize * 10)) < maxStepsAllowed)
      {
        stepSize *= 10;
      }
    } else if((deltaRange / stepSize * 5) < maxStepsAllowed)
    {
      if((deltaRange / (stepSize / 10)) < maxStepsAllowed)
      {
        stepSize /= 10;
      }
      if((deltaRange / (stepSize / 5)) < maxStepsAllowed)
      {
        stepSize /= 5;
      }
    }
    var firstStep = rangeStart + (stepSize - (rangeStart % stepSize));
    var stepsArr = new Array()
    for(var i = firstStep; i < rangeEnd; i+=stepSize)
    {
      stepsArr.push(i);
    }
    return stepsArr;
  };
  
  this.drawGrid = function(timeRange, valueRange, timePerPixel, valuesPerPixel)
  {
    ctx.fillStyle = "rgba(192,192,192,0.5)";
    ctx.font = "14px Sans";
    var minDistanceBetweenGridLines = 40;
    var maxStepsCount = Math.floor(this.graticuleDimensions[2] / minDistanceBetweenGridLines);
    var xAxisSteps = this.figureOutLogarithmicSteps(timeRange[0], timeRange[1], maxStepsCount);
    for(var i = 0; i < xAxisSteps[i]; ++i)
    {
      var x = this.graticuleDimensions[0] + ((xAxisSteps[i] - timeRange[0]) / timePerPixel);
      ctx.fillRect( x, this.graticuleDimensions[1], 2, this.graticuleDimensions[3]);
      ctx.fillText(dateToHHMMStr(new Date(xAxisSteps[i])), x - 20, this.graticuleDimensions[1] + this.graticuleDimensions[3] + 20);
    }

    maxStepsCount = Math.floor(this.graticuleDimensions[3] / minDistanceBetweenGridLines);
    var yAxisSteps = this.figureOutLogarithmicSteps(valueRange[0], valueRange[1], maxStepsCount);
    for(var i = 0; i < yAxisSteps[i]; ++i)
    {
      var y = this.graticuleDimensions[3] - ((yAxisSteps[i] - valueRange[0]) / valuesPerPixel) + this.graticuleDimensions[1];
      ctx.fillRect( this.graticuleDimensions[0], y, this.graticuleDimensions[2], 2);
      ctx.fillText(yAxisSteps[i], this.graticuleDimensions[0] - 40, y + 4);
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
    ctx.clearRect(this.graticuleDimensions[0], this.graticuleDimensions[1],
                  this.graticuleDimensions[2], this.graticuleDimensions[3]);
    this.drawGrid(timeRange, valueRange, timePerPixel, valuesPerPixel);
    for(var i = 0; i < this.series.length; ++i)
    {
      var pointWidth = 2;
      var halfPointWidth = 1;
      var drawALine = true;
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
        if(this.series[i].styleOptions.connect)
        {
          drawALine = true;
          if(this.series[i].styleOptions.color)
          {
            this.ctx.strokeStyle = this.series[i].styleOptions.color;
          }
        }
      }
      halfPointWidth = Math.round(pointWidth / 2);
      
      for(var j = 0,x,y; j < this.series[i].points.length; ++j)
      {
        x = this.graticuleDimensions[0] + Math.round((this.series[i].points[j].time - timeRange[0]) / timePerPixel);
        y = this.graticuleDimensions[1] + (this.graticuleDimensions[3] - Math.round((this.series[i].points[j].value - valueRange[0]) / valuesPerPixel));
        if(drawALine)
        {
          if(0 == j)
          {
            ctx.beginPath();
            ctx.moveTo(x, y);
          } else
          {
            ctx.lineTo(x,y);
          }
        }
        ctx.fillRect(x - halfPointWidth, y - halfPointWidth, pointWidth, pointWidth)
      }
      if(drawALine)
      {
        ctx.closePath();
        ctx.stroke();
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
