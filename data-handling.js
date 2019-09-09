
function DataCache()
{
  this.metrics = new Array();
  this.processMetricQDatapoints = function(datapointsJSON)
  {
    console.log(datapointsJSON);
    timers.parsing.preprocessingEnded = (new Date()).getTime();
    var distinctMetrics = new Object();
    var metricCountIndex = undefined;
    for(var i = 0; i < datapointsJSON.length; ++i)
    {
      var metric = datapointsJSON[i];
      var metricParts = metric.target.split("/");
      if("count" == metricParts[1])
      {
        metricCountIndex = i;
      } else
      {
        var mySeries = this.getSeries(metric.target);
        if(mySeries)
        {
          mySeries.clear();
          mySeries.styleOptions = defaultSeriesStyling(metric.target);
        } else
        {
          mySeries = mainGraticule.addSeries(metric.target, defaultSeriesStyling(metric.target));
        }
        for(var j = 0; j < metric.datapoints.length; ++j)
        {
          mySeries.addPoint(new Point(metric.datapoints[j][1], metric.datapoints[j][0]), true);
        }
      }
      if("raw" == metricParts[1])
      {
        mainGraticule.clearSeriesesMatchingRegex(new RegExp(metricParts[0].replace(/\\./g, "\\.") + "/(min|max|avg|count)"));
      } else if ("avg" == metricParts[1])
      {
        mainGraticule.clearSeriesesMatchingRegex(new RegExp(metricParts[0].replace(/\\./g, "\\.") + "/(raw)"));
      }
      if(1 < metricParts.length)
      {
        if(undefined === distinctMetrics[metricParts[0]])
        {
          distinctMetrics[metricParts[0]] = new Object();
        }
        if("count" == metricParts[1])
        {
          distinctMetrics[metricParts[0]][metricParts[1]] = true;
        } else
        {
          distinctMetrics[metricParts[0]][metricParts[1]] = mainGraticule.getSeriesIndex(metric.target);
        }
      }
    }
    for(var curMetricBase in distinctMetrics)
    {
      if(undefined !== distinctMetrics[curMetricBase].min && undefined !== distinctMetrics[curMetricBase].max)
      {
        var curBand = mainGraticule.getBand(curMetricBase);
        if(curBand)
        {
          curBand.clear();
          curBand.styleOptions = defaultBandStyling(curMetricBase);
        } else
        {
          curBand = mainGraticule.addBand(curMetricBase, defaultBandStyling(curMetricBase));
        }
  
        var minSeries = mainGraticule.getSeries(distinctMetrics[curMetricBase].min);
        for(var i = 0; i < minSeries.points.length; ++i)
        {
          curBand.addPoint(minSeries.points[i].clone());
        }
        var maxSeries = mainGraticule.getSeries(distinctMetrics[curMetricBase].max);
        for(var i = maxSeries.points.length - 1; i >= 0; --i)
        {
          curBand.addPoint(maxSeries.points[i].clone());
        }
      }
      if(undefined !== distinctMetrics[curMetricBase].count)
      {
        for(var i = 0; i < mainGraticule.series.length; ++i)
        {
          if(mainGraticule.series[i].name.match(new RegExp("^" + curMetricBase + "/([a-zA-Z]+)")))
          {
            if(mainGraticule.series[i].points.length == datapointsJSON[metricCountIndex].datapoints.length)
            {
              for(var j = 0; j < mainGraticule.series[i].points.length && j < datapointsJSON[metricCountIndex].datapoints.length; ++j)
              {
                mainGraticule.series[i].points[j].count = datapointsJSON[metricCountIndex].datapoints[j][0];
              }
            } else
            {
              if(0 < mainGraticule.series[i].points.length)
              {
                console.log("Number of series \"" + mainGraticule.series[i].name + "\" points (" + mainGraticule.series[i].points.length  + ") does not correspond with number of counts (" + datapointsJSON[metricCountIndex].length + ")!");
              }
            }
          }
        }
      }
    }
    timers.parsing.end = (new Date()).getTime();
    timers.drawing = {
      start: (new Date()).getTime(),
      end: 0
    };
    if(doDraw)
    {
      mainGraticule.draw(doResize);
    }
    timers.drawing.end = (new Date()).getTime();
    showTimers();
  }
  this.newSeries = function(metricName, metricAggregate)
  {
    
  }
  this.getMetricCache = function(metricName)
  {
    for(var i = 0; i < this.metrics.length; ++i)
    {
      if(metricName == this.metrics[i].name)
      {
        return this.metrics[i];
      }
    }
    return undefined;
  }
/* 
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
*/
}

function MetricCache(paramMetricName)
{
  this.name = paramMetricName;
  this.series = new Array();
  this.band = undefined;
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
  this.clearSeriesesMatchingRegex = function(matchRegex)
  {
    for(var i = 0; i < this.series.length; ++i)
    {
      if(this.series[i].name.match(matchRegex))
      {
        this.series[i].clear();
      }
    }
  }
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
/*
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
*/
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
  this.getValueAtTimeAndIndex = function(timeAt)
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
        if(this.points[betterIndex].time > timeAt)
        {
          --betterIndex;
        }
      } else if ("last" == this.styleOptions.connect)
      {
        if(this.points[betterIndex].time < timeAt)
        {
          ++betterIndex;
        }
      } else if("direct" == this.styleOptions.connect)
      {
        var firstPoint, secondPoint;
        if((timeAt < this.points[betterIndex].time && 0 > betterIndex) || (betterIndex + 1) >= this.points.length)
        {
          firstPoint = this.points[betterIndex - 1];
          secondPoint = this.points[betterIndex];
        } else
        {
          firstPoint = this.points[betterIndex];
          secondPoint = this.points[betterIndex + 1]
        }
        var timeDelta = secondPoint.time - firstPoint.time;
        var valueDelta = secondPoint.value - firstPoint.value;
        return [firstPoint.value + valueDelta * ((timeAt - firstPoint.time) / timeDelta), betterIndex];
      }
      if(0 > betterIndex)
      {
        betterIndex = 0;
      } else if(betterIndex >= this.points.length)
      {
        betterIndex = this.points.length - 1;
      }
      return [this.points[betterIndex].value, betterIndex];
    } else
    {
      return [this.points[closestPointIndex].value, betterIndex];
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
  this.count = undefined;
  this.clone = function ()
  {
    return new Point(this.time, this.value);
  }
}
