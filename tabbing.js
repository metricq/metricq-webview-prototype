function Tabbing(paramParentElement)
{
  this.parentElement = paramParentElement;
  this.tabSize = ["50em", "14em"];
  this.headArea = undefined;
  this.bodyArea = undefined;
  this.moreTabsEle = undefined;
  this.tabs = new Array();
  this.visibleTabHeadings = new Array();
  this.focusedTabIndex = 0;
  this.visibleTabsCount = 0;
  this.init = function()
  {
    this.headArea = document.createElement("div");
    this.headArea.setAttribute("class", "tabbing_header");
    this.headArea.style.fontSize = "14pt";
    this.headArea.style.height = "40px";
    this.headArea.style.width = this.tabSize[0];
    this.headArea.style.padding = "10px 0px 0px 0px";
    this.headArea.style.backgroundColor = "#a0a0a0";
    this.bodyArea = document.createElement("div");
    this.bodyArea.setAttribute("class", "tabbing_body");
    this.bodyArea.style.width = this.tabSize[0];
    this.bodyArea.style.height = this.tabSize[1];
    this.headArea = this.parentElement.appendChild(this.headArea);
    this.bodyArea = this.parentElement.appendChild(this.bodyArea);
  };
  this.addTab = function(tabName)
  {
    var newTabDescription = new TabDescription(this.bodyArea, tabName);
    if(((this.tabs.length + 1) * 270) < (this.headArea.offsetWidth - 50))
    {
      this.visibleTabsCount++;
      this.visibleTabHeadings.push(new TabHeading(this, tabName));
      if(0 == this.tabs.length)
      {
        newTabDescription.focus();
      }
    } else
    {
      if(!this.moreTabsEle)
      {
        this.moreTabsEle = document.createElement("div");
        this.moreTabsEle.style.float = "right";
        this.moreTabsEle.style.margin = "0px 10px 0px 0px";
        this.moreTabsEle.style.padding = "5px";
        this.moreTabsEle.addEventListener("mouseover", function(evtObj) { evtObj.target.style.backgroundColor = "#efefef"; });
        this.moreTabsEle.addEventListener("mouseout", function(evtObj) { evtObj.target.style.backgroundColor = "#a0a0a0"; });
        this.moreTabsEle.addEventListener("click", function(tabbingObj) { return function(evtObj) { tabbingObj.showMoreTabs(evtObj); }; }(this));
        this.moreTabsEle.appendChild(document.createTextNode("▼"));
        this.headArea.appendChild(this.moreTabsEle);
      }
    }
    this.tabs.push(newTabDescription);
    return newTabDescription.mainEle;
  };
  this.showMoreTabs = function(evtObj)
  {
    var x = this.moreTabsEle.offsetLeft + this.moreTabsEle.parentNode.offsetLeft + this.moreTabsEle.parentNode.parentNode.offsetLeft - 110,
        y = this.moreTabsEle.offsetTop - 10;
    if((x + 220) > window.innerWidth)
    {
      x = window.innerWidth - 220;
    }
    var tabChooserEle = document.createElement("ul");
    tabChooserEle.style.backgroundColor = "#FFFFFF";
    tabChooserEle.style.position = "absolute";
    tabChooserEle.style.listStyle = "none";
    tabChooserEle.style.left = x;
    tabChooserEle.style.top = y;
    tabChooserEle.style.width = 200;
    tabChooserEle.style.padding = "0px";
    for(var i = 0; i < this.tabs.length; ++i)
    {
      var curLi = document.createElement("li");
      curLi.appendChild(document.createTextNode(this.tabs[i].name));
      curLi.style.margin = "8px";
      curLi.style.border = "2px solid #FFFFFF";
      curLi.addEventListener("mouseover", function(evtObj) {evtObj.target.style.border = "2px solid #707070"; });
      curLi.addEventListener("mouseout", function(evtObj) {evtObj.target.style.border = "2px solid #FFFFFF"; });
      curLi.addEventListener("click", function(tabbingObj, curName) { return function(evtObj) {
        evtObj.target.parentNode.parentNode.removeChild(evtObj.target.parentNode);
        tabbingObj.focusTab(curName);
      }; }(this, this.tabs[i].name));
      tabChooserEle.appendChild(curLi);
    }
    document.getElementsByTagName("body")[0].appendChild(tabChooserEle);
  };
  this.focusTab = function (tabName)
  {
    var oldMainTab = this.getTabDescription(this.visibleTabHeadings[0].title);
    var i = this.visibleTabsCount - 1;
    for(var j = 0; j < this.visibleTabsCount; ++j)
    {
      if(tabName == this.visibleTabHeadings[j].title)
      {
        i = j;
      }
    }
    for(; i > 0; --i)
    {
      this.visibleTabHeadings[i].setTitle(this.visibleTabHeadings[i - 1].title);
    }
    this.visibleTabHeadings[0].setTitle(tabName);
    oldMainTab.unfocus();
    this.getTabDescription(tabName).focus();
  };
  this.getTabDescription = function(searchName)
  {
    for(var i = 0; this.tabs.length; ++i)
    {
      if(searchName == this.tabs[i].name)
      {
        return this.tabs[i];
      }
    }
    return undefined;
  }

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
  this.headingEle = document.createElement("div");
  this.headingEle.style.display = "inline-block";
  this.headingEle.style.fontSize = "16pt";
  this.headingEle.style.backgroundColor = "#c0c0c0";
  this.headingEle.style.margin = "0px 10px 0px 5px";
  this.headingEle.style.padding = "5px 0px 0px 5px";
  this.headingEle.style.width = "250px";
  this.headingEle.style.height = "33px";
  this.headingEle.style.borderLeft = "2px solid #606060";
  this.headingEle.style.borderTop  = "2px solid #606060";
  this.headingEle.style.borderRight= "2px solid #606060";
  this.headingEle.style.borderTopLeftRadius = "10px";
  this.headingEle.style.borderTopRightRadius = "10px";
  this.eventHandler = undefined;

  this.focus = function()
  {
    this.headingEle.style.backgroundColor = "#FFFFFF";
  }
  this.defocus = function()
  {
    this.headingEle.style.backgroundColor = "#c0c0c0";
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
