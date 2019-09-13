
var masterWrapper;
var ctx;
var canvasDimensions = [window.innerWidth - 100, 500]
var canvasSpaceLeftTop = [45, 40];
var mainGraticule;
var timers = new Object();
var ajaxOpenRequests = new Array();
var ajaxRequestIndex = 1;
var lastStylingChangeTime = 0;
var METRICQ_URL = "https://grafana.metricq.zih.tu-dresden.de/metricq/query";
var uiOptions = {
  horizontalScrolling: false,
  smoothScrollingExtraData: true
};
var uiInteractArr = [
  ["drag", ["17"], "uiInteractPan"],
  ["drag", ["!16", "!17"], "uiInteractZoomArea"],
  ["drop", ["!16", "!17"], "uiInteractZoomIn"],
  ["move", [], "uiInteractLegend"],
  ["wheel", [], "uiInteractZoomWheel"]
];
var stylingOptions = {
  list: [
    {
      nameRegex: "series:[^/]+/avg",
      title: "AVG Series",
      skip: false,
      color: "default",
      connect: "next",
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
      connect: "next",
      width: 2,
      lineWidth: 2,
      dots: false,
      alpha: 1
    },
    {
      nameRegex: "series:[^/]+/(raw)",
      title: "Raw Series",
      skip: false,
      color: "default",
      connect: "none",
      width: 8,
      dots: true,
    },
    {
      nameRegex: "band:.*",
      title: "All Bands",
      connect: "next",
      color: "default",
      alpha: 0.3
    }
  ]
};
var stylingTabs = undefined;
function init()
{
  initializeStyleOptions();
  masterWrapper = document.querySelector(".master_wrapper");
  ctx = createChart();
  registerCallbacks();
  initializeGraticule();
  metricParams.init();
  metricParams.setTimeFields(new Date((new Date()).getTime() - 7200000), new Date());
  if(-1 < location.href.indexOf("#/"))
  {
    urlImport(location.href);
  }
}
function initTimers()
{
  timers = new Object();
  timers.ajax = new Array();
  timers.endpoint = new Array();
  timers.db = new Array();
  timers.db_http = new Array();
  timers.parsing = new Array();
}
function initializeStyleOptions()
{
  if(localStorage.getItem("styling"))
  {
    storedList = JSON.parse(localStorage.getItem("styling"));
    var resultingList = stylingOptions.list;
    for(var i = 0; i < storedList.length; ++i)
    {
      var foundSameTitle = false;
      for(var j = 0; j < resultingList.length; ++j)
      {
        if(resultingList[j].title == storedList[i].title)
        {
          resultingList[j] = storedList[i];
          foundSameTitle = true;
          break;
        }
      }
      if(!foundSameTitle)
      {
        resultingList.push(storedList[i]);
      }
    }
    stylingOptions.list = resultingList;
  }
  stylingTabs = new Tabbing(document.querySelector(".style_options_wrapper"), undefined);
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
  var functionSourceShortened = localStorage.getItem("colorFunction");
  if(functionSourceShortened)
  {
    determineColorForMetric = new Function("metricBaseName", functionSourceShortened);
  } else
  {
    var functionSourceFull = determineColorForMetric.toString();
    var functionSourceSplitted = functionSourceFull.split("\n");
    functionSourceShortened = "";
    for(var i = 2; i < functionSourceSplitted.length - 1; ++i)
    {
      functionSourceShortened += functionSourceSplitted[i].replace(/^ +/,"") + "\n";
    }
  }
  textareaEle.value = functionSourceShortened;
  textareaEle.addEventListener("keyup", stylingHasChanged);
  curTab.appendChild(textareaEle);

  curTab = stylingTabs.addTab("uiInteractArr");
  textareaEle = document.createElement("textarea");
  textareaEle.setAttribute("rows", "13");
  textareaEle.setAttribute("cols", "80");
  textareaEle.setAttribute("id", "style_options_uiinteract");
  textareaEle.value = formatJson(JSON.stringify(uiInteractArr));
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
function storeStylingsInLocalStorage()
{
  var colorFunctionTextarea = document.getElementById("style_options_color_choosing");
  localStorage.setItem("styling", JSON.stringify(stylingOptions.list));
  localStorage.setItem("colorFunction", colorFunctionTextarea.value);
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
      lastParsedTextarea = document.getElementById("style_options_uiinteract");
      uiInteractArr = JSON.parse(lastParsedTextarea.value);
      storeStylingsInLocalStorage();
      if(mainGraticule)
      {
        mainGraticule.data.updateStyling();
        mainGraticule.draw(false);
      }
      document.querySelector(".style_options_wrapper").style.backgroundColor = "rgba(64, 255, 64, 0.5)";
    } catch(exc)
    {
      console.log("Couldn't parse style Options");
      console.log(exc);
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
function uiInteractPan()
{
  if(mouseDown.previousPos[0] !== mouseDown.currentPos[0]
  || mouseDown.previousPos[1] !== mouseDown.currentPos[1])
  {
    mainGraticule.moveTimeAndValueRanges( (mouseDown.currentPos[0] - mouseDown.previousPos[0]) * -1 * mainGraticule.curTimePerPixel, 0);
    setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 150);
    mainGraticule.draw(false);
  }
}
function uiInteractZoomArea()
{
  if(mouseDown.previousPos[0] !== mouseDown.currentPos[0]
  || mouseDown.previousPos[1] !== mouseDown.currentPos[1])
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
    var timeValueStart = mainGraticule.getTimeValueAtPoint( [minXPos, mouseDown.relativeStartPos[1]]);
    var timeValueEnd = mainGraticule.getTimeValueAtPoint([maxXPos, mouseDown.relativeStartPos[1]]);
  
    if(timeValueStart && timeValueEnd)
    {
      var timeDelta = timeValueEnd[0] - timeValueStart[0];
      var centerPos = [
        Math.floor(minXPos + (maxXPos - minXPos) / 2),
        Math.floor(mainGraticule.graticuleDimensions[1] + (mainGraticule.graticuleDimensions[3] - mainGraticule.graticuleDimensions[1]) / 2)
      ];
      var deltaString = "";
      if(86400000 < timeDelta)
      {
        deltaString = (new Number(timeDelta / 86400000)).toFixed(2) + " days";
      } else if(3600000 < timeDelta)
      {
        deltaString = (new Number(timeDelta / 3600000)).toFixed(2) + " hours";
      } else if(60000 < timeDelta)
      {
        deltaString = (new Number(timeDelta / 60000)).toFixed(1) + " minutes";
      } else if(1000 < timeDelta)
      {
        deltaString = (new Number(timeDelta / 1000)).toFixed(1) + " seconds";
      } else
      {
        deltaString = Math.floor(timeDelta) + " milliseconds";
      }
      centerPos[0] -= Math.round(ctx.measureText(deltaString).width / 2);
      ctx.fillStyle = "#000000";
      ctx.fillText(deltaString , centerPos[0], centerPos[1]);
    }
  }
}
function uiInteractZoomIn(evtObj)
{
  evtObj.preventDefault();
  var relativeStart = mouseDown.relativeStartPos;
  var relativeEnd = calculateActualMousePos(evtObj);
  if(1 < Math.abs(relativeStart[0] - relativeEnd[0]))
  {
    var posEnd   = mainGraticule.getTimeValueAtPoint( relativeStart );
    var posStart = mainGraticule.getTimeValueAtPoint( relativeEnd );
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
    mainGraticule.automaticallyDetermineRanges(false, true, metricParams.allTimeReference);
    setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 200);
    mainGraticule.draw(false);
  }
}
function uiInteractZoomWheel(evtObj)
{
  if(! evtObj.target || !mainGraticule)
  {
    return;
  }
  evtObj.preventDefault();
  if(evtObj.deltaX && uiOptions.horizontalScrolling) // horizontal scrolling
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
    if(0 > scrollDirection)
    {
      scrollDirection = - 0.2;
    }
    if(0 < scrollDirection)
    {
      scrollDirection = 0.2;
    }
    var curPos = calculateActualMousePos(evtObj);
    var curTimeValue = mainGraticule.getTimeValueAtPoint(curPos);
    if(curTimeValue)
    {
      mainGraticule.zoomTimeAndValueAtPoint(curTimeValue, scrollDirection, true, false);
      mainGraticule.automaticallyDetermineRanges(false, true, metricParams.allTimeReference);
      setTimeout(function (lastUpdateTime) { return function() { updateAllSeriesesBands(lastUpdateTime); }; }(mainGraticule.lastRangeChangeTime), 150);
      mainGraticule.draw(false);
    }
  }
}
function uiInteractLegend(evtObj)
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
  var metricsArray = new Array();
  var maxTextWidth = 0;
  var allValuesAtTime = mainGraticule.data.getAllValuesAtTime(curPoint[0]);
  for(var i = 0; i < allValuesAtTime.length; ++i)
  {
    var newEntry = [
        allValuesAtTime[i][0],
        allValuesAtTime[i][1]
      ];
    var curTextLine = (new Number(newEntry[0])).toFixed(3) + " " + allValuesAtTime[i][1] + "/" + allValuesAtTime[i][2];
    newEntry.push(curTextLine);
    newEntry.push(ctx.measureText(curTextLine).width);
    if(newEntry[3] > maxTextWidth)
    {
      maxTextWidth = newEntry[3];
    }
    metricsArray.push(newEntry);
  }
  metricsArray.sort(function (a,b) { return b[0] - a[0]; } );
  var posDate = new Date(curPoint[0]);
  var timeString = posDate.toLocaleString();
  ctx.fillText(timeString, curPosOnCanvas[0] + 10, 40 - 20);
  for(var i = 0; i < metricsArray.length; ++i)
  {
    ctx.fillStyle = determineColorForMetric(metricsArray[i][1]);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(curPosOnCanvas[0] + 10, 40 + i * 20 - 15, maxTextWidth, 20);
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 1;
    ctx.fillText(metricsArray[i][2], curPosOnCanvas[0] + 10, 40 + i * 20);
  }
}
function uiInteractCheck(eventType, evtObj)
{
  for(var i = 0; i < uiInteractArr.length; ++i)
  {
    if(eventType == uiInteractArr[i][0])
    {
      var matchingSoFar = true;
      for(var j = 0; j < uiInteractArr[i][1].length; ++j)
      {
        var allowedKey = "!" != uiInteractArr[i][1][j].charAt(0);
        if(!allowedKey && keyDown.is(parseInt(uiInteractArr[i][1][j].substring(1))))
        {
          matchingSoFar = false;
        }
        if(allowedKey && !keyDown.is(parseInt(uiInteractArr[i][1][j])))
        {
          matchingSoFar = false;
        }
      }
      if(matchingSoFar)
      {
        window[uiInteractArr[i][2]](evtObj);
      }
    }
  }
}
function registerCallbacks()
{
  mouseDown.registerDragCallback(function(evtObj) {
    if(mainGraticule && mouseDown.startTarget && "CANVAS" === mouseDown.startTarget.tagName)
    {
      evtObj.preventDefault();
      uiInteractCheck("drag", evtObj);
    }
  });
  mouseDown.registerDropCallback(function(evtObj) {
    if(mainGraticule && mouseDown.startTarget && "CANVAS" === mouseDown.startTarget.tagName)
    {
      uiInteractCheck("drop", evtObj);
    }
  });
  mouseDown.registerMoveCallback(function(evtObj) {
    if(mainGraticule && "CANVAS" === evtObj.target.tagName)
    {
      uiInteractCheck("move", evtObj);
    }
  });
  document.getElementsByTagName("canvas")[0].addEventListener("mouseout", function(evtObj) {
    if(mainGraticule)
    {
      mainGraticule.draw(false);
    }
  });
  document.getElementsByTagName("canvas")[0].addEventListener("wheel", function(evtObj) {
    uiInteractCheck("wheel", evtObj);
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
  metricParams.setTimeFields(metricFrom, metricTo);
  metricParams.setLocation(metricFrom, metricTo);
  var distinctMetrics = new Object();
  for(var i = 0; i < mainGraticule.data.metrics.length; ++i)
  {
    distinctMetrics[mainGraticule.data.metrics[i].name] = true;
  }
  for(var curMetricBase in distinctMetrics)
  {
    initTimers();
    fetchMeasureData(metricFrom, metricTo, calcMaxDataPoints(metricFrom, metricTo), curMetricBase, function(jsonObj) { mainGraticule.data.processMetricQDatapoints(jsonObj, false, false); });
  }
  setTimeout(allAjaxCompletedWatchdog, 30);
}
function initializeGraticule()
{
  mainGraticule = new Graticule(ctx, [canvasSpaceLeftTop[0], canvasSpaceLeftTop[1], canvasDimensions[0] - canvasSpaceLeftTop[0], canvasDimensions[1] - canvasSpaceLeftTop[1]], canvasSpaceLeftTop[0], canvasSpaceLeftTop[1], [canvasDimensions[0] + canvasSpaceLeftTop[0], canvasDimensions[1] + canvasSpaceLeftTop[1]]);
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
  var options = matchStylingOptions("band:" + metricBaseName);
  if("default" === options.color)
  {
    options.color = determineColorForMetric(metricBaseName);
  }
  return options;
}
function defaultSeriesStyling(metricBaseName, aggregateName)
{
  var options = matchStylingOptions("series:" + metricBaseName + "/" + aggregateName);
  if("default" === options.color)
  {
    options.color = determineColorForMetric(metricBaseName);
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

  var cumulatedTimers = sumOfTimers(["ajax", "parsing", "endpoint", "db", "db_http"]);
  var i = 0;
  for(var timerName in cumulatedTimers)
  {
    if(0 < i)
    {
      timingsString += ", ";
    }
    timingsString += timerName + " " + (new Number(cumulatedTimers[timerName])).toFixed(2) + " ms";
    ++i;
  }

  deltaTime = timers.drawing.end - timers.drawing.start;
  timingsString += ", Drawing " + deltaTime + " ms";

  var timingsEle = document.querySelectorAll(".timings_text")[0];
  timingsEle.removeChild(timingsEle.firstChild);
  timingsEle.appendChild(document.createTextNode(timingsString));
}

function sumOfTimers(timerNames)
{
  var cumulatedTimers = new Object();
  for(var i = 0; i < timerNames.length; ++i)
  {
    if(timers[timerNames[i]])
    {
      var sum = 0;
      for(var j = 0; j < timers[timerNames[i]].length; ++j)
      {
        sum += timers[timerNames[i]][j];
      }
      cumulatedTimers[timerNames[i]] = sum;
    }
  }
  return cumulatedTimers;
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
function calcMaxDataPoints(metricFrom, metricTo)
{
  var xPixelRequest = parseFloat(document.getElementsByName("metric_request_every_that_many_pixels")[0].value);
  var countOfDataPoints = Math.floor((canvasDimensions[0] - canvasSpaceLeftTop[0]) / xPixelRequest);
  return countOfDataPoints;
}
function urlImport(importUrlString)
{
  var urlToImport = importUrlString;
  if(!urlToImport)
  {
    urlToImport = document.getElementsByName("metric_import")[0].value;
  }
  var hashPos = urlToImport.indexOf("#/");
  if(-1 == hashPos)
  {
    alert("No Hash sequence (\"#/\") found in given URL");
    return;
  }
  decodedJson = window.JSURL.parse(urlToImport.substring(hashPos + 2));
  if(decodedJson && decodedJson["cntr"])
  {
    var timeStart, timeEnd;
    if(decodedJson["start"] && decodedJson["stop"])
    {
      timeStart = new Date(decodedJson.start);
      timeEnd   = new Date(decodedJson.stop);
    } else if(decodedJson["value"] && decodedJson["unit"])
    {
      var unitsArr = [
        ["second", 1000],
        ["minute", 60000],
        ["hour", 3600000],
        ["day", 86400000],
        ["week", 86400000 * 7],
        ["month", 86400000 * 30],
        ["year", 86400000 * 365]
        ];
      var unitMultiplier = 1;
      for(var i = 0; i < unitsArr.length; ++i)
      {
        if(-1 < decodedJson["unit"].indexOf(unitsArr[i][0]))
        {
          unitMultiplier = unitsArr[i][1];
          break;
        }
      }
      timeEnd = new Date();
      timeStart = new Date(timeEnd.getTime() - (decodedJson.value * unitMultiplier));
    }
    // reset metric name eles
    metricParams.resetNames();
    for(var i = 0; i < decodedJson.cntr.length; ++i)
    {
      // set metric name eles (including color)
      metricParams.addNameField(decodedJson.cntr[i]);
    }
    metricParams.setTimeFields(timeStart, timeEnd);
    if(decodedJson["pixels"])
    {
      metricParams.setPixels(decodedJson["pixels"]);
    }
    if(mainGraticule)
    {
      mainGraticule.setTimeRange([timeStart.getTime(), timeEnd.getTime()]);
    }

    // do fetchMeasureData()
    
    if(mainGraticule)
    {
      mainGraticule.resetData();
      mainGraticule.setTimeRange([timeStart.getTime(), timeEnd.getTime()]);
    }
    fetchAllMetricFields(timeStart, timeEnd);
  }
}
function submitMetricName()
{
  if(mainGraticule)
  {
    mainGraticule.resetData();
  }
  metricParams.setLocation(metricParams.getFrom(), metricParams.getTo());
  fetchAllMetricFields(metricParams.getFrom(), metricParams.getTo());
}
function fetchAllMetricFields(metricFrom, metricTo)
{
  var maxDataPoints = calcMaxDataPoints(metricFrom, metricTo);
  initTimers();
  metricParams.onEachName(function(fromTime, toTime, countDataPoints) { return function(nameEle, nameValue)
  {
    if(0 < nameValue.length)
    {
      nameEle.parentNode.style.backgroundColor = determineColorForMetric(nameValue.split("/")[0]);
      nameEle.style.backgroundColor = "inherit";
      fetchMeasureData(fromTime, toTime, countDataPoints, nameValue, function(jsonObj) { mainGraticule.setTimeRange([fromTime.getTime(), toTime.getTime()]); mainGraticule.data.processMetricQDatapoints(jsonObj, false, false); });
    }
  }; } (metricFrom, metricTo, maxDataPoints));
  setTimeout(allAjaxCompletedWatchdog, 30);
}

function fetchMeasureData(timeStart, timeEnd, maxDataPoints, metricToFetch, callbackFunc)
{
  if(timeStart.getTime() >= timeEnd.getTime())
  {
    alert("only fetching with timeStart < timeEnd allowed!");
    return;
  }
  // Fetch some data outside for smooth scrolling
  if(uiOptions.smoothScrollingExtraData)
  {
    var timeDelta = timeEnd.getTime() - timeStart.getTime();
    timeStart = new Date(timeStart.getTime() - timeDelta);
    timeEnd = new Date(timeEnd.getTime() + timeDelta);
    maxDataPoints *= 3;
  }
  var from = timeStart.toISOString();
  var to = timeEnd.toISOString();
  var functions = [
    "min",
    "max",
    "avg",
    "count"
  ];

  var curRequestId = ajaxRequestIndex ++;
  ajaxOpenRequests.push(curRequestId);
  var req = new XMLHttpRequest();
  req.requestId = curRequestId;
  var url = METRICQ_URL;
  req.open("POST", url, true);
  req.onreadystatechange = function (callMe) { return function(obj) {
    if(1 == obj.target.readyState)
    {
      obj.target.timers.ajax.opened = (new Date()).getTime();
    }
    if(4 == obj.target.readyState)
    {
      obj.target.timers.ajax.done = (new Date()).getTime();
      var jsonObj;
      obj.target.timers.parsing = {
        start: (new Date()).getTime()
      };
      obj.target.timers.endpoint = { duration: 0};
      let requestDuration = obj.target.getResponseHeader("x-request-duration");
      if (requestDuration !== null)
      {
        obj.target.timers.endpoint.duration = Number.parseFloat(requestDuration) * 1000;
      }
      obj.target.timers.parsing = { start: (new Date()).getTime() };
      try
      {
        jsonObj = JSON.parse(obj.target.responseText);
        if(jsonObj && jsonObj[0].time_measurements.db)
        {
          obj.target.timers.db = { duration: 0 };
          obj.target.timers.db.duration = jsonObj[0].time_measurements.db * 1000;
        }
        if(jsonObj && jsonObj[0].time_measurements.http)
        {
          obj.target.timers.db_http = { duration: 0 };
          obj.target.timers.db_http.duration = jsonObj[0].time_measurements.http * 1000;
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
      obj.target.timers.parsing.end = (new Date()).getTime();
      for(var i = 0; i < ajaxOpenRequests.length; ++i)
      {
        if(obj.target.requestId == ajaxOpenRequests[i])
        {
          ajaxOpenRequests.splice(i, 1);
          break;
        }
      }
      timers.ajax.push(obj.target.timers.ajax.done - obj.target.timers.ajax.presend);
      timers.endpoint.push(obj.target.timers.endpoint.duration);
      timers.db.push(obj.target.timers.db.duration);
      timers.db_http.push(obj.target.timers.db_http.duration);
      timers.parsing.push(obj.target.timers.parsing.end - obj.target.timers.parsing.start);
    }
  };}(callbackFunc);
  req.timers = new Object();
  req.timers.ajax = {
    presend: (new Date()).getTime()
  };
  var requestJson = {
    "range": {
      "from": from,
      "to": to
    },
    "maxDataPoints": maxDataPoints,
    "targets": [
      {
        "metric": metricToFetch,
        "functions": functions
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
      mainGraticule.automaticallyDetermineRanges(needSetTimeRange, true, metricParams.allTimeReference);
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
