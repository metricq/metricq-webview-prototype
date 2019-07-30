
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
  list: [
    {
      nameRegex: "series:[^/]+/avg",
      title: "AVG Series",
      skip: false,
      color: "default",
      connect: "last",
      width: 8,
      lineWidth: 2,
      lineDash: [5, 4],
      dots: false,
      alpha: 0.8
    },
    {
      nameRegex: "series:[^/]+/(min|max)",
      title: "Min/Max Series",
      skip: true,
      color: "default",
      connect: "last",
      width: 2,
      lineWidth: 2,
      dots: false,
      alpha: 1
    },
    {
      nameRegex: "band:.*",
      title: "All Bands",
      connect: "last", 
      color: "default",
      alpha: 0.3
    }
  ]
}
var stylingTabs = undefined;
function init()
{
  setTimeFields(new Date((new Date()).getTime() - 7200000), new Date());
  initializeStyleOptions();
  masterWrapper = document.querySelector(".master_wrapper");
  ctx = createChart();
  registerCallbacks();
  initializeMetricNames();
}
function initializeMetricNames()
{
  var presetsEle = document.getElementById("metric_preset_selection");
  for(var curPreset in metricPresets)
  {
    var curOption = document.createElement("option");
    curOption.value = curPreset;
    curOption.appendChild(document.createTextNode(curPreset));
    presetsEle.appendChild(curOption);
  }
  presetsEle.addEventListener("change", function(evtObj) {
    var curPreset = evtObj.target.value;
    removeAllChilds(document.querySelector(".metric_names"));
    for(var i = 0; i < metricPresets[curPreset].length; ++i)
    {
      addMetricNameField(metricPresets[curPreset][i]);
    }
    initializePlusButton();
  });
  var wrapperEle = document.querySelector(".metric_names");
  addMetricNameField();
  initializePlusButton();
}
function removeAllChilds(parentEle)
{
  for(var i = parentEle.childNodes.length - 1; i >= 0; --i)
  {
    parentEle.removeChild(parentEle.childNodes[i]);
  }
}
function initializeStyleOptions()
{
  stylingTabs = new Tabbing(document.querySelector(".style_options_wrapper"));
  var curTab, textareaEle;
  for(var i = 0; i < stylingOptions.list.length; ++i)
  {
    var curTitle = stylingOptions.list[i].title;
    if(!curTitle)
    {
      curTitle = "Styling #" + (i + 1);
    }
    curTab = stylingTabs.addTab(curTitle);
    textareaEle = document.createElement("textarea");
    textareaEle.setAttribute("rows", "13");
    textareaEle.setAttribute("cols", "60");
    textareaEle.setAttribute("class", "style_options_list_styles");
    textareaEle.value = formatJson(JSON.stringify(stylingOptions.list[i]));
    textareaEle.addEventListener("keyup", stylingHasChanged);
    curTab.appendChild(textareaEle);
  }

  curTab = stylingTabs.addTab("determineColorForMetric(metricBaseName)");
  textareaEle = document.createElement("textarea");
  textareaEle.setAttribute("rows", "13");
  textareaEle.setAttribute("cols", "80");
  textareaEle.setAttribute("id", "style_options_color_choosing");
  var functionSourceFull = determineColorForMetric.toString();
  var functionSourceSplitted = functionSourceFull.split("\n");
  var functionSourceShortened = "";
  for(var i = 2; i < functionSourceSplitted.length - 1; ++i)
  {
    functionSourceShortened += functionSourceSplitted[i].replace(/^ +/,"") + "\n";
  }
  textareaEle.value = functionSourceShortened;
  textareaEle.addEventListener("keyup", stylingHasChanged);
  curTab.appendChild(textareaEle);
}
function formatJson(unformattedJson)
{
  var inString = false;
  var inEscape = false;
  var depth = 0;
  var outStr = "";
  for(var i = 0, c =""; i < unformattedJson.length; ++i)
  {
    c = unformattedJson.charAt(i);
    if(inString)
    {
      if(inEscape)
      {
        outStr += "\\" + c;
        inEscape = false;
      } else
      {
        if("\\" == c)
        {
          inEscape = true;
        } else
        {
          if("\"" == c)
          {
            inString = false;
          }
          outStr += c;
        }
      }
    // else, not in string
    } else {
      switch(c)
      {
        case "\"":
          inString = true;
          outStr += c;
          break;
        case ":":
          outStr += c;
          outStr += " ";
          break;
        case ",":
          outStr += c;
          outStr += "\n";
          outStr += repeatString("  ", depth);
          break;
        case "{": /* fall-through */
        case "[":
          ++depth;
          outStr += c;
          outStr += "\n";
          outStr += repeatString("  ", depth);
          break;
        case "}": /* fall-through */
        case "]":
          --depth;
          outStr += "\n";
          outStr += repeatString("  ", depth);
          outStr += c;
          break;
        default:
          outStr += c;
          break;
      }
    }
  }
  return outStr;
}
function repeatString(baseStr, repetitions)
{
  var outStr = "";
  for(var i = 0; i < repetitions; ++i)
  {
    outStr += baseStr;
  }
  return outStr;
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
    var lastParsedTextarea = undefined;
    try {
      var listStyleTextareas = document.querySelectorAll(".style_options_list_styles");
      for(var i = 0; i < listStyleTextareas.length; ++i)
      {
        lastParsedTextarea = listStyleTextareas[i];
        stylingOptions.list[i] = JSON.parse(lastParsedTextarea.value);
      }
      lastParsedTextarea = document.getElementById("style_options_color_choosing");
      determineColorForMetric = new Function("metricBaseName", lastParsedTextarea.value);
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
      document.querySelector(".style_options_wrapper").style.backgroundColor = "rgba(64, 255, 64, 0.5)";
    } catch(exc)
    {
      console.log("Couldn't parse style Options");
      handleStylingTextareaError(exc, lastParsedTextarea);
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
function handleStylingTextareaError(exc, lastParsedTextarea)
{
  var errorAt = exc.message.match(/ at line ([0-9]+) column ([0-9]+) /);
  if(errorAt)
  {
    putErrorMarkerAt(lastParsedTextarea, errorAt[1], errorAt[2]);
  } else
  {
    errorAt = exc.message.match(/in JSON at position ([0-9]+)/);
    if(errorAt)
    {
      var positionAt = parseInt(errorAt[1]);
      var lineAt = 0;
      var columnAt = 0;
      for(var i = 0; i < positionAt; ++i)
      {
        if("\n" == lastParsedTextarea.value.charAt(i))
        {
          ++lineAt;
          columnAt = 0;
        } else
        {
          ++columnAt;
        }
      }
      putErrorMarkerAt(lastParsedTextarea, lineAt, columnAt);
    }
  }
}
function putErrorMarkerAt(textareaErrorHappened, lineAt, columnAt)
{
  var x = textareaErrorHappened.parentNode.parentNode.parentNode.offsetLeft + columnAt * 6;
  var y = textareaErrorHappened.offsetTop + lineAt * 16;
  var arrowEle = document.createElement("div");
  arrowEle.style.position = "absolute";
  arrowEle.style.fontSize = "24pt";
  arrowEle.style.left = x;
  arrowEle.style.top = y;
  arrowEle.style.transform = "rotate(270deg)";
  arrowEle.appendChild(document.createTextNode("➜"));
  document.getElementsByTagName("body")[0].appendChild(arrowEle);
  arrowEle.animate([{ top: (y + 70) + "px",
                      opacity: 0.1 },
                    { top: y + "px",
                      opacity: 1 }],
                   {
                     duration: 700,
                     direction: 'alternate',
                     iterations: Infinity,
                     fill: 'forwards',
                     easing: 'ease'
                   });
  setTimeout(function(ele) { return function() { ele.parentNode.removeChild(ele);}; }(arrowEle), 2800);
}
function setTimeFields(timeFrom, timeTo)
{
  var curDate = new Date();
  document.getElementsByName("metric_from_date")[0].value = buildIso8601Date(timeFrom);
  document.getElementsByName("metric_to_date")[0].value = buildIso8601Date(timeTo);
  document.getElementsByName("metric_from_date")[0].max = buildIso8601Date(curDate);
  document.getElementsByName("metric_to_date")[0].max = buildIso8601Date(curDate);
  document.getElementsByName("metric_from_time")[0].value = dateToHHMMSSStr(timeFrom);
  document.getElementsByName("metric_to_time")[0].value = dateToHHMMSSStr(timeTo);
}
function buildIso8601Date(dateObj)
{
  return dateObj.getFullYear() + "-" + ((dateObj.getMonth() + 1) < 10 ? "0" : "") + (dateObj.getMonth() + 1) + "-" + (dateObj.getDate() < 10 ? "0" : "") + dateObj.getDate();
}
function initializePlusButton()
{
  var metricNamesEle = document.querySelector(".metric_names");
  var plusButtonEle = document.createElement("button");
  plusButtonEle.appendChild(document.createTextNode("+"));
  plusButtonEle.setAttribute("class", "plus_button");
  plusButtonEle.addEventListener("click", addMetricNameField);
  metricNamesEle.appendChild(plusButtonEle);
}
function addMetricNameField(predefinedValue)
{
  var i;
  var lastElement = undefined;
  var previousElement = undefined;
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
  inputEle.setAttribute("size", "60");
  if(predefinedValue)
  {
    inputEle.setAttribute("value", predefinedValue);
  } else if(previousElement)
  {
    inputEle.setAttribute("value", previousElement.value);
  }
  inputEle.setAttribute("id", "metric_name[" + i + "]");
  fieldInputsEle.appendChild(inputEle);
  metricNamesEle.insertBefore(fieldInputsEle, plusButtonEle);
}
function registerCallbacks()
{
  mouseDown.registerDragCallback(function(evtObj) {
    if(mainGraticule && mouseDown.startTarget && "CANVAS" === mouseDown.startTarget.tagName)
    {
      if(mouseDown.previousPos[0] !== mouseDown.currentPos[0]
      || mouseDown.previousPos[1] !== mouseDown.currentPos[1])
      {
        if(keyDown.is(16))
        {
          mainGraticule.draw(false);
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          var minXPos = mouseDown.currentPos[0];
          if(mouseDown.startPos[0] < minXPos)
          {
            minXPos = mouseDown.startPos[0];
          }
          var maxXPos = mouseDown.currentPos[0];
          if(mouseDown.startPos[0] > maxXPos)
          {
            maxXPos = mouseDown.startPos[0];
          }
          ctx.fillRect(minXPos, mainGraticule.graticuleDimensions[1], maxXPos - minXPos, mainGraticule.graticuleDimensions[3]);
        } else
        {
          mainGraticule.moveTimeAndValueRanges( (mouseDown.currentPos[0] - mouseDown.previousPos[0]) * -1 * mainGraticule.curTimePerPixel, 0);
          setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 150);
          mainGraticule.draw(false);
        }
      }
    }
  });
  mouseDown.registerDropCallback(function(evtObj) {
    if(keyDown.is(16) && mainGraticule && mouseDown.startTarget && "CANVAS" === mouseDown.startTarget.tagName)
    {
      var posEnd   = mainGraticule.getTimeValueAtPoint( mouseDown.relativeStartPos );
      var posStart = mainGraticule.getTimeValueAtPoint( calculateActualMousePos(evtObj));
      if(!posEnd || !posStart)
      {
        return;
      }
      if(posEnd[0] < posStart[0])
      {
        var swap = posEnd;
        posEnd = posStart;
        posStart = swap;
      }
      mainGraticule.setTimeRange([posStart[0], posEnd[0]]);
      setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 200);
      mainGraticule.draw(false);
    }
  });
  mouseDown.registerMoveCallback(function(evtObj) {
    if(keyDown.is(17) && mainGraticule && "CANVAS" === evtObj.target.tagName)
    {
      var curPosOnCanvas = calculateActualMousePos(evtObj);
      var curPoint = mainGraticule.getTimeValueAtPoint(curPosOnCanvas);
      if(!curPoint)
      {
        return;
      }
      mainGraticule.draw(false);
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(curPosOnCanvas[0] - 1, mainGraticule.graticuleDimensions[1], 2, mainGraticule.graticuleDimensions[3]);
      ctx.font = "14px Sans";
      for(var i = 0; i < mainGraticule.series.length; ++i)
      {
        var curTextLine = (new Number(mainGraticule.series[i].getValueAtTime(curPoint[0]))).toFixed(3) + " " + mainGraticule.series[i].name;
        var textWidth = ctx.measureText(curTextLine).width;
        ctx.fillStyle = determineColorForMetric(mainGraticule.series[i].name.split("/")[0]);
        ctx.globalAlpha = 0.4;
        ctx.fillRect(curPosOnCanvas[0] + 10, curPosOnCanvas[1] + i * 20 - 15, textWidth, 20)
        ctx.fillStyle = "#000000";
        ctx.globalAlpha = 1;
        ctx.fillText(curTextLine, curPosOnCanvas[0] + 10, curPosOnCanvas[1] + i * 20);
      }
    }
  });
  document.getElementsByTagName("canvas")[0].addEventListener("wheel", function(evtObj) {
    if(! evtObj.target || !mainGraticule)
    {
      return;
    }
    evtObj.preventDefault();
    if(evtObj.deltaX) // horizontal scrolling
    {
      var deltaRange = mainGraticule.curTimeRange[1] - mainGraticule.curTimeRange[0];
      if(0 > evtObj.deltaX)
      {
        mainGraticule.setTimeRange([mainGraticule.curTimeRange[0] - deltaRange * 0.2, mainGraticule.curTimeRange[1] - deltaRange * 0.2]);
      } else if(0 < evtObj.deltaX)
      {
        mainGraticule.setTimeRange([mainGraticule.curTimeRange[0] + deltaRange * 0.2, mainGraticule.curTimeRange[1] + deltaRange * 0.2]);
      }
      setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 200);
      mainGraticule.draw(false);
    } else // vertical scrolling
    {
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
      var curPos = calculateActualMousePos(evtObj);
      var curTimeValue = mainGraticule.getTimeValueAtPoint(curPos);
      if(curTimeValue)
      {
        mainGraticule.zoomTimeAndValueAtPoint(curTimeValue, scrollDirection, true, false);
        setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 150);
        mainGraticule.draw(false);
      }
    }
  });
}
function calculateActualMousePos(evtObj)
{
  var curPos = [evtObj.x - evtObj.target.offsetLeft,
                evtObj.y - evtObj.target.offsetTop];
  var scrollOffset = calculateScrollOffset(evtObj.target);
  curPos[0] += scrollOffset[0];
  curPos[1] += scrollOffset[1];
  return curPos;
}
function updateAllSeriesesBands(lastUpdateTime)
{
  if(mainGraticule.lastRangeChangeTime != lastUpdateTime)
  {
    return;
  }
  var metricFrom = new Date(mainGraticule.curTimeRange[0]);
  var metricTo   = new Date(mainGraticule.curTimeRange[1]);
  setTimeFields(metricFrom, metricTo);
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
    mainGraticule = new Graticule(ctx, [canvasSpaceLeftTop[0], canvasSpaceLeftTop[1], canvasDimensions[0] - canvasSpaceLeftTop[0], canvasDimensions[1] - canvasSpaceLeftTop[1]], canvasSpaceLeftTop[0], canvasSpaceLeftTop[1], [canvasDimensions[0] + canvasSpaceLeftTop[0], canvasDimensions[1] + canvasSpaceLeftTop[1]]);
  }
  timers.parsing.preprocessingEnded = (new Date()).getTime();
  var distinctMetrics = new Object();
  var metricCountIndex = undefined;
  for(var i = 0; i < datapointsJSON.length; ++i)
  {
    var metric = datapointsJSON[i];
    if(metric.target.match(/\/count$/))
    {
      metricCountIndex = i;
    } else
    {
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
    }
    var metricParts = metric.target.split("/");
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
          for(var j = 0; j < mainGraticule.series[i].points.length && j < datapointsJSON[metricCountIndex].datapoints.length; ++j)
          {
            mainGraticule.series[i].points[j].count = datapointsJSON[metricCountIndex].datapoints[j][0];
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
  var options = matchStylingOptions("band:" + metricBaseName);
  if("default" === options.color)
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
  var options = matchStylingOptions("series:" + metricName);
  if("default" === options.color)
  {
    options.color = determineColorForMetric(baseName);
  }
  return options;
}
function matchStylingOptions(fullMetricName)
{
  if(typeof fullMetricName != "string")
  {
    return undefined;
  }
  for(var i = 0; i < stylingOptions.list.length; ++i)
  {
    if(stylingOptions.list[i].nameMatch == fullMetricName
    || fullMetricName.match(new RegExp(stylingOptions.list[i].nameRegex)))
    {
      //clone the options
      return JSON.parse(JSON.stringify(stylingOptions.list[i]));
    }
  }
  return undefined;
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

  if(timers.db_http)
  {
    deltaTime = timers.db_http.duration;
    deltaTime = Math.round(deltaTime * 100) / 100;
    timingsString += ", Endpoint " + deltaTime + " ms";
  }

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
  wrapperEle.style.width = canvasSize[0] + canvasSpaceLeftTop[0];
  wrapperEle.style.height = canvasSize[1] + canvasSpaceLeftTop[1];
  var canvasEle = document.createElement("canvas");
  canvasEle.width = canvasSize[0] + canvasSpaceLeftTop[0];
  canvasEle.height = canvasSize[1] + canvasSpaceLeftTop[1];
  var timingsEle = document.createElement("div");
  timingsEle.setAttribute("class", "timings_text");
  timingsEle.appendChild(document.createTextNode("Zeiterfassung..."));

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
  if(mainGraticule)
  {
    mainGraticule.resetData();
  }
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
      if(0 < curMetricNameEles[0].value.length)
      {
        curMetricNameEles[0].parentNode.style.backgroundColor = determineColorForMetric(curMetricNameEles[0].value.split("/")[0]);
        curMetricNameEles[0].style.backgroundColor = "inherit";
        fetchMeasureData(metricFrom, metricTo, intervalMs, curMetricNameEles[0].value, function(jsonObj) { processMetricQData(jsonObj, false, false); });
      }
    } else
    {
      break;
    }
  }
  setTimeout(allAjaxCompletedWatchdog, 30);
}

function fetchMeasureData(timeStart, timeEnd, intervalMs, metricToFetch, callbackFunc)
{
  if(timeStart.getTime() >= timeEnd.getTime())
  {
    alert("only fetching with timeStart < timeEnd allowed!");
    return;
  }
  // Fetch some data outside for smooth scrolling
  var timeDelta = timeEnd - timeStart;
  timeStart = new Date(timeStart.getTime() - timeDelta);
  timeEnd = new Date(timeEnd.getTime() + timeDelta);
  var from = timeStart.toISOString();
  var to = timeEnd.toISOString();
  var target = metricToFetch;
  var splittedMetric = metricToFetch.split("/");
  var metricBase = splittedMetric[0];
  var aggregates = new Array();
  if(1 < splittedMetric.length)
  {
    if("(" == splittedMetric[1].charAt(0)
    && ")" == splittedMetric[1].charAt(splittedMetric[1].length - 1))
    {
      var splittedAggregates = splittedMetric[1].substring(1, splittedMetric[1].length - 1).split("|");
      for(var i = 0; i < splittedAggregates.length; ++i)
      {
        aggregates.push(splittedAggregates[i]);
      }
    } else
    {
      aggregates.push(splittedMetric[1]);
    }
  }
  if(0 == aggregates.length)
  {
    aggregates.push("avg");
  }
  /* always fetch "count" metric */
  aggregates.push("count");

  var curRequestId = ajaxRequestIndex ++;
  ajaxOpenRequests.push(curRequestId);
  var req = new XMLHttpRequest();
  req.requestId = curRequestId;
  var url = "https://grafana.metricq.zih.tu-dresden.de/metricq/query";
  req.open("POST", url, true);
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
        if(jsonObj && jsonObj[0].time_measurements.http)
        {
          timers.db_http = { duration: 0 };
          timers.db_http.duration = jsonObj[0].time_measurements.http * 1000;
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
  var requestJson = {
    "range": {
      "from": from,
      "to": to
    },
    "intervalMs": intervalMs,
    "targets": [
      {
        "target_metric": metricBase,
        "aggregates": aggregates
      }
    ]
  };
  req.send(JSON.stringify(requestJson));
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
  relativeStartPos: undefined,
  currentPos: undefined,
  previousPos: undefined,
  endPos: undefined,
  duration: 0,
  isDown: false,
  startTime: 0,
  endTime: 0,
  startTarget: undefined,
  endTarget: undefined,
  dragCallbacks: new Array(),
  dropCallbacks: new Array(),
  moveCallbacks: new Array(),
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
    mouseDown.relativeStartPos = calculateActualMousePos(evtObj);
    mouseDown.isDown = true;
  },
  moving: function(evtObj)
  {
    if(true === mouseDown.isDown)
    {
      mouseDown.previousPos = mouseDown.currentPos;
      mouseDown.currentPos = mouseDown.calcRelativePos(evtObj);
      for(var i = 0; i < mouseDown.dragCallbacks.length; ++i)
      {
        mouseDown.dragCallbacks[i](evtObj);
      }
    } else
    {
      for(var i = 0; i < mouseDown.moveCallbacks.length; ++i)
      {
        mouseDown.moveCallbacks[i](evtObj);
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
    for(var i = 0; i < mouseDown.dropCallbacks.length; ++i)
    {
      mouseDown.dropCallbacks[i](evtObj);
    }
  },
  registerDragCallback: function(callbackFunc)
  {
    mouseDown.dragCallbacks.push(callbackFunc);
  },
  registerDropCallback: function(callbackFunc)
  {
    mouseDown.dropCallbacks.push(callbackFunc);
  },
  registerMoveCallback: function(callbackFunc)
  {
    mouseDown.moveCallbacks.push(callbackFunc);
  }
}
var keyDown = {
  keys: new Array(),
  keyDown: function(evtObj)
  {
    keyDown.keys.push(evtObj.keyCode);
  },
  keyUp: function(evtObj)
  {
    for(var i = 0; i < keyDown.keys.length; ++i)
    {
      if(evtObj.keyCode == keyDown.keys[i])
      {
        keyDown.keys.splice(i, 1);
        --i;
      }
    }
  },
  is: function (keyCode)
  {
    for(var i = 0; i < keyDown.keys.length; ++i)
    {
      if(keyDown.keys[i] == keyCode)
      {
        return true;
      }
    }
    return false;
  }
};

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("mousedown", mouseDown.startClick);
document.addEventListener("mousemove", mouseDown.moving);
document.addEventListener("mouseup", mouseDown.endClick);
document.addEventListener("keydown", keyDown.keyDown);
document.addEventListener("keyup", keyDown.keyUp);
