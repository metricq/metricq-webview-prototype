
var masterWrapper;
var ctx;
var canvasDimensions = [800, 500]
function init()
{
  masterWrapper = document.querySelector(".master_wrapper");
  ctx = createChart();
  fetchMeasureData(processMetricQData);
}
function processMetricQData(datapointsJSON)
{
  console.log(datapointsJSON);
  var graticule = new Graticule(ctx, [0, 0, canvasDimensions[0], canvasDimensions[1]]);
  for(var i = 0; i < datapointsJSON.length; ++i)
  {
    var options = {
      color: '#ff0000',
      width: 6
    };
    var metric = datapointsJSON[i];
    if(metric.target.lastIndexOf("min") == metric.target.length - 3)
    {
      options.color = "#00ff00";
    } else if(metric.target.lastIndexOf("avg") == metric.target.length - 3)
    {
      options.color = "#d0d000";
    }
    var latestSeries = graticule.addSeries(options);
    for(var j = 0; j < metric.datapoints.length; ++j)
    {
      latestSeries.addPoint(new Point(metric.datapoints[j][1], metric.datapoints[j][0]));
    }
  }
  graticule.draw();
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
  headingEle.style.textAlign = "center";
  headingEle.style.fontFamily = "Sans";
  headingEle.style.fontSize = "20px";
  var canvasEle = document.createElement("canvas");
  canvasEle.width = canvasSize[0] + pixelsLeft;
  canvasEle.height = canvasSize[1] + pixelsBottom;

  wrapperEle.appendChild(headingEle);
  wrapperEle.appendChild(canvasEle);
  masterWrapper.appendChild(wrapperEle);
  return canvasEle.getContext("2d");
}

function fetchMeasureData(callbackFunc)
{
  var from = "2019-07-18T04:49:35.475Z";
  var to = "2019-07-18T10:49:35.475Z";
  var intervalMs = 120000;
  var target = "elab.ariel.s0.package.power/(min|max|avg)";
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
