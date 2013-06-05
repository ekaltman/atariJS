var utils = (function()
{
  //Helpful data structures
  function CircularBuffer(size)
  {
    var index = 0;
    var circArray = new Array(size);

    this.push = function(item)
    {
      circArray[index % size] = item;
      index++;
    }

    this.getItemAt = function(pos)
    {
      return circArray[pos];
    }

    this.currentIndex = function()
    {
      return index;
    }
  }

  return {
    toHexString: function(value)
    {
      hexMap = ["0","1","2","3","4",
                "5","6","7","8","9",
                "A","B","C","D","E","F"];

      hexString = "0x";

      if(value > 0xFFFF)
      { 
        throw "cannot convert to hex values larger than 0xFFFF (65535), you gave me: " + value;
      }

      if((v = Math.floor(value / 0x1000)) > 0)
      {
        hexString += hexMap[v];
        value -= v * 0x1000;
      }

      if((v = Math.floor(value / 0x100)) > 0)
      {
        hexString += hexMap[v];
        value -= v * 0x100;
      }else
      {
        if(hexString.length === 3) hexString += "0";
      }

      if((v = Math.floor(value / 0x10)) > 0)
      {
        hexString += hexMap[v];
        value -= v * 0x10;
      }else
      {
        if(hexString.length === 3 || hexString.length === 4) hexString += "0";
      }

      return hexString + hexMap[value];
    },
    formatToDigits: function(stringValue, digits)
    {
      var i;
      var diff = digits - stringValue.length;
      var leads = "";
      if(diff > 0)
      {
        for(i = 0; i < diff; i++)
        {
          leads += "0";
        }
      }

      return leads + stringValue;
    },
    regCopy: function(reg)
    {
      var newReg = new Object();
      newReg.A = reg.A;
      newReg.X = reg.X;
      newReg.Y = reg.Y;
      newReg.PC = reg.PC;
      newReg.S = reg.S;
      newReg.P = reg.P;
      return newReg;
    },
    regDiff: function(regPre, regPost)
    {
      var changes = {};
      for( reg in regPre)
      {
        if(regPre[reg] !== regPost[reg])
        {
          changes[reg] = {}; 
          changes[reg].pre = regPre[reg];
          changes[reg].post = regPost[reg];
        }
      }
      return changes;
    },
    toBCD: function(binaryValue)
    {
      var tenDigit = binaryValue >> 4;
      var oneDigit = binaryValue & 15;
      return tenDigit * 10 + oneDigit;
    },
    fromBCD: function(bcdValue)
    {
      if(bcdValue > 99)
      {
        bcdValue -= 100;
      }else if(bcdValue < 0)
      {
        bcdValue = 100 - Math.abs(bcdValue);
      }
      var tenDigit = Math.floor(bcdValue / 10);
      var oneDigit = bcdValue % 10;

      return (tenDigit << 4) + oneDigit;
    },
    fromTwosComplement: function(unsignedBinaryValue)
    {
      return ((unsignedBinaryValue & 0xFF) > 127 ? (unsignedBinaryValue | 0xFFFFFF00) : unsignedBinaryValue);
    },
    createCircBuffer: function(size)
    {
      return new CircularBuffer(size);
    }
  }
}());

