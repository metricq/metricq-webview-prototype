
var masterWrapper;
var ctx;
var canvasDimensions = [window.innerWidth - 100, 500]
var canvasSpaceLeftTop = [45, 40];
var mainGraticule;
var timers = new Object();
var ajaxOpenRequests = new Array();
var ajaxRequestIndex = 1;
var lastStylingChangeTime = 0;
var stylingOptions = {
  band: {
    color: "default",
    alpha: 0.3
  },
  series: {
    color: "default",
    connect: true,
    width: 2,
    lineWidth: 3,
    dots: false,
    alpha: 1
  }
}
function init()
{
  initializeTimeFields();
  initializePlusButton();
  initializeStyleOptions();
  masterWrapper = document.querySelector(".master_wrapper");
  ctx = createChart();
  registerCallbacks();
}
function initializeStyleOptions()
{
  var stylesLinesEle = document.getElementById("style_options_lines");
  stylesLinesEle.value = JSON.stringify(stylingOptions.series).replace(/,/g, ",\n");
  var stylesBandsEle = document.getElementById("style_options_bands");
  stylesBandsEle.value = JSON.stringify(stylingOptions.band).replace(/,/g, ",\n");
  var stylesColorChoosingEle = document.getElementById("style_options_color_choosing");
  var functionSourceFull = determineColorForMetric.toSource();
  var functionSourceSplitted = functionSourceFull.split("\n");
  var functionSourceShortened = "";
  for(var i = 2; i < functionSourceSplitted.length - 1; ++i)
  {
    functionSourceShortened += functionSourceSplitted[i].replace(/^ +/,"") + "\n";
  }
  stylesColorChoosingEle.value = functionSourceShortened;

  stylesLinesEle.addEventListener("keyup", stylingHasChanged);
  stylesBandsEle.addEventListener("keyup", stylingHasChanged);
  stylesColorChoosingEle.addEventListener("keyup", stylingHasChanged);
}
// another watchdog like behaving self calling function using setTimeout()
function stylingHasChanged(evtObj)
{
  var curTime = (new Date()).getTime();
  if(0 == lastStylingChangeTime)
  {
    lastStylingChangeTime = curTime;
    setTimeout(stylingHasChanged, 200);
    return;
  }
  if((curTime - lastStylingChangeTime) >= 200)
  {
    try {
      stylingOptions.series = JSON.parse(document.getElementById("style_options_lines").value);
      stylingOptions.band = JSON.parse(document.getElementById("style_options_bands").value);
      determineColorForMetric = new Function("metricBaseName", document.getElementById("style_options_color_choosing").value);
      document.querySelector(".style_options_wrapper").style.backgroundColor = "rgba(64, 255, 64, 0.5)";
      if(mainGraticule)
      {
        for(var i = 0; i < mainGraticule.series.length; ++i)
        {
          mainGraticule.series[i].styleOptions = defaultSeriesStyling(mainGraticule.series[i].name);
        }
        for(var i = 0; i < mainGraticule.bands.length; ++i)
        {
          mainGraticule.bands[i].styleOptions = defaultBandStyling(mainGraticule.bands[i].name);
        }
        mainGraticule.draw(false);
      }
    } catch(exc)
    {
      console.log("Couldn't parse style Options");
      console.log(exc);
      document.querySelector(".style_options_wrapper").style.backgroundColor = "rgba(255, 64, 64, 0.5)";
    }
  } else
  {
    if(evtObj && evtObj.target)
    {
      lastStylingChangeTime = curTime;
      setTimeout(stylingHasChanged, 200);
    } else
    {
      setTimeout(stylingHasChanged, 20);
    }
    return;
  }
}
function initializeTimeFields()
{
  var curDate = new Date();
  var curDayStr = curDate.getFullYear() + "-" + ((curDate.getMonth() + 1) < 10 ? "0" : "") + (curDate.getMonth() + 1) + "-" + (curDate.getDate() < 10 ? "0" : "") + curDate.getDate();
  document.getElementsByName("metric_from_date")[0].value = curDayStr;
  document.getElementsByName("metric_to_date")[0].value = curDayStr;
  document.getElementsByName("metric_from_date")[0].max = curDayStr;
  document.getElementsByName("metric_to_date")[0].max = curDayStr;
  document.getElementsByName("metric_from_time")[0].value = dateToHHMMStr(new Date(curDate.getTime() - 7200000)) + ":00";
  document.getElementsByName("metric_to_time")[0].value = dateToHHMMStr(curDate) + ":00";
}
function initializePlusButton()
{
  var metricNamesEle = document.querySelector(".metric_names");
  var plusButtonEle = document.createElement("button");
  plusButtonEle.appendChild(document.createTextNode("+"));
  plusButtonEle.setAttribute("class", "plus_button");
  plusButtonEle.addEventListener("click", function() {
    var i;
    var previousElement = undefined;
    var lastElement = undefined;
    for(i = 0; ; ++i)
    {
      previousElement = lastElement;
      lastElement = document.getElementById("metric_name[" + i + "]")
      if( ! lastElement)
      {
        break;
      }
    }
    var metricNamesEle = document.querySelector(".metric_names");
    var plusButtonEle = document.querySelector(".plus_button");
    var fieldDescriptionEle = document.createElement("div");
    fieldDescriptionEle.setAttribute("class", "field_description");
    var labelEle = document.createElement("label");
    labelEle.setAttribute("for", "metric_name[" + i + "]");
    labelEle.appendChild(document.createTextNode("Metrik Name (" + (i + 1) + ")"));
    fieldDescriptionEle.appendChild(labelEle);
    metricNamesEle.insertBefore(fieldDescriptionEle, plusButtonEle);

    var fieldInputsEle = document.createElement("div");
    fieldInputsEle.setAttribute("class", "field_inputs");
    var inputEle = document.createElement("input");
    inputEle.setAttribute("type", "text");
    inputEle.setAttribute("name", "metric_name[" + i + "]");
    inputEle.setAttribute("size", "80");
    inputEle.setAttribute("value", previousElement.value);
    inputEle.setAttribute("id", "metric_name[" + i + "]");
    fieldInputsEle.appendChild(inputEle);
    metricNamesEle.insertBefore(fieldInputsEle, plusButtonEle);
  });
  metricNamesEle.appendChild(plusButtonEle);
}
function registerCallbacks()
{
  mouseDown.registerCallback(function(evtObj) {
    if(mainGraticule && mouseDown.startTarget && "CANVAS" === mouseDown.startTarget.tagName)
    {
      if(mouseDown.previousPos[0] !== mouseDown.currentPos[0]
      || mouseDown.previousPos[1] !== mouseDown.currentPos[1])
      {
        mainGraticule.moveTimeAndValueRanges( (mouseDown.currentPos[0] - mouseDown.previousPos[0]) * -1 * mainGraticule.curTimePerPixel, 0);
        setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 200);
        mainGraticule.draw(false);
      }
    }
  });
  document.getElementsByTagName("canvas")[0].addEventListener("wheel", function(evtObj) {
    if(! evtObj.target || !mainGraticule)
    {
      return;
    }
    evtObj.preventDefault();

    var scrollDirection = evtObj.deltaY;
    /* scale scrollDirection */
    /* if firefox */
    if(-1 < navigator.userAgent.indexOf("Firefox"))
    {
      scrollDirection /= 15.00;
    /* if chrome */
    } else if(-1 < navigator.userAgent.indexOf("Chrome"))
    {
      scrollDirection /= 265.00;
    }
    var curPos = [evtObj.x - evtObj.target.offsetLeft,
                  evtObj.y - evtObj.target.offsetTop];
    var scrollOffset = calculateScrollOffset(evtObj.target);
    curPos[0] += scrollOffset[0];
    curPos[1] += scrollOffset[1];
    var curTimeValue = mainGraticule.getTimeValueAtPoint(curPos);
    mainGraticule.zoomTimeAndValueAtPoint(curTimeValue, scrollDirection, true, false);
    setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 200);
    mainGraticule.draw(false);
  });
}
function updateAllSeriesesBands(lastUpdateTime)
{
  if(mainGraticule.lastRangeChangeTime != lastUpdateTime)
  {
    return;
  }
  var metricFrom = new Date(mainGraticule.curTimeRange[0]);
  var metricTo   = new Date(mainGraticule.curTimeRange[1]);
  var intervalMs = Math.floor((mainGraticule.curTimeRange[1] - mainGraticule.curTimeRange[0]) / 40);
  var distinctMetrics = new Object();
  for(var i = 0; i < mainGraticule.series.length; ++i)
  {
    var curBaseName = "";
    var extension = undefined;
    var curPosOfSlash = mainGraticule.series[i].name.indexOf("/");
    if(-1 < curPosOfSlash)
    {
      curBaseName = mainGraticule.series[i].name.substring(0, curPosOfSlash);
      extension = mainGraticule.series[i].name.substring(curPosOfSlash + 1);
    } else
    {
      curBaseName = mainGraticule.series[i].name;
    }
    if(!distinctMetrics[curBaseName])
    {
      distinctMetrics[curBaseName] = new Object();
    }
    if(extension)
    {
      distinctMetrics[curBaseName][extension] = true;
    }
  }
  for(var i = 0; i < mainGraticule.bands.length; ++i)
  {
    var curBaseName = "";
    var curPosOfSlash = mainGraticule.series[i].name.indexOf("/");
    if(-1 < curPosOfSlash)
    {
      curBaseName = mainGraticule.series[i].name.substring(0, curPosOfSlash);
    }
    if(!distinctMetrics[curBaseName])
    {
      distinctMetrics[curBaseName] = {
        min: true,
        max: true
      };
    } else
    {
      distinctMetrics[curBaseName]["min"] = true;
      distinctMetrics[curBaseName]["max"] = true;
    }
  }
  for(var curMetricBase in distinctMetrics)
  {
    var extensionArr = new Array();
    for(var curExtension in distinctMetrics[curMetricBase])
    {
      extensionArr.push(curExtension);
    }
    var requestMetric = curMetricBase;
    if(0 < extensionArr.length)
    {
      requestMetric += "/(" + extensionArr.join("|") + ")";
    }
    fetchMeasureData(metricFrom, metricTo, calcIntervalMs(metricFrom, metricTo), requestMetric, function(jsonObj) { processMetricQData(jsonObj, false, false); });
  }
  setTimeout(allAjaxCompletedWatchdog, 30);
}
function processMetricQData(datapointsJSON, doDraw, doResize)
{
  console.log(datapointsJSON);
  if(! mainGraticule)
  {
    mainGraticule = new Graticule(ctx, [canvasSpaceLeftTop[0], canvasSpaceLeftTop[1], canvasDimensions[0] - canvasSpaceLeftTop[0], canvasDimensions[1] - canvasSpaceLeftTop[1]], canvasSpaceLeftTop[0], canvasSpaceLeftTop[1]);
  }
  timers.parsing.preprocessingEnded = (new Date()).getTime();
  var distinctMetrics = new Object();
  for(var i = 0; i < datapointsJSON.length; ++i)
  {
    var metric = datapointsJSON[i];
    var mySeries = mainGraticule.getSeries(metric.target);
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
  //clone the options
  var options = JSON.parse(JSON.stringify(stylingOptions.band));
  if("default" === options.color);
  {
    options.color = determineColorForMetric(metricBaseName);
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
  //clone the options
  var options = JSON.parse(JSON.stringify(stylingOptions.series));
  if("default" === options.color)
  {
    options.color = determineColorForMetric(baseName);
  }
  if(metricName.lastIndexOf("avg") == metricName.length - 3 && metricName.length >= 3)
  {
    options.lineDash = [5, 4];
  }
  return options;
}
function determineColorForMetric(metricBaseName)
{
  var rgb = hslToRgb((crc32(metricBaseName) >> 24 & 255) / 255.00, 1, 0.46);
  return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
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
    deltaTime = Math.round(deltaTime * 100) / 100;
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
function calcIntervalMs(metricFrom, metricTo)
{
  var countOfDataPoints = (canvasDimensions[0] - canvasSpaceLeftTop[0]) / parseFloat(document.getElementsByName("metric_request_every_that_many_pixels")[0].value);
  return Math.floor((metricTo.getTime() - metricFrom.getTime()) / countOfDataPoints);
}
function submitMetricName()
{
  var metricFrom = new Date(document.getElementsByName("metric_from_date")[0].value + " " + 
                            document.getElementsByName("metric_from_time")[0].value);
  var metricTo   = new Date(document.getElementsByName("metric_to_date"  )[0].value + " " +
                            document.getElementsByName("metric_to_time"  )[0].value);
  var intervalMs = calcIntervalMs(metricFrom, metricTo);
  for(var i = 0; ; ++i)
  {
    var curMetricNameEles = document.getElementsByName("metric_name[" + i + "]");
    if(0 < curMetricNameEles.length)
    {
      fetchMeasureData(metricFrom, metricTo, intervalMs, curMetricNameEles[0].value, function(jsonObj) { processMetricQData(jsonObj, false, false); });
    } else
    {
      break;
    }
  }
  setTimeout(allAjaxCompletedWatchdog, 30);
}

function fetchMeasureData(timeStart, timeEnd, intervalMs, metricToFetch, callbackFunc)
{
  var from = timeStart.toISOString();
  var to = timeEnd.toISOString();
  var target = metricToFetch;
  var headingEle = document.querySelectorAll(".graticule_heading")[0];
  headingEle.removeChild(headingEle.firstChild);
  headingEle.appendChild(document.createTextNode(target));

  var curRequestId = ajaxRequestIndex ++;
  ajaxOpenRequests.push(curRequestId);
  var req = new XMLHttpRequest();
  req.requestId = curRequestId;
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
          timers.db = { duration: 0 };
          timers.db.duration = jsonObj[0].time_measurements.db * 1000;
        }
      } catch(exc)
      {
        console.log("Database response could not be parsed");
        console.log(exc);
        console.log(obj.target.responseText);
      }
      if(jsonObj)
      {
        callMe(jsonObj);
      }
      for(var i = 0; i < ajaxOpenRequests.length; ++i)
      {
        if(obj.target.requestId == ajaxOpenRequests[i])
        {
          ajaxOpenRequests.splice(i, 1);
          break;
        }
      }
    }
  };}(callbackFunc);
  timers.ajax = {
    presend: (new Date()).getTime()
  };
  req.send("{\n  \"range\":{  \n    \"from\":\"" + from + "\",\n    \"to\":\"" + to + "\"\n  },\n  \"intervalMs\":" + intervalMs + ",\n  \"targets\":[  \n    {  \n      \"target\":\"" + target + "\"\n    }\n  ]\n}");
}
function allAjaxCompletedWatchdog()
{
  if(0 == ajaxOpenRequests.length)
  {
    if(mainGraticule)
    {
      var needSetTimeRange = !mainGraticule.curTimeRange;
      mainGraticule.automaticallyDetermineRanges(needSetTimeRange, true);
      mainGraticule.draw(false);
    }
  } else
  {
    setTimeout(allAjaxCompletedWatchdog, 15);
  }
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
