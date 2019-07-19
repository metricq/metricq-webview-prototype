
var masterWrapper;
var ctx;
var canvasDimensions = [800, 500]
var mainGraticule;
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
}
function processMetricQData(datapointsJSON)
{
  console.log(datapointsJSON);
  if(! mainGraticule)
  {
    mainGraticule = new Graticule(ctx, [45, 40, canvasDimensions[0] - 45, canvasDimensions[1] - 40], 45, 40);
  }
  for(var i = 0; i < datapointsJSON.length; ++i)
  {
    var options = {
      color: '#ff0000',
      connect: true,
      width: 2
    };
    var metric = datapointsJSON[i];
    if(metric.target.lastIndexOf("min") == metric.target.length - 3 && metric.target.length >= 3)
    {
      options.color = "#00ff00";
    } else if(metric.target.lastIndexOf("avg") == metric.target.length - 3 && metric.target.length >= 3)
    {
      options.color = "#d0d000";
    }
    var mySeries = mainGraticule.getSeries(metric.target);
    if(!mySeries)
    {
      mySeries = mainGraticule.addSeries(metric.target, options);
    } else
    {
      mySeries.clear();
    }
    for(var j = 0; j < metric.datapoints.length; ++j)
    {
      mySeries.addPoint(new Point(metric.datapoints[j][1], metric.datapoints[j][0]));
    }
  }
  mainGraticule.draw();
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

  wrapperEle.appendChild(headingEle);
  wrapperEle.appendChild(canvasEle);
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
    if(4 == obj.target.readyState)
    {
      var jsonObj;
      try
      {
        jsonObj = JSON.parse(obj.target.responseText);
      } catch(exc) {}
      if(jsonObj)
      {
        callMe(jsonObj);
      }
    }
  };}(callbackFunc);
  req.send("{\n  \"range\":{  \n    \"from\":\"" + from + "\",\n    \"to\":\"" + to + "\"\n  },\n  \"intervalMs\":" + intervalMs + ",\n  \"targets\":[  \n    {  \n      \"target\":\"" + target + "\"\n    }\n  ]\n}");
}
document.addEventListener("DOMContentLoaded", init);
