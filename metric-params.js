var metricParams = {
  fields: { 
    "import": undefined,
    "from_date": undefined,
    "from_time": undefined,
    "to_date": undefined,
    "to_time": undefined,
    "presets": undefined,
    "names": undefined,
    "pixels": undefined
  },
  namesEles: new Array(),
  namesValues: new Array(),

  init: function() {
    metricParams.fields["import"] = document.getElementsByName("metric_import")[0];
    metricParams.fields["from_date"] = document.getElementsByName("metric_from_date")[0];
    metricParams.fields["from_time"] = document.getElementsByName("metric_from_time")[0];
    metricParams.fields["to_date"] = document.getElementsByName("metric_to_date")[0];
    metricParams.fields["to_time"] = document.getElementsByName("metric_to_time")[0];
    metricParams.fields["presets"] = document.getElementById("metric_preset_selection");
    metricParams.fields["names"] = document.querySelector(".metric_names");
    metricParams.fields["pixels"] = document.getElementsByName("metric_request_every_that_many_pixels")[0];
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
  addNameField(predefinedValue)
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
    plusButtonEle.addEventListener("click", function () { metricParams.addMetricNameField();});
    metricNamesEle.appendChild(plusButtonEle);
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
