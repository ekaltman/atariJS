var MEMORY = (function(){

  var mem = {};

  var memArray = new Array(0x10000);

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
    mem.clear();
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

  mem.hexDump = function()
  {
    var dumpStartAddress = 0xF000;
    var lineSize = 16;
    var dump = "";

    var i;
    for(i = dumpStartAddress; i < 0x10000; i++)
    {
      if(i % 16 === 0)
      {
        dump += '\n' + i.toString(16).toUpperCase() + " " + utils.formatToDigits(memArray[i].toString(16).toUpperCase(), 2);
      }else
      {
        dump += " " + utils.formatToDigits(memArray[i].toString(16).toUpperCase(), 2);
      } 
    }

    return dump;
  }

  mem.clear(); //temporary

  return mem;
}());
