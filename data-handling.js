
function DataCache()
{
  this.metrics = new Array();
  this.processMetricQDatapoints = function(datapointsJSON, doDraw, doResize)
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
        this.newSeries(metricParts[0], metricParts[1]).parseDatapoints(metric.datapoints);
      }
      if("raw" == metricParts[1])
      {
        this.getMetricCache(metricParts[0]).clearNonRawAggregates();
      } else if ("avg" == metricParts[1])
      {
        this.getMetricCache(metricParts[0]).clearRawAggregate();
      }
      if(undefined === distinctMetrics[metricParts[0]])
      {
        distinctMetrics[metricParts[0]] = this.getMetricCache(metricParts[0]);
      }
    }
    
    for(var curMetricBase in distinctMetrics)
    {
      distinctMetrics[curMetricBase].generateBand();
      if(undefined !== metricCountIndex)
      {
        distinctMetrics[curMetricBase].parseCountDatapoints(datapointsJSON[metricCountIndex]);
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
    var relatedMetric = this.assureMetricExists(metricName);
    if(relatedMetric.series[metricAggregate])
    {
      relatedMetric.series[metricAggregate].clear();
      return relatedMetric.series[metricAggregate];
    } else
    {
      var newSeries = new Series(metricAggregate, defaultSeriesStyling(metricName, metricAggregate));
      relatedMetric.series[metricAggregate] = newSeries;
      return newSeries;
    }
  }
  this.newBand = function(metricName)
  {
    var foundMetric = this.getMetricCache(metricName);
    if(foundMetric)
    {
      foundMetric.generateBand();
      return foundMetric.band;
    } else
    {
      return undefined;
    }
  }
  this.assureMetricExists = function(metricName)
  {
    var foundMetric = this.getMetricCache(metricName);
    if(foundMetric)
    {
      return foundMetric;
    } else
    {
      var newMetric = new MetricCache(metricName);
      this.metrics.push(newMetric);
      return newMetric;
    }
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
  this.getTimeRange = function()
  {
    var min = undefined,
        max = undefined;
    for(var i = 0; i < this.metrics.length; ++i)
    {
      for(var curAggregate in this.metrics[i].series)
      {
        if(this.metrics[i].series[curAggregate])
        {
          var curTimeRange = this.metrics[i].series[curAggregate].getTimeRange();
          if(undefined === min)
          {
            min = curTimeRange[0];
            max = curTimeRange[1];
          } else
          {
            if(min > curTimeRange[0])
            {
              min = curTimeRange[0];
            }
            if(max < curTimeRange[1])
            {
              max = curTimeRange[1];
            }
          }
        }
      }
    }
    return [min, max];
  }
  this.getValueRange = function()
  {
    var min = undefined,
        max = undefined;
    for(var i = 0; i < this.metrics.length; ++i)
    {
      for(var curAggregate in this.metrics[i].series)
      {
        if(this.metrics[i].series[curAggregate])
        {
          var curTimeRange = this.metrics[i].series[curAggregate].getValueRange();
          if(undefined === min)
          {
            min = curTimeRange[0];
            max = curTimeRange[1];
          } else
          {
            if(min > curTimeRange[0])
            {
              min = curTimeRange[0];
            }
            if(max < curTimeRange[1])
            {
              max = curTimeRange[1];
            }
          }
        }
      }
    }
    return [min, max];
  }
  this.hasSeriesToPlot = function()
  {
    for(var i = 0; i < this.metrics.length; ++i)
    {
      for(var curAggregate in this.metrics[i].series)
      {
        if(this.metrics[i].series[curAggregate] && 0 < this.metrics[i].series[curAggregate].points.length)
        {
          return true;
        }
      }
    }
    return false;
  }
  this.hasBandToPlot = function()
  {
    for(var i = 0; i < this.metrics.length; ++i)
    {
      if(this.metrics[i].band && 0 < this.metrics[i].band.points.length)
      {
        return true;
      }
    }
    return false;
  }
  this.updateStyling = function()
  {
    for(var i = 0; i < this.metrics.length; ++i)
    {
      for(var curAggregate in this.metrics[i].series)
      {
        if(this.metrics[i].series[curAggregate])
        {
          this.metrics[i].series[curAggregate].styleOptions = defaultSeriesStyling(this.metrics[i].name, curAggregate);
        }
      }
      this.metrics[i].band = defaultBandStyling(this.metrics[i].name);
    }
  }
  this.getAllValuesAtTime = function(timeAt)
  {
    var valueArr = new Array();
    for(var i = 0; i < this.metrics.length; ++i)
    {
      for(var curAggregate in this.metrics[i].series)
      {
        if(this.metrics[i].series[curAggregate] && 0 < this.metrics[i].series[curAggregate].points.length)
        {
          var result = this.metrics[i].series[curAggregate].getValueAtTimeAndIndex(timeAt);
          if(result)
          {
            valueArr.push([
              result[0],
              this.metrics[i].name,
              curAggregate
            ]);
          }
        }
      }
    }
    return valueArr;
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
  this.series = {"min": undefined,
                 "max": undefined,
                 "avg": undefined,
                 "raw": undefined};
  this.band = undefined;
  this.resetData = function()
  {
    delete this.series;
    delete this.bands;
    this.series = new Array();
    this.bands = new Array();
  }
  this.clearNonRawAggregates = function()
  {
    for(var curAggregate in this.series)
    {
      if("raw" != curAggregate && this.series[curAggregate])
      {
        this.series[curAggregate].clear();
      }
    }
    if(this.band)
    {
      this.band.clear();
    }
  }
  this.clearRawAggregate = function()
  {
    if(this.series["raw"])
    {
      this.series["raw"].clear();
    }
  }
  this.generateBand = function()
  {
    if(this.band)
    {
      this.band.clear();
    } else
    {
      this.band = new Band(defaultBandStyling(this.name));
    }
    if(this.series["min"] && this.series["max"])
    {
      var minSeries = this.series["min"];
      for(var i = 0; i < minSeries.points.length; ++i)
      {
        this.band.addPoint(minSeries.points[i].clone());
      }
      this.band.switchOverIndex = this.band.points.length;
      var maxSeries = this.series["max"];
      for(var i = maxSeries.points.length - 1; i >= 0; --i)
      {
        this.band.addPoint(maxSeries.points[i].clone());
      }
      return this.band;
    } else
    {
      return undefined;
    }
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
  this.parseCountDatapoints = function(countDatapoints)
  {
    for(var curAggregate in this.series)
    {
      var curSeries = this.series[curAggregate];
      if(curSeries && 0 < curSeries.points.length)
      {
        if(curSeries.points.length == countDatapoints.length)
        {
          for(var j = 0; j < curSeries.points.length && j < countDatapoints.length; ++j)
          {
            curSeries.points[j].count = countDatapoints[j][0];
          }
        }
      }
    }
  }
/*
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
*/
}


function Band(paramStyleOptions)
{
  this.points = new Array();
  this.styleOptions = paramStyleOptions;
  this.switchOverIndex = 0;
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
function Series(paramAggregate, paramStyleOptions)
{
  this.points = new Array();
  this.aggregate = paramAggregate;
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
  this.parseDatapoints = function(metricDatapoints)
  {
    for(var i = 0; i < metricDatapoints.length; ++i)
    {
      this.addPoint(new Point(metricDatapoints[i][1], metricDatapoints[i][0]), true);
    }
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
