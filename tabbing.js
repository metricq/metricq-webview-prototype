function Tabbing(paramParentElement, paramTabSize)
{
  this.parentElement = paramParentElement;
  this.tabSize = paramTabSize;
  this.headArea = undefined;
  this.bodyArea = undefined;
  this.moreTabsEle = undefined;
  this.tabs = new Array();
  this.visibleTabHeadings = new Array();
  this.focusedTabIndex = 0;
  this.focusedHeadingIndex = 0;
  this.visibleTabsCount = 0;
  this.init = function()
  {
    this.headArea = document.createElement("div");
    this.headArea.setAttribute("class", "tabbing_header");
    this.headArea.style.height = "40px";
    if(this.tabSize && this.tabSize[0])
    {
      this.headArea.style.width = this.tabSize[0];
    }
    this.headArea.style.padding = "10px 0px 0px 0px";
    this.bodyArea = document.createElement("div");
    this.bodyArea.setAttribute("class", "tabbing_body");
    if(this.tabSize)
    {
      if(this.tabSize[0]) this.bodyArea.style.width = this.tabSize[0];
      if(this.tabSize[1]) this.bodyArea.style.height = this.tabSize[1];
    }
    this.headArea = this.parentElement.appendChild(this.headArea);
    this.bodyArea = this.parentElement.appendChild(this.bodyArea);
  };
  this.getWidthOfAllTabHeadings = function()
  {
    var x = 0;
    for(var i = 0; i < this.visibleTabHeadings.length; ++i)
    {
      x += this.visibleTabHeadings[i].getWidth();
    }
    return x;
  };
  this.addTab = function(tabName, predefinedTabBody)
  {
    var newTabDescription = new TabDescription(this.bodyArea, tabName);

    var tabWidths = this.getWidthOfAllTabHeadings();
    var freeSpaceWidth = this.headArea.offsetWidth - 50;
    if(0 == tabWidths)
    {
      this.visibleTabsCount++;
      this.visibleTabHeadings.push(new TabHeading(this, tabName));
      newTabDescription.focus();
    } else if((this.visibleTabHeadings[0].getMinWidth() * (this.visibleTabHeadings.length + 1)) < freeSpaceWidth)
    {
      this.visibleTabsCount++;
      this.visibleTabHeadings.push(new TabHeading(this, tabName));
      for(var i = 0; i < this.visibleTabHeadings.length; ++i)
      {
        this.visibleTabHeadings[i].doResize(Math.round(freeSpaceWidth / this.visibleTabHeadings.length));
      }
    } else
    {
      if(!this.moreTabsEle)
      {
        this.moreTabsEle = document.createElement("div");
        this.moreTabsEle.style.float = "right";
        this.moreTabsEle.style.margin = "0px 10px 0px 0px";
        this.moreTabsEle.style.padding = "5px";
        this.moreTabsEle.addEventListener("mouseover", function(evtObj) { evtObj.target.style.color = "#ffffff"; });
        this.moreTabsEle.addEventListener("mouseout", function(evtObj) { evtObj.target.style.color = "#000000"; });
        this.moreTabsEle.addEventListener("click", function(tabbingObj) { return function(evtObj) { tabbingObj.showMoreTabs(evtObj); }; }(this));
        this.moreTabsEle.appendChild(document.createTextNode("▼"));
        this.headArea.appendChild(this.moreTabsEle);
      }
    }
    this.tabs.push(newTabDescription);
    if(predefinedTabBody)
    {
      if(predefinedTabBody.parentNode)
      {
        predefinedTabBody.parentNode.removeChild(predefinedTabBody);
      }
      newTabDescription.mainEle.appendChild(predefinedTabBody);
    }
    return newTabDescription.mainEle;
  };
  this.showMoreTabs = function(evtObj)
  {
    var position = this.getActualOffset(this.moreTabsEle);
    position[0] -= 110;
    position[1] -= 10;
    if((position[0] + 220) > window.innerWidth)
    {
      position[0] = window.innerWidth - 220;
    }
    var tabChooserEle = document.createElement("ul");
    tabChooserEle.style.backgroundColor = "#FFFFFF";
    tabChooserEle.style.position = "absolute";
    tabChooserEle.style.listStyle = "none";
    tabChooserEle.style.left = position[0] + "px";
    tabChooserEle.style.top = position[1] + "px";
    tabChooserEle.style.width = "200px";
    tabChooserEle.style.zIndex = 500;
    tabChooserEle.style.padding = "0px";
    tabChooserEle.setAttribute("class", "tab_chooser_overlay");
    for(var i = 0; i < this.tabs.length; ++i)
    {
      var addThisTitle = true;
      for(var j = 0; j < this.visibleTabHeadings.length; ++j)
      {
        if(this.tabs[i].name == this.visibleTabHeadings[j].title)
        {
          addThisTitle = false;
          break;
        }
      }
      if(addThisTitle)
      {
        var curLi = document.createElement("li");
        curLi.appendChild(document.createTextNode(this.tabs[i].name));
        curLi.style.margin = "8px";
        curLi.style.border = "2px solid #FFFFFF";
        curLi.addEventListener("mouseover", function(evtObj) {evtObj.target.style.border = "2px solid #707070"; });
        curLi.addEventListener("mouseout", function(evtObj) {evtObj.target.style.border = "2px solid #FFFFFF"; });
        curLi.addEventListener("click", function(tabbingObj, curName) { return function(evtObj) {
          var damnVeil = document.querySelector(".veil");
          damnVeil.parentNode.removeChild(damnVeil);
          evtObj.target.parentNode.parentNode.removeChild(evtObj.target.parentNode);
          tabbingObj.focusTab(curName);
        }; }(this, this.tabs[i].name));
        tabChooserEle.appendChild(curLi);
      }
    }
    var veilEle = document.createElement("div");
    veilEle.style.opacity = "0.3";
    veilEle.style.backgroundColor = "#000000";
    veilEle.style.position = "fixed";
    veilEle.style.left = "0px";
    veilEle.style.top = "0px";
    veilEle.style.width = window.innerWidth + "px";
    veilEle.style.height = window.innerHeight + "px";
    veilEle.style.zIndex = 100;
    veilEle.setAttribute("class", "veil");
    veilEle.appendChild(document.createTextNode(" "));
    veilEle.addEventListener("click", function() {
      var curEle = document.querySelector(".veil");
      curEle.parentNode.removeChild(curEle);
      curEle = document.querySelector(".tab_chooser_overlay");
      curEle.parentNode.removeChild(curEle);
    });
    
    document.getElementsByTagName("body")[0].appendChild(veilEle);
    document.getElementsByTagName("body")[0].appendChild(tabChooserEle);
  };
  this.getActualOffset = function(ele)
  {
    var x = 0;
    var y = 0;
    x += ele.offsetLeft;
    y += ele.offsetTop;
    for(var curEle = ele; curEle.parentNode; curEle = curEle.parentNode)
    {
      if(curEle["tagName"] && "BODY" == curEle.tagName)
      {
        x += curEle.scrollLeft;
        y += curEle.scrollTop;
	break;
      } else
      {
        x -= curEle.scrollLeft;
        y -= curEle.scrollTop;
      }
    }
    
    return [x, y];
  };
  this.focusTab = function (tabName)
  {
    var oldTabDesc    = this.tabs[this.focusedTabIndex];
    var oldTabHeading = this.visibleTabHeadings[this.focusedHeadingIndex];
    var newTabDescIndex    = this.getTabDescIndex(tabName);
    var newTabHeadingIndex = this.getTabHeadingIndex(tabName);
    oldTabDesc.unfocus();
    oldTabHeading.unfocus();
    this.focusedTabIndex = newTabDescIndex;
    this.tabs[newTabDescIndex].focus();
    if(newTabHeadingIndex !== undefined)
    {
      this.focusedHeadingIndex = newTabHeadingIndex;
      this.visibleTabHeadings[newTabHeadingIndex].focus();
    } else
    {
      var startIndexToShow = newTabDescIndex - Math.ceil(this.visibleTabHeadings.length / 2);
      var endIndexToShow = startIndexToShow + this.visibleTabHeadings.length - 1;
      if(endIndexToShow >= this.tabs.length)
      {
        endIndexToShow = this.tabs.length - 1;
        startIndexToShow = endIndexToShow - (this.visibleTabHeadings.length - 1);
      }
      if(0 > startIndexToShow)
      {
        startIndexToShow = 0;
        endIndexToShow = this.visibleTabHeadings.length - 1;
        if(endIndexToShow >= this.tabs.length)
        {
          endIndexToShow = this.tabs.length - 1;
        }
      }
      for(var i = startIndexToShow, j = 0; i <= endIndexToShow; ++i && ++j)
      {
        this.visibleTabHeadings[j].setTitle(this.tabs[i].name);
        if(this.tabs[i].name == tabName)
        {
          this.visibleTabHeadings[j].focus();
          this.focusedHeadingIndex = j;
        }
      }
    }
  };
  this.getTabDescIndex = function(searchName)
  {
    for(var i = 0; i < this.tabs.length; ++i)
    {
      if(searchName == this.tabs[i].name)
      {
        return i;
      }
    }
    return undefined;
  };
  this.getTabHeadingIndex = function(searchName)
  {
    for(var i = 0; i < this.visibleTabHeadings.length; ++i)
    {
      if(searchName == this.visibleTabHeadings[i].title)
      {
        return i;
      }
    }
    return undefined;
  };

  this.init();
}
function TabDescription(parentElement, tabName)
{
  this.name = tabName;
  this.mainEle = document.createElement("div");
  this.mainEle.style.display = "none";
  this.mainEle.style.width = "100%";
  this.mainEle.style.height = "100%";
  parentElement.appendChild(this.mainEle);
  this.unfocus = function()
  {
    this.mainEle.style.display = "none";
  };
  this.focus = function()
  {
    this.mainEle.style.display = "block";
  };
}
function TabHeading(paramTabbingObj, tabName)
{
  this.title = tabName;
  this.pxString = function(pxArray)
  {
    var outStr = "";
    for(var i = 0; i < pxArray.length; ++i)
    {
      if(0 < i)
      {
        outStr += " ";
      }
      outStr += pxArray[i] + "px";
    }
    return outStr;
  }
  this.headingEle = document.createElement("div");
  this.headingEle.style.display = "inline-block";
  this.defaultMargins = [0, 10, 0, 5];
  this.defaultPaddings = [5, 0, 0, 5];
  this.borderWidth = 2;
  this.defaultWidth = 250;
  this.headingEle.style.margin = this.pxString(this.defaultMargins);
  this.headingEle.style.padding = this.pxString(this.defaultPaddings);
  this.headingEle.style.width = this.defaultWidth + "px";
  this.headingEle.style.height = "33px";
  this.headingEle.style.cursor = "pointer";
  this.headingEle.style.borderLeft = this.borderWidth + "px solid #606060";
  this.headingEle.style.borderTop  = this.borderWidth + "px solid #606060";
  this.headingEle.style.borderRight= this.borderWidth + "px solid #606060";
  this.headingEle.style.borderTopLeftRadius = "10px";
  this.headingEle.style.borderTopRightRadius = "10px";
  this.headingEle.style.overflow = "hidden";
  this.headingEle.setAttribute("class", "tab_head tab_head_unfocused")
  this.eventHandler = undefined;
  this.canResize = function(newWidth)
  {
    var softmargins = this.defaultMargins[1] + this.defaultMargins[3];
    var hardmargins = this.defaultPaddings[1] + this.defaultPaddings[3]
                    + this.borderWidth * 2;
    if(newWidth > ((this.defaultWidth + softmargins) / 5 + hardmargins))
    {
      return true;
    }
    return false;
  };
  this.doResize = function(newWidth)
  {
    var maxSize = this.defaultWidth
		  + this.defaultMargins[1] + this.defaultMargins[3]
	  	  + this.defaultPaddings[1] + this.defaultPaddings[3]
                  + this.borderWidth * 2;
    if(newWidth >= maxSize)
    {
      this.headingEle.style.margin = this.pxString(this.defaultMargins);
      this.headingEle.style.width = this.defaultWidth + "px";

      return maxSize;
    } else
    {
      var minSize = this.getMinWidth();
      if(newWidth < minSize)
      {
        newWidth = minSize;
      }
      var deltaSize = maxSize - minSize;
      var proportionalFactor = (newWidth - minSize) / deltaSize * 0.8 + 0.2;

      var newMargins = [this.defaultMargins[0], this.defaultMargins[1], this.defaultMargins[2], this.defaultMargins[3]];
      newMargins[1] = Math.round(newMargins[1] * proportionalFactor);
      newMargins[3] = Math.round(newMargins[3] * proportionalFactor);
      this.headingEle.style.margin = this.pxString(newMargins);

      this.headingEle.style.width = (newWidth - newMargins[1] - newMargins[3]
                        - this.defaultPaddings[1] - this.defaultPaddings[3]
                        - this.borderWidth * 2) + "px";
      return newWidth;
    }
  };
  this.getMinWidth = function()
  {
    var minSize = Math.ceil((this.defaultWidth
                             + this.defaultMargins[1] + this.defaultMargins[3]) / 5)
                  + this.defaultPaddings[1] + this.defaultPaddings[3]
                  + this.borderWidth * 2;
    return minSize;
  };
  this.getWidth = function()
  {
    var myWidth  = parseInt(this.headingEle.style.width);
    var splitted = this.headingEle.style.margin.split(" ");
    myWidth += parseInt(splitted[1]);
    myWidth += parseInt(splitted[3]);
    splitted = this.headingEle.style.padding.split(" ");
    myWidth += parseInt(splitted[1]);
    myWidth += parseInt(splitted[3]);
    return myWidth;
  }
  this.focus = function()
  {
    this.headingEle.setAttribute("class", "tab_head tab_head_focused")
  }
  this.unfocus = function()
  {
    this.headingEle.setAttribute("class", "tab_head tab_head_unfocused")
  }
  this.setTitle = function(newTitle)
  {
    this.title = newTitle;
    if(this.headingEle.firstChild)
    {
      this.headingEle.removeChild(this.headingEle.firstChild);
    }
    if(20 < newTitle.length)
    {
      this.headingEle.appendChild(document.createTextNode(newTitle.substring(0, 20)));
    } else
    {
      this.headingEle.appendChild(document.createTextNode(newTitle));
    }
    this.headingEle.setAttribute("title", newTitle);
    if(this.eventHandler)
    {
      this.headingEle.removeEventListener("click", this.eventHandler);
    }
    this.eventHandler = function(tabbingObj, tabName) { return function() { tabbingObj.focusTab(tabName); }; }(paramTabbingObj, newTitle);
    this.headingEle.addEventListener("click", this.eventHandler);
  }

  this.setTitle(tabName); 
  if(0 == paramTabbingObj.tabs.length)
  {
    this.focus();
  }
  paramTabbingObj.headArea.appendChild(this.headingEle);
}
