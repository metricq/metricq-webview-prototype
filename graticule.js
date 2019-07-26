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
  this.resetData = function()
  {
    delete this.series;
    delete this.bands;
    this.series = new Array();
    this.bands = new Array();
  }
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
  this.figureOutTimeSteps = function(maxStepsAllowed)
  {
    var startTime = new Date(this.curTimeRange[0]);
    var deltaTime = this.curTimeRange[1] - this.curTimeRange[0];
    var timeStretches = [
      86400000 * 365, // year
      86400000 * 30, // month
      86400000, // day
      3600000, // hour
      60000, // minute
      1000, // second
      1 // millisecond
    ];
    var i;
    for(i = 0; i < 7; ++i)
    {
      if((deltaTime / timeStretches[i]) < (maxStepsAllowed * 0.7))
      {
        continue
      } else
      {
        break;
      }
    }
    if(7 == i)
    {
      i = 6;
    }
    var curRangeMultiplier = (deltaTime / timeStretches[i]) / maxStepsAllowed;
    var mostBeautifulMultipliers = [
      [1, 5, 10, 25, 50, 75, 100], // year
      [1, 2, 3, 4, 6, 12], // month
      [1, 2, 7, 14, 21, 28], // day
      [1, 2, 3, 4, 6, 8, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 64, 60, 72, 84, 96], // hour
      [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300], // minute
      [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300], // second
      [1, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000] // millisecond
    ];
    var j = 0;
    var indexClosest = 0;
    var deltaClosest = 99999999999;
    for(; j < mostBeautifulMultipliers[i].length; ++j)
    {
      var curDelta = Math.abs(mostBeautifulMultipliers[i][j] - curRangeMultiplier);
      if(curDelta < deltaClosest)
      {
        indexClosest = j;
        deltaClosest = curDelta;
      }
    }
    var moreBeautifulMultiplier = mostBeautifulMultipliers[i][indexClosest];
    if((curRangeMultiplier * 0.50) <= moreBeautifulMultiplier
    && (curRangeMultiplier * 1.50) >= moreBeautifulMultiplier)
    {
      curRangeMultiplier = moreBeautifulMultiplier;
    } else
    {
      curRangeMultiplier = Math.floor(curRangeMultiplier);
    }
    if(1 > curRangeMultiplier)
    {
      curRangeMultiplier = 1;
    }
    var stepSize = timeStretches[i] * curRangeMultiplier;
    var stepStart = undefined;
    var fields = 
    [
      1970,
      1,
      1,
      0,
      0,
      0,
      0
    ]
    switch(i)
    {
      case 0:
        fields[0] = startTime.getFullYear();
        break;
      case 1:
        fields[0] = startTime.getFullYear();
        fields[1] = (startTime.getMonth() + 1) - ((startTime.getMonth() + 1) % curRangeMultiplier);
        if(1 > fields[1])
        {
          fields[1] = 1;
        }
        break;
      case 2:
        fields[0] = startTime.getFullYear();
        fields[1] = startTime.getMonth() + 1;
        fields[2] = startTime.getDate() - startTime.getDate() % curRangeMultiplier;
        if(1 > fields[2])
        {
          fields[2] = 1;
        }
        break;
      case 3:
        fields[0] = startTime.getFullYear();
        fields[1] = startTime.getMonth() + 1;
        fields[2] = startTime.getDate();
        fields[3] = startTime.getHours() - startTime.getHours() % curRangeMultiplier;
        break;
      case 4:
        fields[0] = startTime.getFullYear();
        fields[1] = startTime.getMonth() + 1;
        fields[2] = startTime.getDate();
        fields[3] = startTime.getHours();
        fields[4] = startTime.getMinutes() - startTime.getMinutes() % curRangeMultiplier;
        break;
      case 5:
        fields[0] = startTime.getFullYear();
        fields[1] = startTime.getMonth() + 1;
        fields[2] = startTime.getDate();
        fields[3] = startTime.getHours();
        fields[4] = startTime.getMinutes();
        fields[5] = startTime.getSeconds() - startTime.getSeconds() % curRangeMultiplier;
        break;
      case 6:
        fields[0] = startTime.getFullYear();
        fields[1] = startTime.getMonth() + 1;
        fields[2] = startTime.getDate();
        fields[3] = startTime.getHours();
        fields[4] = startTime.getMinutes();
        fields[5] = startTime.getSeconds();
        fields[6] = startTime.getMilliseconds() - startTime.getMilliseconds() % curRangeMultiplier;
        break;
    }
    stepStart = new Date(fields[0] + "-" + (fields[1] < 10 ? "0" : "") + fields[1] + "-" + (fields[2] < 10 ? "0" : "") + fields[2] + " " + (fields[3] < 10 ? "0" : "") + fields[3] + ":" + (fields[4] < 10 ? "0" : "") + fields[4] + ":" + (fields[5] < 10 ? "0" : "") + fields[5] + "." + (fields[6] < 100 ? "00" : (fields[6] < 10 ? "0" : "")) + fields[6]);
    while(stepStart.getTime() < this.curTimeRange[0])
    {
      stepStart = new Date(stepStart.getTime() + stepSize);
    }
    var outArr = new Array();
    var monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
    var previousCurDate = undefined;
    for(var j = stepStart.getTime(); j < this.curTimeRange[1]; j += stepSize)
    {
      var curDate = new Date(j);
      switch(i)
      {
        case 0:
          outArr.push([ j, "" + curDate.getFullYear()]);
          break;
        case 1:
          if(0 == curDate.getMonth() || !previousCurDate)
          {
            outArr.push([ j, monthNames[curDate.getMonth()] + " " + curDate.getFullYear()]);
          } else
          {
            outArr.push([ j, monthNames[curDate.getMonth()]]);
          }
          break;
        case 2:
          if(1 == curDate.getDate() || !previousCurDate)
          {
            outArr.push([j, curDate.getDate() + " " + monthNames[curDate.getMonth()]]);
          } else
          {
            outArr.push([j, "" + curDate.getDate()]);
          }
          break;
        case 3:
          if(0 == curDate.getHours() || !previousCurDate || previousCurDate.getDate() != curDate.getDate())
          {
            outArr.push([j, curDate.getDate() + " " + monthNames[curDate.getMonth()] + " " + (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":00"]);
          } else
          {
            outArr.push([j, (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":00"]);
          }
          break;
        case 4:
          outArr.push([j, (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":" + (curDate.getMinutes() < 10 ? "0" : "") + curDate.getMinutes()]);
          break;
        case 5:
          outArr.push([j, (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":" + (curDate.getMinutes() < 10 ? "0" : "") + curDate.getMinutes() + ":" + (curDate.getSeconds() < 10 ? "0" : "") + curDate.getSeconds()]);
          break;
        case 6:
          var msString = "" + curDate.getMilliseconds();
          for(var k = msString.length; k < 3; ++k)
          {
            msString = "0" + msString;
          }
          if(0 == curDate.getMilliseconds() || !previousCurDate)
          {
            outArr.push([j, (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":" + (curDate.getMinutes() < 10 ? "0" : "") + curDate.getMinutes() + ":" + (curDate.getSeconds() < 10 ? "0" : "") + curDate.getSeconds() + "." + msString]);
          } else
          {
            outArr.push([j, (curDate.getSeconds() < 10 ? "0" : "") + curDate.getSeconds() + "." + msString]);
          }
      }
      previousCurDate = curDate;
    }
    return outArr;
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
      if((deltaRange / (stepSize * 2)) < maxStepsAllowed)
      {
        stepSize *= 2;
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
      if((deltaRange / (stepSize / 2)) < maxStepsAllowed)
      {
        stepSize /= 2;
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
    /* draw lines */
    this.ctx.fillStyle = "rgba(192,192,192,0.5)";
    var minDistanceBetweenGridLines = 110;
    var maxStepsCount = Math.floor(this.graticuleDimensions[2] / minDistanceBetweenGridLines);
    var xAxisSteps = this.figureOutTimeSteps(maxStepsCount);
    var xPositions = new Array();
    for(var i = 0; i < xAxisSteps.length; ++i)
    {
      var x = Math.round(this.graticuleDimensions[0] + ((xAxisSteps[i][0] - timeRange[0]) / timePerPixel));
      xPositions.push(x);
      this.ctx.fillRect( x, this.graticuleDimensions[1], 2, this.graticuleDimensions[3]);
    }

    minDistanceBetweenGridLines = 30;
    maxStepsCount = Math.floor(this.graticuleDimensions[3] / minDistanceBetweenGridLines);
    var yAxisSteps = this.figureOutLogarithmicSteps(valueRange[0], valueRange[1], maxStepsCount);
    var yPositions = new Array();
    for(var i = 0; i < yAxisSteps.length; ++i)
    {
      var y = Math.round(this.graticuleDimensions[3] - ((yAxisSteps[i] - valueRange[0]) / valuesPerPixel) + this.graticuleDimensions[1]);
      yPositions.push(y);
      if(y >= this.graticuleDimensions[1])
      {
        this.ctx.fillRect( this.graticuleDimensions[0], y, this.graticuleDimensions[2], 2);
      }
    }
    /* draw text */
    this.ctx.fillStyle = "rgba(0,0,0,1)";
    this.ctx.font = "14px Sans";
    for(var i = 0; i < xAxisSteps.length; ++i)
    {
      var textWidth = this.ctx.measureText(xAxisSteps[i][1]).width;
      this.ctx.fillText(xAxisSteps[i][1], xPositions[i] - Math.floor(textWidth / 2), this.graticuleDimensions[1] + this.graticuleDimensions[3] + this.pixelsBottom /2);
    }
    for(var i = 0; i < yAxisSteps.length; ++i)
    {
      if(yPositions[i] >= this.graticuleDimensions[1])
      {
        this.ctx.fillText(yAxisSteps[i], this.graticuleDimensions[0] - this.pixelsLeft, yPositions[i] + 4);
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
  this.setTimeRange = function (newTimeRange)
  {
    this.curTimeRange = [newTimeRange[0], newTimeRange[1]];
    this.curTimePerPixel = (this.curTimeRange[1] - this.curTimeRange[0]) / this.graticuleDimensions[2];
  };
  this.zoomTimeAndValueAtPoint = function(pointAt, zoomDirection, zoomTime, zoomValue)
  {
    var zoomFactor = 1 + zoomDirection;
    var newTimeDelta  = (this.curTimeRange[1] - this.curTimeRange[0]  ) * zoomFactor;
    var newValueDelta = (this.curValueRange[1] - this.curValueRange[0]) * zoomFactor;
    if(zoomTime)
    {
      var relationalPositionOfPoint = (pointAt[0] - this.curTimeRange[0]) / (this.curTimeRange[1] - this.curTimeRange[0]);
      this.setTimeRange([ pointAt[0] - (newTimeDelta * relationalPositionOfPoint),
                          pointAt[0] + (newTimeDelta * (1 - relationalPositionOfPoint))]);
    }
    if(zoomValue)
    {
      var relationalPositionOfPoint = (pointAt[1] - this.curValueRange[0]) / (this.curValueRange[1] - this.curValueRange[0]);
      this.curValueRange  = [ pointAt[1] - (newValueDelta * relationalPositionOfPoint),
                             pointAt[1] + (newValueDelta * (1 - relationalPositionOfPoint))];
      this.curValuesPerPixel = (this.curValueRange[1] - this.curValueRange[0]) / this.graticuleDimensions[3];
    }
    this.lastRangeChangeTime = (new Date()).getTime();
  };
  this.automaticallyDetermineRanges = function(determineTimeRange, determineValueRange)
  {
    if(determineTimeRange)
    {
      this.setTimeRange(this.figureOutTimeRange());
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
      /* connectionType is responsible for the way the
       * data points will be connected
       * 1 = direct
       * 2 = last
       * 3 = next
       */
      var connectionType = 1;
      if(this.bands[i].styleOptions)
      {
        if(this.bands[i].styleOptions.skip)
        {
          continue;
        }
        if(this.bands[i].styleOptions.color)
        {
          this.ctx.fillStyle = this.bands[i].styleOptions.color;
        }
        if(this.bands[i].styleOptions.alpha)
        {
          this.ctx.globalAlpha = this.bands[i].styleOptions.alpha;
        }
        if(this.bands[i].styleOptions.connect)
        {
          if("direct" == this.bands[i].styleOptions.connect)
          {
            connectionType = 1;
          } else if("last" == this.bands[i].styleOptions.connect)
          {
            connectionType = 2;
          } else if("next" == this.bands[i].styleOptions.connect)
          {
            connectionType = 3;
          }
        }
      }
     
      var switchOverIndex = Math.floor(this.bands[i].points.length / 2) + 1; 
      for(var j = 0,x,y,previousX,previousY; j < this.bands[i].points.length; ++j)
      {
        x = this.graticuleDimensions[0] + Math.round((this.bands[i].points[j].time - timeRange[0]) / timePerPixel);
        y = this.graticuleDimensions[1] + (this.graticuleDimensions[3] - Math.round((this.bands[i].points[j].value - valueRange[0]) / valuesPerPixel));
        if(0 == j)
        {
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
        } else
        {
          // connect direct
          if(1 == connectionType)
          {
            this.ctx.lineTo(x,y);
          } else
          {
            if(j < switchOverIndex)
            {
              // connect last
              if(2 == connectionType)
              {
                this.ctx.lineTo(previousX, y);
                this.ctx.lineTo(x, y);
              // connect next
              } else if(3 == connectionType)
              {
                this.ctx.lineTo(x, previousY);
                this.ctx.lineTo(x, y);
              }
            } else
            {
              // connect last
              if(2 == connectionType)
              {
                this.ctx.lineTo(x, previousY);
                this.ctx.lineTo(x, y);
              // connext next
              } else if(3 == connectionType)
              {
                this.ctx.lineTo(previousX, y);
                this.ctx.lineTo(x, y);
              }
            }
          }
        }
        previousX = x;
        previousY = y;
      }
      if(0 < this.bands[i].points.length)
      {
        this.ctx.closePath();
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }
  }
  this.drawSeries = function(timeRange, valueRange, timePerPixel, valuesPerPixel)
  {
    for(var i = 0; i < this.series.length; ++i)
    {
      var pointWidth = 2;
      var halfPointWidth = 1;
      /* drawLineTypes:
       *  0 = none,
       *  1 = direct,
       *  2 = last,
       *  3 = next
       */
      var drawLineType = 0;
      var drawDots = true;
      if(this.series[i].styleOptions)
      {
        if(this.series[i].styleOptions.skip)
        {
          continue;
        }
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
          if("none" == this.series[i].styleOptions.connect)
          {
            drawLineType = 0;
          } else {
            if("direct" == this.series[i].styleOptions.connect)
            {
              drawLineType = 1;
            } else if("last" == this.series[i].styleOptions.connect)
            {
              drawLineType = 2;
            } else if("next" == this.series[i].styleOptions.connect)
            {
              drawLineType = 3;
            }
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
        }
        if(!this.series[i].styleOptions.dots)
        {
          drawDots = false;
        }
        if(this.series[i].styleOptions.alpha)
        {
          this.ctx.globalAlpha = this.series[i].styleOptions.alpha;
        }
      }
      halfPointWidth = Math.round(pointWidth / 2);
      
      for(var j = 0,x,y,previousX,previousY; j < this.series[i].points.length; ++j)
      {
        x = this.graticuleDimensions[0] + Math.round((this.series[i].points[j].time - timeRange[0]) / timePerPixel);
        y = this.graticuleDimensions[1] + (this.graticuleDimensions[3] - Math.round((this.series[i].points[j].value - valueRange[0]) / valuesPerPixel));
        if(0 < drawLineType)
        {
          if(0 == j)
          {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
          } else
          {
            // connect direct
            if(1 == drawLineType)
            {
              this.ctx.lineTo(x, y);
            // connect last
            } else if(2 == drawLineType)
            {
              this.ctx.lineTo(previousX,y);
              this.ctx.lineTo(x, y);
            // connect next
            } else if(3 == drawLineType)
            {
              this.ctx.lineTo(x, previousY);
              this.ctx.lineTo(x, y);
            }
          }
        }
        if(drawDots)
        {
          this.ctx.fillRect(x - halfPointWidth, y - halfPointWidth, pointWidth, pointWidth);
        }
        previousX = x;
        previousY = y;
      }
      if(0 < drawLineType)
      {
        this.ctx.stroke();
        this.ctx.closePath();
      }
      // reset ctx style options
      this.ctx.setLineDash([0,0]);
      this.ctx.globalAlpha = 1;
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
  this.getValueAtTime = function(timeAt)
  {
    if("number" !== typeof timeAt || 0 == this.points.length)
    {
      return;
    }
    var middleIndex = undefined;
    var bottomIndex = 0
    var headIndex   = this.points.length - 1;
    while(10 < (headIndex - bottomIndex))
    {
      middleIndex = bottomIndex + Math.floor((headIndex - bottomIndex) / 2);
      if(this.points[middleIndex].time < timeAt)
      {
        bottomIndex = middleIndex;
      } else
      {
        headIndex = middleIndex;
      }
    }
    var i = bottomIndex;
    var closestIndex = bottomIndex;
    var closestDelta = 99999999999999;
    for(; i <= headIndex; ++i)
    {
      var curDelta = Math.abs(this.points[i].time - timeAt);
      if(curDelta < closestDelta)
      {
        closestDelta = curDelta;
        closestIndex = i;
      }
    }
    var closestPointIndex = closestIndex;
    if(this.points[closestPointIndex].time !== timeAt
    && this.styleOptions && this.styleOptions.connect && "none" != this.styleOptions.connect)
    {
      var betterIndex = closestPointIndex;
      if("next" == this.styleOptions.connect)
      {
        --betterIndex;
      } else if ("last" == this.styleOptions.connect)
      {
        ++betterIndex;
      } else if("direct" == this.styleOptions.connect)
      {
        var firstPoint, secondPoint;
        if(timeAt < this.points[betterIndex].time && 0 > betterIndex)
        {
          firstPoint = this.points[betterIndex - 1];
          secondPoint = this.points[betterIndex];
        } else
        {
          firstPoint = this.points[betterIndex];
          secondPoint = this.point[betterIndex + 1]
        }
        var timeDelta = secondPoint.time - firstPoint.time;
        var valueDelta = secondPoint.value - firstPoint.value;
        return firstPoint.value + valueDelta * ((timeAt - firstPoint.time) / timeDelta);
      }
      if(0 > betterIndex)
      {
        betterIndex = 0;
      } else if(betterIndex >= this.points.length)
      {
        betterIndex = this.points.length - 1;
      }
      return this.points[betterIndex].value;
    } else
    {
      return this.points[closestPointIndex].value;
    }
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
  return (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":" + (curDate.getMinutes() < 10 ? "0" : "") + curDate.getMinutes();
}
function dateToHHMMSSStr(curDate)
{
  return (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":" + (curDate.getMinutes() < 10 ? "0" : "") + curDate.getMinutes() + ":" + (curDate.getSeconds() < 10 ? "0" : "") + curDate.getSeconds();
}
