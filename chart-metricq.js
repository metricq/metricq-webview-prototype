
var masterWrapper;
var ctx;
var canvasDimensions = [800, 500]
var mainGraticule;
var timers = new Object();
function init()
{
  var curDate = new Date();
  var curDayStr = curDate.getFullYear() + "-" + ((curDate.getMonth() + 1) < 10 ? "0" : "") + (curDate.getMonth() + 1) + "-" + (curDate.getDate() < 10 ? "0" : "") + curDate.getDate();
  document.getElementsByName("metric_from_date")[0].value = curDayStr;
  document.getElementsByName("metric_to_date")[0].value = curDayStr;
  document.getElementsByName("metric_from_date")[0].max = curDayStr;
  document.getElementsByName("metric_to_date")[0].max = curDayStr;
  document.getElementsByName("metric_from_time")[0].value = dateToHHMMStr(new Date(curDate.getTime() - 7200000)) + ":00";
  document.getElementsByName("metric_to_time")[0].value = dateToHHMMStr(curDate) + ":00";
  masterWrapper = document.querySelector(".master_wrapper");
  ctx = createChart();
  mouseDown.registerCallback(function(evtObj) {
    if(mouseDown.startTarget && "CANVAS" === mouseDown.startTarget.tagName)
    {
      if(mouseDown.previousPos[0] !== mouseDown.currentPos[0]
      || mouseDown.previousPos[1] !== mouseDown.currentPos[1])
      {
        mainGraticule.moveTimeAndValueRanges( (mouseDown.currentPos[0] - mouseDown.previousPos[0]) * -1 * mainGraticule.curTimePerPixel, 0);
        mainGraticule.draw(false);
      }
    }
  });
  document.getElementsByTagName("canvas")[0].addEventListener("wheel", function(evtObj) {
    if(! evtObj.target)
    {
      return;
    }
    evtObj.preventDefault();

    var scrollDirection = evtObj.deltaY / 15.00;
    var curPos = [evtObj.x - evtObj.target.offsetLeft,
                  evtObj.y - evtObj.target.offsetTop];
    var scrollOffset = calculateScrollOffset(evtObj.target);
    curPos[0] += scrollOffset[0];
    curPos[1] += scrollOffset[1];
    var curTimeValue = mainGraticule.getTimeValueAtPoint(curPos);
    mainGraticule.zoomTimeAndValueAtPoint(curTimeValue, scrollDirection, true, false);
    mainGraticule.draw(false);
  });
}
function processMetricQData(datapointsJSON)
{
  console.log(datapointsJSON);
  if(! mainGraticule)
  {
    mainGraticule = new Graticule(ctx, [45, 40, canvasDimensions[0] - 45, canvasDimensions[1] - 40], 45, 40);
  }
  timers.parsing.preprocessingEnded = (new Date()).getTime();
  var distinctMetrics = new Object();
  for(var i = 0; i < datapointsJSON.length; ++i)
  {
    var metric = datapointsJSON[i];
    var mySeries = mainGraticule.getSeries(metric.target);
    if(!mySeries)
    {
      mySeries = mainGraticule.addSeries(metric.target, defaultSeriesStyling(metric.target));
    } else
    {
      mySeries.clear();
    }
    for(var j = 0; j < metric.datapoints.length; ++j)
    {
      mySeries.addPoint(new Point(metric.datapoints[j][1], metric.datapoints[j][0]), true);
    }
    var metricParts = metric.target.split("/");
    if(1 < metricParts.length)
    {
      if(undefined === distinctMetrics[metricParts[0]])
      {
        distinctMetrics[metricParts[0]] = new Object();
      }
      distinctMetrics[metricParts[0]][metricParts[1]] = mainGraticule.getSeriesIndex(metric.target);
    }
  }
  for(var curMetricBase in distinctMetrics)
  {
    if(undefined !== distinctMetrics[curMetricBase].min && undefined !== distinctMetrics[curMetricBase].max)
    {
      var curBand = mainGraticule.addBand(curMetricBase, defaultBandStyling(curMetricBase));
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
  }
  timers.parsing.end = (new Date()).getTime();
  timers.drawing = {
    start: (new Date()).getTime(),
    end: 0
  };
  mainGraticule.draw(true);
  timers.drawing.end = (new Date()).getTime();
  showTimers();
}
function intEightBitsToHex(eightBitNumber)
{
  var hexArr = ['0', '1', '2', '3',
                '4', '5', '6', '7',
                '8', '9', 'A', 'B',
                'C', 'D', 'E', 'F'];
  return hexArr[((eightBitNumber & 240) >> 4)] + hexArr[eightBitNumber & 15];
}
var i8h = intEightBitsToHex;
function int32BitsToHex(thirtytwoBitNumber)
{
  return i8h((thirtytwoBitNumber >> 16) & 255) + i8h((thirtytwoBitNumber >> 8) & 255) + i8h(thirtytwoBitNumber & 255);
}
function defaultBandStyling(metricBaseName)
{
  var hash = crc32(metricBaseName);
  var options = {
    color: "rgba(" + ((hash >> 16) & 255)  + ","  + ((hash >> 8) & 255) + "," + (hash & 255) +  ", 0.3)"
  }
  return options;
}
function defaultSeriesStyling(metricName)
{
  var baseName = metricName;
  if(-1 < metricName.indexOf("/"))
  {
    baseName = metricName.substring(0, metricName.indexOf("/"));
  }
  var options = {
    color: "#" + int32BitsToHex(crc32(baseName)),
    connect: true,
    width: 2,
    lineWidth: 3
  };
/*
  if(metricName.lastIndexOf("min") == metricName.length - 3 && metricName.length >= 3)
  {
    options.color = "#00ff00";
  } else if(metricName.lastIndexOf("avg") == metricName.length - 3 && metricName.length >= 3)
  {
    options.color = "#d0d000";
  }
*/
  return options;
}

function showTimers()
{
  var deltaTime = 0;
  var timingsString = "";
  deltaTime = timers.ajax.done - timers.ajax.presend;
  timingsString += "Ajax " + deltaTime + " ms";
  if(timers.db)
  {
    deltaTime = timers.db.duration;
    timingsString += ", DB " + deltaTime + " ms";
  }
  deltaTime = timers.parsing.end - timers.parsing.start;
  timingsString += ", Parsing " + deltaTime + " ms";
  deltaTime = timers.drawing.end - timers.drawing.start;
  timingsString += ", Drawing " + deltaTime + " ms";

  var timingsEle = document.querySelectorAll(".timings_text")[0];
  timingsEle.removeChild(timingsEle.firstChild);
  timingsEle.appendChild(document.createTextNode(timingsString));
}

function createChart()
{
  var wrapperEle = document.createElement("div");
  wrapperEle.style.float = "left";
  wrapperEle.style.marginRight = 10;
  var canvasSize = canvasDimensions;
  var pixelsLeft = 60, pixelsBottom = 30;
  wrapperEle.style.width = canvasSize[0] + pixelsLeft;
  wrapperEle.style.height = canvasSize[1] + 80;
  var headingEle = document.createElement("div");
  headingEle.appendChild(document.createTextNode("no heading"));
  headingEle.setAttribute("class", "graticule_heading");
  var canvasEle = document.createElement("canvas");
  canvasEle.width = canvasSize[0] + pixelsLeft;
  canvasEle.height = canvasSize[1] + pixelsBottom;
  var timingsEle = document.createElement("div");
  timingsEle.setAttribute("class", "timings_text");
  timingsEle.appendChild(document.createTextNode("Zeiterfassung..."));

  wrapperEle.appendChild(headingEle);
  wrapperEle.appendChild(canvasEle);
  wrapperEle.appendChild(timingsEle);
  masterWrapper.appendChild(wrapperEle);
  return canvasEle.getContext("2d");
}
function submitMetricName()
{
  var metricFrom = document.getElementsByName("metric_from_date")[0].value + " " + 
                   document.getElementsByName("metric_from_time")[0].value;
  var metricTo   = document.getElementsByName("metric_to_date"  )[0].value + " " +
                   document.getElementsByName("metric_to_time"  )[0].value;
  var metricName = document.getElementsByName("metric_name")[0].value;
  var intervalMs = parseInt(document.getElementsByName("metric_interval_ms")[0].value);
  fetchMeasureData(new Date(metricFrom), new Date(metricTo), intervalMs, metricName, processMetricQData);
}

function fetchMeasureData(timeStart, timeEnd, intervalMs, metricToFetch, callbackFunc)
{
  var from = timeStart.toISOString();
  var to = timeEnd.toISOString();
  var target = metricToFetch;
  var headingEle = document.querySelectorAll(".graticule_heading")[0];
  headingEle.removeChild(headingEle.firstChild);
  headingEle.appendChild(document.createTextNode(target));
  var req = new XMLHttpRequest();
  req.open("POST", "proxy.php", true);
  req.onreadystatechange = function (callMe) { return function(obj) {
    if(1 == obj.target.readyState)
    {
      timers.ajax.opened = (new Date()).getTime();
    }
    if(4 == obj.target.readyState)
    {
      timers.ajax.done = (new Date()).getTime();
      var jsonObj;
      timers.parsing = {
        start: (new Date()).getTime()
      };
      try
      {
        jsonObj = JSON.parse(obj.target.responseText);
        if(jsonObj && jsonObj[0].time_measurements.db)
        {
          timers.db.duration = jsobObj[0].time_measurements.db * 1000;
        }
      } catch(exc) {}
      if(jsonObj)
      {
        callMe(jsonObj);
      }
    }
  };}(callbackFunc);
  timers.ajax = {
    presend: (new Date()).getTime()
  };
  req.send("{\n  \"range\":{  \n    \"from\":\"" + from + "\",\n    \"to\":\"" + to + "\"\n  },\n  \"intervalMs\":" + intervalMs + ",\n  \"targets\":[  \n    {  \n      \"target\":\"" + target + "\"\n    }\n  ]\n}");
}
/* figure out scroll offset */
function calculateScrollOffset(curLevelElement)
{
  var scrollOffset = [0, 0];
  if(curLevelElement.parentNode && "HTML" !== curLevelElement.tagName)
  {
    var scrollOffset = calculateScrollOffset(curLevelElement.parentNode);
  }
  scrollOffset[0] += curLevelElement.scrollLeft;
  scrollOffset[1] += curLevelElement.scrollTop;
  return scrollOffset;
}
var mouseDown = {
  startPos: undefined,
  currentPos: undefined,
  previousPos: undefined,
  endPos: undefined,
  duration: 0,
  isDown: false,
  startTime: 0,
  endTime: 0,
  startTarget: undefined,
  endTarget: undefined,
  dragDropCallbacks: new Array(),
  calcRelativePos: function(evtObj)
  {
    var curPos = [
      evtObj.x,
      evtObj.y
    ];
    if(mouseDown.startTarget)
    {
      curPos[0] -= mouseDown.startTarget.offsetLeft;
      curPos[1] -= mouseDown.startTarget.offsetTop;

      var scrollOffset = calculateScrollOffset(mouseDown.startTarget);
      curPos[0] += scrollOffset[0];
      curPos[1] += scrollOffset[1];
    }
    return curPos;
  },
  startClick: function(evtObj)
  {
    mouseDown.startTarget = evtObj.target;
    mouseDown.endTarget = undefined;
    mouseDown.endTime = 0;
    mouseDown.duration = 0;
    mouseDown.startTime = evtObj.timestamp;
    var curPos = mouseDown.calcRelativePos(evtObj);
    mouseDown.startPos = [ curPos[0], curPos[1]];
    mouseDown.currentPos = [ curPos[0], curPos[1]];
    mouseDown.previousPos = [ curPos[0], curPos[1]];
    mouseDown.isDown = true;
  },
  moving: function(evtObj)
  {
    if(true === mouseDown.isDown)
    {
      mouseDown.previousPos = mouseDown.currentPos;
      mouseDown.currentPos = mouseDown.calcRelativePos(evtObj);
      for(var i = 0; i < mouseDown.dragDropCallbacks.length; ++i)
      {
        mouseDown.dragDropCallbacks[i](evtObj);
      }
    }
  },
  endClick: function(evtObj)
  {
    mouseDown.endPos = mouseDown.calcRelativePos(evtObj);
    mouseDown.endTime = evtObj.timestamp;
    mouseDown.duration = mouseDown.endTime - mouseDown.startTime;
    mouseDown.endTarget = evtObj.target;
    mouseDown.isDown = false;
  },
  registerCallback: function(callbackFunc)
  {
    mouseDown.dragDropCallbacks.push(callbackFunc);
  }
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("mousedown", mouseDown.startClick);
document.addEventListener("mousemove", mouseDown.moving);
document.addEventListener("mouseup", mouseDown.endClick);
