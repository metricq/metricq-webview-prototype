var metricParams = {
  fields: { 
    "import": undefined,
    "from_date": undefined,
    "from_time": undefined,
    "to_date": undefined,
    "to_time": undefined,
    "presets": undefined,
    "names": undefined,
    "pixels": undefined,
    "all_time": undefined
  },
  namesEles: new Array(),
  namesValues: new Array(),
  lastTimeFieldChange: 0,
  allTimeReference: true,

  init: function() {
    metricParams.fields["import"] = document.getElementsByName("metric_import")[0];
    metricParams.fields["from_date"] = document.getElementsByName("metric_from_date")[0];
    metricParams.fields["from_time"] = document.getElementsByName("metric_from_time")[0];
    metricParams.fields["to_date"] = document.getElementsByName("metric_to_date")[0];
    metricParams.fields["to_time"] = document.getElementsByName("metric_to_time")[0];
    metricParams.fields["presets"] = document.getElementById("metric_preset_selection");
    metricParams.fields["names"] = document.querySelector(".metric_names");
    metricParams.fields["pixels"] = document.getElementsByName("metric_request_every_that_many_pixels")[0];
    metricParams.fields["all_time"] = document.getElementsByName("metric_all_time")[0];
    metricParams.fields["load_more"] = document.getElementsByName("metric_load_more")[0];
    metricParams.fields["sort_tooltip"] = document.getElementsByName("metric_sort_tooltip")[0];
    metricParams.fields["to_date"].addEventListener("change",function(evt){
      var fromEle = metricParams.fields["from_date"];
      fromEle.setAttribute("max", evt.target.value);
    });
    metricParams.fields["from_date"].addEventListener("change", metricParams.timeWasChanged);
    metricParams.fields["from_time"].addEventListener("change", metricParams.timeWasChanged);
    metricParams.fields["to_date"].addEventListener("change", metricParams.timeWasChanged);
    metricParams.fields["to_time"].addEventListener("change", metricParams.timeWasChanged);
    metricParams.fields["all_time"].addEventListener("change", function(evtObj) {
      metricParams.allTimeReference = !! evtObj.target.checked;
      mainGraticule.automaticallyDetermineRanges(false, true, metricParams.allTimeReference);
      mainGraticule.draw(false);
    });
    metricParams.fields["load_more"].addEventListener("change", function(evtObj) {
      uiOptions.smoothScrollingExtraData = !!evtObj.target.checked;
    });
    metricParams.fields["sort_tooltip"].addEventListener("change", function(evtObj) {
      uiOptions.sortTooltip = !!evtObj.target.checked;
    });
    metricParams.allTimeReference = !!metricParams.fields["all_time"].checked;

    metricParams.initPresets();
  },
  initPresets: function()
  {
    for(var curPreset in metricPresets)
    {
      var curOption = document.createElement("option");
      curOption.value = curPreset;
      curOption.appendChild(document.createTextNode(curPreset));
      metricParams.fields["presets"].appendChild(curOption);
    }
    metricParams.fields["presets"].addEventListener("change", function(evtObj) {
      var curPreset = evtObj.target.value;
      metricParams.resetNames();
      for(var i = 0; i < metricPresets[curPreset].length; ++i)
      {
        metricParams.addNameField(metricPresets[curPreset][i]);
      }
    });
    metricParams.addNameField();
    metricParams.initPlusButton();
  },
  timeWasChanged: function(param)
  {
    if("object" == (typeof param))
    {
      metricParams.lastTimeFieldChange = (new Date()).getTime();
      setTimeout(function () { return function () { metricParams.timeWasChanged(0); }; }(), 400);
    } else ("number" == (typeof param))
    {
      if(((new Date()).getTime() - metricParams.lastTimeFieldChange) > 400)
      {
        submitMetricName();
      }
    }
  },
  getPixels: function()
  {
    var valueString = metricParams.fields["pixels"].value;
    valueString = valueString.replace(/,/g, ".");
    var valueNumber = parseFloat(valueString);
console.log(valueNumber);
    if(isNaN(valueNumber))
    {
      valueNumber = parseFloat(metricParams.fields["pixels"].getAttribute("placeholder"));
    } else
    {
      if(valueNumber < uiOptions.minimumXPixels)
      {
        valueNumber = uiOptions.minimumXPixels;
      }
    }
    metricParams.fields["pixels"].value = "" + valueNumber;
    
    return valueNumber;
  },
  setPixels: function(pixelValue)
  {
    metricParams.fields["pixels"].value = pixelValue;
  },
  addNameField: function(predefinedValue)
  {
    var i = metricParams.namesValues.length;
    if(!predefinedValue && 0 < metricParams.namesValues.length)
    {
      predefinedValue = metricParams.namesValues[metricParams.namesValues.length - 1];
    }
    var plusButtonEle = document.querySelector(".plus_button");
    var fieldDescriptionEle = metricParams.newElement("div", { "class": "field_description" });
    var labelEle = metricParams.newElement("label", { "for": "metric_name[" + i + "]" });
    labelEle.appendChild(document.createTextNode("Metrik Name (" + (i + 1) + ")"));
    fieldDescriptionEle.appendChild(labelEle);
    metricParams.fields["names"].insertBefore(fieldDescriptionEle, plusButtonEle);
  
    var fieldInputsEle = metricParams.newElement("div", { "class": "field_inputs" });
    var inputEle = metricParams.newElement("input", {
      "type": "text",
      "name": "metric_name[" + i + "]",
      "size": "60",
      "value": predefinedValue,
      "id": "metric_name[" + i + "]"
    });
    inputEle.addEventListener("change", function(myId) { return function(evtObj) {
        metricParams.namesValues[myId] = evtObj.target.value;
      }; }(i));
    metricParams.namesValues.push(predefinedValue);
    metricParams.namesEles.push(fieldInputsEle.appendChild(inputEle));
    metricParams.fields["names"].insertBefore(fieldInputsEle, plusButtonEle);
  },
  newElement: function(tagName, attributes)
  {
    var newEle = document.createElement(tagName);
    for(var curAttrib in attributes)
    {
      newEle.setAttribute(curAttrib, attributes[curAttrib]);
    }
    return newEle;
  },
  initPlusButton: function()
  {
    var metricNamesEle = metricParams.fields["names"];
    var plusButtonEle = document.createElement("button");
    plusButtonEle.appendChild(document.createTextNode("+"));
    plusButtonEle.setAttribute("class", "plus_button");
    plusButtonEle.addEventListener("click", function () { metricParams.addNameField();});
    metricNamesEle.appendChild(plusButtonEle);
  },
  setLocation: function(timeFrom, timeTo)
  {
    var locationJson = {
      "cntr": metricParams.namesValues,
      "start": timeFrom.getTime(),
      "stop": timeTo.getTime(),
      "type": "default",
      "pixels": metricParams.getPixels()
    };
    var stringifiedJson = window.JSURL.stringify(locationJson);
    var curLoc = window.location.href;
    if(-1 < curLoc.indexOf("#"))
    {
      window.location.href = curLoc.substring(0, curLoc.indexOf("#")) + "#/" + stringifiedJson;
    } else
    {
      window.location.href += "#/" + stringifiedJson;
    }
  },
  getFrom: function()
  {
    return new Date(metricParams.fields["from_date"].value + " " +
                    metricParams.fields["from_time"].value);
  },
  getTo: function()
  {
    return new Date(metricParams.fields["to_date"].value + " " +
                    metricParams.fields["to_time"].value);
  },
  setTimeFields: function(timeFrom, timeTo)
  {
    var curDate = new Date();
    metricParams.fields["from_date"].value = metricParams.buildIso8601Date(timeFrom);
    metricParams.fields["to_date"].value = metricParams.buildIso8601Date(timeTo);
    metricParams.fields["from_date"].max = metricParams.buildIso8601Date(curDate);
    metricParams.fields["to_date"].max = metricParams.buildIso8601Date(curDate);
    metricParams.fields["from_time"].value = dateToHHMMSSStr(timeFrom);
    metricParams.fields["to_time"].value = dateToHHMMSSStr(timeTo);
  },
  buildIso8601Date: function(dateObj)
  {
    return dateObj.getFullYear() + "-" + ((dateObj.getMonth() + 1) < 10 ? "0" : "") + (dateObj.getMonth() + 1) + "-" + (dateObj.getDate() < 10 ? "0" : "") + dateObj.getDate();
  },
  onEachName: function(perNameCallback)
  {
    for(var i = 0; i < metricParams.namesEles.length; ++i)
    {
      perNameCallback(metricParams.namesEles[i], metricParams.namesValues[i]);
    }
  },
  resetNames: function()
  {
    metricParams.namesEles = new Array();
    metricParams.namesValues = new Array();
    metricParams.removeAllChilds(metricParams.fields["names"]);
    metricParams.initPlusButton();
  },
  removeAllChilds: function(parentEle)
  {
    for(var i = parentEle.childNodes.length - 1; i >= 0; --i)
    {
      parentEle.removeChild(parentEle.childNodes[i]);
    }
  }
};


function dateToHHMMStr(curDate)
{
  return (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":" + (curDate.getMinutes() < 10 ? "0" : "") + curDate.getMinutes();
}
function dateToHHMMSSStr(curDate)
{
  return (curDate.getHours() < 10 ? "0" : "") + curDate.getHours() + ":" + (curDate.getMinutes() < 10 ? "0" : "") + curDate.getMinutes() + ":" + (curDate.getSeconds() < 10 ? "0" : "") + curDate.getSeconds();
}
