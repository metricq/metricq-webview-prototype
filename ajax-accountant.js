var AjaxAccountant = {
  reqArray: new Array(),
  reqIndex: 0,
  sendTimeout: undefined,
  timeoutDuration: 2000,
  timeoutFunction: undefined,
  newRequest: function(httpMethod, httpUrl, description)
  {
  	var newReq = new XMLHttpRequest();
  	newReq.open(httpMethod, httpUrl, true);
  	newReq.requestId = AjaxAccountant.reqIndex ++;
    newReq.requestUrl = httpUrl;
    newReq.requestDescription = description;
  	AjaxAccountant.reqArray.push(newReq);
  	return newReq;
  },
  sendRequest: function(ajaxObject, sendData)
  {
  	var sendTime = (new Date()).getTime();
  	ajaxObject.requestSendTime = sendTime;
    ajaxObject.send(sendData);
    if(undefined === AjaxAccountant.sendTimeout)
    {
      AjaxAccountant.sendTimeout = new Object();
      AjaxAccountant.sendTimeout.listenId = ajaxObject.requestId;
      AjaxAccountant.sendTimeout.timeoutId = setTimeout(AjaxAccountant.handleRequestTimeout, AjaxAccountant.timeoutDuration);
    }
  },
  setTimeoutHandler: function(timeoutTime, handleFunc)
  {
    AjaxAccountant.timeoutDuration = timeoutTime;
    AjaxAccountant.timeoutFunction = handleFunc;
  },
  indexOfReqId: function(reqId)
  {
    for (var i = 0; i < AjaxAccountant.reqArray.length; ++i)
    {
      if(reqId == AjaxAccountant.reqArray[i].requestId)
      {
      	return i;
      }
    }
    return undefined;
  },
  deleteRequest: function(ajaxObject)
  {
  	var myIndex = AjaxAccountant.indexOfReqId(ajaxObject.requestId);
    AjaxAccountant.reqArray.splice(myIndex, 1);
  },
  handleRequestTimeout: function()
  {
  	var pertainingIndex = AjaxAccountant.indexOfReqId(AjaxAccountant.sendTimeout.listenId);
  	if(pertainingIndex)
  	{
  	  var pertainingReq = AjaxAccountant.reqArray[pertainingIndex];
      var hadToAbortRequest = false;
  	  if(4 > pertainingReq.readyState)
  	  {
        hadToAbortRequest = true;
  	    try {
          pertainingReq.onreadystatechange = undefined;
    	    pertainingReq.abort();
  	    } catch(ext)
    	  {
  	  	  // do nothing about it
  	    }
  	  }
  	  AjaxAccountant.reqArray.splice(pertainingIndex, 1);
      if(hadToAbortRequest
      && AjaxAccountant.timeoutFunction)
      {
        AjaxAccountant.timeoutFunction(pertainingReq);
      }
  	}
    //check if there are other requests to handle
    if(0 < AjaxAccountant.reqArray.length)
    {
      var oldestRequestTime = undefined;
      var oldestRequestIndex = undefined;
      for(var i = 1; i < AjaxAccountant.reqArray.length; ++i)
      {
      	if(undefined === oldestRequestIndex
        || AjaxAccountant.reqArray[i].requestSendTime < oldestRequestTime)
      	{
      	  oldestRequestTime = AjaxAccountant.reqArray[i].requestSendTime;
      	  oldestRequestIndex = i;
      	}
      }
      if(undefined !== oldestRequestIndex)
      {
        AjaxAccountant.sendTimeout.listenId = AjaxAccountant.reqArray[oldestRequestIndex].requestId;
        AjaxAccountant.sendTimeout.timeoutId = undefined;
        var curTime = (new Date()).getTime();
        if((curTime - oldestRequestTime) > AjaxAccountant.timeoutDuration)
        {
          AjaxAccountant.handleRequestTimeout();
        } else
        {
      	  AjaxAccountant.sendTimeout.timeoutId = setTimeout(AjaxAccountant.handleRequestTimeout, AjaxAccountant.timeoutDuration - (curTime - oldestRequestTime));
        }
      } else
      {
        AjaxAccountant.sendTimeout = undefined;
      }
    } else
    {
      AjaxAccountant.sendTimeout = undefined;
    }
  }
}