var MEMORY = (function(){

  var mem = {};

  var memArray = new Array(0xffff);

  mem.readByte = function(location)
  {
    return memArray[location];
  };

  mem.writeByte = function(location, data)
  {
    if(location > memArray.length)
    {
      throw "ERROR: Trying to write memory past max index, you gave me: " + location.toString(16);
    }
    memArray[location] = data;
  }

  mem.loadBinary = function(startAddr, binaryString)
  {
    if((memArray.length - startAddr) < binaryString.length)
    {
      throw "ERROR: Not enough memory to load binary data provided."
    }else
    {
      var i;
      for(i = 0; i < binaryString.length; i++)
      {
        mem.writeByte(startAddr + i, binaryString.charCodeAt(i));
      }
    }
  }

  mem.clear = function()
  {
    var i;
    for(i = 0; i < memArray.length; i++)
    {
      memArray[i] = 0;
    }
  }

  mem.clear(); //temporary

  return mem;
}());
