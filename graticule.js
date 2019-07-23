function Graticule(ctx, offsetDimension, paramPixelsLeft, paramPixelsBottom)
{
  this.ctx = ctx;
  this.graticuleDimensions = offsetDimension;
  this.curTimeRange = undefined;
  this.curValueRange = undefined;
  this.curTimePerPixel = undefined;
  this.curValuesPerPixel = undefined;
  this.pixelsLeft = paramPixelsLeft;
  this.pixelsBottom = paramPixelsBottom;
  this.series = new Array();
  this.bands = new Array();
  this.lastRangeChangeTime = 0;
  this.clearSeries = function(seriesSpecifier)
  {
    var curSeries = this.getSeries(seriesSpecifier);
    if(curSeries)
    {
      curSeries.clear();
      return curSeries;
    }
    return undefined;
  };
  this.getSeriesIndex = function(seriesSpecifier)
  {
    for(var i = 0; i < this.series.length; ++i)
    {
      if(seriesSpecifier === this.series[i].name)
      {
        return i;
      }
    }
    return undefined;
  };
  this.getSeries = function(seriesSpecifier)
  {
    if("number" == (typeof seriesSpecifier))
    {
      if((0 <= seriesSpecifier) && (this.series.length > seriesSpecifier))
      {
        return this.series[seriesSpecifier];
      }
    } else
    {
      return this.series[this.getSeriesIndex(seriesSpecifier)];
    }
    return undefined;
  };
  this.getBand = function(bandSpecifier)
  {
    if("number" == (typeof bandSpecifier))
    {
      if((0 <= bandSpecifier) && (this.bands.length > bandSpecifier))
      {
        return this.bands[bandSpecifier];
      }
    } else
    {
      for(var i = 0; i < this.bands.length; ++i)
      {
        if(bandSpecifier === this.bands[i].name)
        {
          return this.bands[i];
        }
      }
    }
    return undefined;
  }
  this.addSeries = function(seriesName, styleOptions)
  {
    var newSeries = new Series(seriesName, styleOptions);
    this.series.push(newSeries);
    return newSeries;
  };
  this.addBand = function(bandName, styleOptions)
  {
    var newBand = new Band(bandName, styleOptions);
    this.bands.push(newBand);
    return newBand;
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
    this.ctx.fillStyle = "rgba(192,192,192,0.5)";
    this.ctx.font = "14px Sans";
    var minDistanceBetweenGridLines = 40;
    var maxStepsCount = Math.floor(this.graticuleDimensions[2] / minDistanceBetweenGridLines);
    var xAxisSteps = this.figureOutLogarithmicSteps(timeRange[0], timeRange[1], maxStepsCount);
    for(var i = 0; i < xAxisSteps[i]; ++i)
    {
      var x = this.graticuleDimensions[0] + ((xAxisSteps[i] - timeRange[0]) / timePerPixel);
      this.ctx.fillRect( x, this.graticuleDimensions[1], 2, this.graticuleDimensions[3]);
      this.ctx.fillText(dateToHHMMStr(new Date(xAxisSteps[i])), x - 20, this.graticuleDimensions[1] + this.graticuleDimensions[3] + this.pixelsBottom /2);
    }

    maxStepsCount = Math.floor(this.graticuleDimensions[3] / minDistanceBetweenGridLines);
    var yAxisSteps = this.figureOutLogarithmicSteps(valueRange[0], valueRange[1], maxStepsCount);
    for(var i = 0; i < yAxisSteps[i]; ++i)
    {
      var y = this.graticuleDimensions[3] - ((yAxisSteps[i] - valueRange[0]) / valuesPerPixel) + this.graticuleDimensions[1];
      if(y >= this.graticuleDimensions[1])
      {
        this.ctx.fillRect( this.graticuleDimensions[0], y, this.graticuleDimensions[2], 2);
        this.ctx.fillText(yAxisSteps[i], this.graticuleDimensions[0] - this.pixelsLeft, y + 4);
      }
    }
  };
  this.getTimeValueAtPoint = function(positionArr)
  {
    var relationalPos = [ positionArr[0] - this.graticuleDimensions[0],
                          positionArr[1] - this.graticuleDimensions[1]];
    if( undefined !== this.curTimeRange
    && relationalPos[0] >= 0
    && relationalPos[0] <= this.graticuleDimensions[2]
    && relationalPos[1] >= 0
    && relationalPos[1] <= this.graticuleDimensions[3])
    {
      return [ Math.round((relationalPos[0] * this.curTimePerPixel) + this.curTimeRange[0]),
               ((this.graticuleDimensions[3] - relationalPos[1]) * this.curValuesPerPixel) + this.curValueRange[0]
             ];
    } else
    {
      return undefined;
    }
  };
  this.moveTimeAndValueRanges = function(moveTimeBy, moveValueBy)
  {
    this.curTimeRange[0] += moveTimeBy;
    this.curTimeRange[1] += moveTimeBy;
    this.curValueRange[0] += moveValueBy;
    this.curValueRange[1] += moveValueBy;
    this.lastRangeChangeTime = (new Date()).getTime();
  };
  this.zoomTimeAndValueAtPoint = function(pointAt, zoomDirection, zoomTime, zoomValue)
  {
    var zoomFactor = 1 + zoomDirection;
    var newTimeDelta  = (this.curTimeRange[1] - this.curTimeRange[0]  ) * zoomFactor;
    var newValueDelta = (this.curValueRange[1] - this.curValueRange[0]) * zoomFactor;
    if(zoomTime)
    {
      this.curTimeRange  = [ pointAt[0] - (newTimeDelta / 2),
                             pointAt[0] + (newTimeDelta / 2)];
      this.curTimePerPixel = (this.curTimeRange[1] - this.curTimeRange[0]) / this.graticuleDimensions[2];
    }
    if(zoomValue)
    {
      this.curValueRange = [ pointAt[1] - (newValueDelta / 2),
                             pointAt[1] + (newValueDelta / 2)];
      this.curValuesPerPixel = (this.curValueRange[1] - this.curValueRange[0]) / this.graticuleDimensions[3];
    }
    this.lastRangeChangeTime = (new Date()).getTime();
  }
  this.automaticallyDetermineRanges = function(determineTimeRange, determineValueRange)
  {
    if(determineTimeRange)
    {
      this.curTimeRange = this.figureOutTimeRange();
      this.curTimePerPixel = (this.curTimeRange[1] - this.curTimeRange[0]) / this.graticuleDimensions[2];
    }
    if(determineValueRange)
    {
      this.curValueRange = this.figureOutValueRange();
      this.curValuesPerPixel = (this.curValueRange[1] - this.curValueRange[0]) / this.graticuleDimensions[3];
    }
    if(determineTimeRange || determineValueRange)
    {
      this.lastRangeChangeTime = (new Date()).getTime();
    }
  };
  this.draw = function(adjustRanges)
  {
    if(0 == this.series.length)
    {
      console.log("No series to plot");
      return;
    }
    if(true === adjustRanges)
    {
      this.automaticallyDetermineRanges(true, true);
    } else if(undefined === this.curTimeRange)
    {
      console.log("Cowardly refusing to do draw() when I am not allowed to determine Time and Value Ranges");
    }
    this.ctx.clearRect(this.graticuleDimensions[0] - this.pixelsLeft, this.graticuleDimensions[1],
                  this.graticuleDimensions[2] + this.pixelsLeft, this.graticuleDimensions[3] + this.pixelsBottom);
    this.drawGrid(this.curTimeRange, this.curValueRange, this.curTimePerPixel, this.curValuesPerPixel);
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(this.graticuleDimensions[0], this.graticuleDimensions[1],
                  this.graticuleDimensions[2], this.graticuleDimensions[3]);
    this.ctx.clip();
    this.drawBands(this.curTimeRange, this.curValueRange, this.curTimePerPixel, this.curValuesPerPixel);
    this.drawSeries(this.curTimeRange, this.curValueRange, this.curTimePerPixel, this.curValuesPerPixel);
    this.ctx.restore();
  }
  this.drawBands = function(timeRange, valueRange, timePerPixel, valuesPerPixel)
  {
    for(var i = 0; i < this.bands.length; ++i)
    {
      if(this.bands[i].styleOptions)
      {
        if(this.bands[i].styleOptions.color)
        {
          this.ctx.fillStyle = this.bands[i].styleOptions.color;
        }
      }
      
      for(var j = 0,x,y; j < this.bands[i].points.length; ++j)
      {
        x = this.graticuleDimensions[0] + Math.round((this.bands[i].points[j].time - timeRange[0]) / timePerPixel);
        y = this.graticuleDimensions[1] + (this.graticuleDimensions[3] - Math.round((this.bands[i].points[j].value - valueRange[0]) / valuesPerPixel));
        if(0 == j)
        {
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
        } else
        {
          this.ctx.lineTo(x,y);
        }
      }
      if(0 < this.bands[i].points.length)
      {
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
  }
  this.drawSeries = function(timeRange, valueRange, timePerPixel, valuesPerPixel)
  {
    for(var i = 0; i < this.series.length; ++i)
    {
      // reset line dash
      this.ctx.setLineDash([0,0]);
      var pointWidth = 2;
      var halfPointWidth = 1;
      var drawALine = false;
      var drawDots = true;
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
          if(this.series[i].styleOptions.lineWidth)
          {
            this.ctx.lineWidth = this.series[i].styleOptions.lineWidth;
          }
          if(this.series[i].styleOptions.lineDash)
          {
            this.ctx.setLineDash(this.series[i].styleOptions.lineDash);
          }
        }
        if(!this.series[i].styleOptions.dots)
        {
          drawDots = false;
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
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
          } else
          {
            this.ctx.lineTo(x,y);
          }
        }
        if(drawDots)
        {
          this.ctx.fillRect(x - halfPointWidth, y - halfPointWidth, pointWidth, pointWidth);
        }
      }
      if(drawALine)
      {
        this.ctx.stroke();
        this.ctx.closePath();
      }
    }
  };
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
    for(var i = 1; i < this.bands.length; ++i)
    {
      var curRange = this.bands[i].getTimeRange();
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
  };
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
    for(var i = 1; i < this.bands.length; ++i)
    {
      var curRange = this.bands[i].getValueRange();
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
  };
}
function Band(paramName, paramStyleOptions)
{
  this.points = new Array();
  this.name = paramName;
  this.styleOptions = paramStyleOptions;
  this.addPoint = function (newPoint)
  {
    this.points.push(newPoint);
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
        max = this.points[i].value;
      }
    }
    return [min, max];
  }
  this.clear = function ()
  {
    delete this.points;
    this.points = new Array();
  };
}
function Series(paramName, paramStyleOptions)
{
  this.points = new Array();
  this.name = paramName;
  this.styleOptions = paramStyleOptions;
  this.clear = function ()
  {
    delete this.points;
    this.points = new Array();
  };
  this.addPoint = function (newPoint, isBigger) {
    if(isBigger || 0 == this.points.length)
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
        max = this.points[i].value;
      }
    }
    return [min, max];
  }
}
function Point(paramTime, paramValue)
{
  this.time = paramTime;
  this.value = paramValue;
  this.clone = function ()
  {
    return new Point(this.time, this.value);
  }
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
