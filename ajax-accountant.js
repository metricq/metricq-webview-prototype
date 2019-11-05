var AjaxAccountant = {
  reqArray: new Array(),
  reqIndex: 0,
  sendTimeout: undefined,
  timeoutDuration: 2000,
  newRequest: function(httpMethod, httpUrl)
  {
  	var newReq = new XMLHttpRequest();
  	newReq.open(httpMethod, httpUrl);
  	newReq.requestId = AjaxAccountant.reqIndex ++;
  	AjaxAccountant.reqArray.push(newReq);
  	return newReq;
  },
  sendRequest: function(ajaxObject, sendData)
  {
  	var sendTime = (newDate()).getTime();
  	ajaxObject.requestSendTime = sendTime;
    ajaxObject.send(sendData);
    if(undefined === AjaxAccountant.sendTimeout)
    {
      AjaxAccountant.sendTimeout = new Object();
      AjaxAccountant.sendTimeout.listenId = ajaxObject.requestId;
      AjaxAccountant.sendTimeout.timeoutId = setTimeout(AjaxAccountant.handleRequestTimeout, AjaxAccountant.timeoutDuration);
    }
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
  	  if(4 > pertainingReq.readyState)
  	  {
  	    try {
          pertainingReq.onreadystatechange = undefined;
    	  pertainingReq.abort();
  	    } catch(ext)
    	{
  	  	  // do nothing about it
  	    }
  	  }
  	  AjaxAccountant.reqArray.splice(pertainingIndex, 1);
  	}
    //check if there are other requests to handle
    if(0 < AjaxAccountant.reqArray.length)
    {
      var oldestRequestTime = AjaxAccountant.reqArray[0].requestSendTime;
      var oldestRequestIndex = 0;
      for(var i = 1; i < AjaxAccountant.reqArray.length; ++i)
      {
      	if(AjaxAccountant.reqArray[i].requestSendTime < oldestRequestTime)
      	{
      	  oldestRequestTime = AjaxAccountant.reqArray[i].requestSendTime;
      	  oldestRequestIndex = i;
      	}
      }
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
  }
}