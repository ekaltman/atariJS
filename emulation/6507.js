var CPU_6507 = (function (cpu, mem) {

  //Debug
  var that = this;
  this._debugOutput = "";
  cpu.debugOutput = function(outputTarget)
  {
    that._debugOutput = outputTarget;
  }

  var _debug = 
  {
    OFF:0, 
    LIGHT:1, 
    VERBOSE:2,
    trace: [],
    reset: function()
    {
      this.trace = [];
    },
    print: function(msg)
    {
      if(that._debugOutput)
      {
        if($(that._debugOutput).length > 0)
        {
          $(that._debugOutput).text(msg);
        }
      }else
      {
        console.log(msg);
      }
    },
    printTrace: function(trace)
    {
      var status = "";

      for( prop in trace)
      {
        if(prop !== "changes")
        {
          status += prop + ": " + trace[prop] + "\n";
        }else
        {
          var changes = trace[prop];
          for(reg in changes)
          {
            status += "\t" + reg + ": ";
            if(reg !== "P") //Status register easier to read in binary
            {
              status += "0x" + changes[reg].pre.toString(16);
              status += " -> 0x" + changes[reg].post.toString(16) + "\n";
            }else
            {
              status += "0b" + changes[reg].pre.toString(2);
              status += " -> 0b" + changes[reg].post.toString(2) + "\n";
            }
          }
        }
      }

      this.print(status);
    },
    analyze: function(opFunc, addrFunc, clocks)
    {
      var traceObj = {};
      traceObj.op = opFunc.name.split("_")[0];
      traceObj.sources = [];
      var oldReg = utils.regCopy(cpu.reg);

      //Get op and addr function information pre-execution
      if(addrFunc)
      {
        traceObj.addrMode = addrFunc.name;
        traceObj.numSources = cpu.addr.sources[addrFunc.name];
        traceObj.memLocation = addrFunc();
        traceObj.memValue = cpu.mem.readByte(traceObj.memLocation);
      }else if(traceObj.op.name === "JMP" || traceObj.op.name === "JSR")
      {
        traceObj.numSources = 2;
      }else
      {
        traceObj.numSources = 0;
      }

      var i;
      for(i = 0; i < traceObj.numSources; i++)
      {
        traceObj.sources[i] = mem.readByte(cpu.reg.PC + 1 + i)
      }

      //Run op
      if(clocks)
      {
        cpu.inst_cc = clocks;
      }

      if(addrFunc)
      {
        opFunc(traceObj.memValue, traceObj.memLocation);
      }else
      {
        opFunc();
      }
      cpu.addr.advancePC(addrFunc);

      //Store results and transition state change
      traceObj.changes = utils.regDiff(oldReg, cpu.reg);
      this.trace.push(traceObj);
      this.printTrace(traceObj);
    }
  };
  cpu.debug = _debug.LIGHT;

  cpu.running = false;
  cpu.mem = mem;

  //Cycle Count
  cpu.cc = 0;

  //Current instruction cycles
  //decrement by 1 per step
  cpu.inst_cc = 0;

  cpu.step = function () 
  {
    if(cpu.inst_cc == 0)
    {
      cpu.map[mem.readByte(cpu.reg.PC)].execute();
    }else
    {
      cpu.inst_cc -= 1;
    }
    cpu.cc++;
  };

  cpu.reset = function()
  {
    cpu.reg = {A:0, X:0, Y:0, PC:0xF000, S:0xFF, P:0};
    _debug.reset();
  };

  cpu.reg = 
  {
    A:0,        //Accumulator
    X:0,        //Index X
    Y:0,        //Index Y
    PC:0xf000,  //Program Counter, counts up from 0xf000 - 0xffff, mirrorred every 0x2000
    S:0,     //Stack Pointer, counts down from 0xff (255) to 0x80 (128), only 128 bytes of RAM
    P:0         //Program Status Register, see below
  };

  //Memory Addressing Modes
  cpu.addr = 
  {
    sources: {"im":1, "zp": 1, "zpX":1, "zpY":1, 
              "abs": 2, "absX":2, "absY":2, "pre":1, "post":1},
    advancePC: function (addrMode)
        {
          if(addrMode)
          {
            if(addrMode.name.slice(0,3) === "abs")
            {
              cpu.reg.PC += 3;
            }else
            {
              cpu.reg.PC += 2;
            }
          }
        },
    // #FF Immediate Mode
    im: function im()
        {
          var v = cpu.mem.readByte(cpu.reg.PC + 1);
          if(v > 0xFF)
          {
            throw "ERROR: immediate mode cannot exceed 0xff received " + v.toString(16);
          }

          return cpu.reg.PC + 1;
        },
    // [NN] Zero Page 
    zp: function zp()
        {
          var v = cpu.mem.readByte(cpu.reg.PC + 1);
          if(v > 0xFF)
          {
            throw "ERROR: zero page cannot exceed 0xff, received " + v.toString(16);
          }

          return v;
        },
    // [NN + X] Zero Page X Indexed 
    zpX: function zpX()
        {
          var v = cpu.mem.readByte(cpu.reg.PC + 1);
          if( v > 0xFF)
          {
            throw "ERROR: zero page X cannot exceed 0xff, received " + v.toString(16);
          }

          return (v + cpu.reg.X) % 0x100;
        },
    // [NN + Y] Zero Page Y Indexed
    zpY: function zpY()
        {
          var v = cpu.mem.readByte(cpu.reg.PC + 1);
          if( v > 0xFF)
          {
            throw "ERROR: zero page Y cannot exceed 0xff, received " + v.toString(16); 
          }

          return (v + cpu.reg.Y) % 0x100;
        },
    // [NNNN] Absolute
    abs: function abs()
        {
          var lo = cpu.mem.readByte(cpu.reg.PC + 1);
          var hi = cpu.mem.readByte(cpu.reg.PC + 2);
          var v = (hi << 8) + lo;
          if( v > 0xFFFF)
          {
            throw "ERROR: absolute address cannot exceed 0xffff, received " + v.toString(16);
          }else if (v > 0x1FFF)
          {
            _debug.print("WARNING: absolute address past 6507 limits: " + v.toString(16));
          }

          return v;
        },
    // [NNNN + X] Absolute X Indexed
    absX: function absX(check_page)
        {
          var lo = cpu.mem.readByte(cpu.reg.PC + 1);
          var hi = cpu.mem.readByte(cpu.reg.PC + 2);
          var v = (hi << 8) + lo;
          if(v > 0xFFFF)
          {
            throw "ERROR: indexed X absolute address cannot exceed 0xffff, received " + v.toString(16);
          }

          if(((cpu.reg.X + V) % 0x100) != (V % 0x100)) //page boundary crossed
          {
            cpu.inst_cc += 1;
          }

          return (cpu.reg.X + v) % 0x10000;
        },
    // [NNNN + Y] Absolute Y Indexed
    absY: function absY(check_page)
        {
          var lo = cpu.mem.readByte(cpu.reg.PC + 1);
          var hi = cpu.mem.readByte(cpu.reg.PC + 2);
          var v = (hi << 8) + lo;
          if(v > 0xFFFF)
          {
            throw "ERROR: indexed Y absolute address cannot exceed 0xffff, received " + v.toString(16) 
          }

          if(((cpu.reg.Y + v) % 0x100) != (v % 0x100)) //page boundary crossed
          {
            cpu.inst_cc += 1;
          }

          return (cpu.reg.Y + v) % 0x10000;
        },
    // Pre-Indexed Indirect (only Zero Page)
    pre: function pre()
        {
          var v = cpu.mem.readByte(cpu.reg.PC + 1);
          if( v > 0xFF)
          {
            throw "ERROR: pre indirect cannot exceed 0xff, received " + v.toString(16);
          }

          var addr = (cpu.reg.X + v) % 0x100;
          var lo = mem.readByte(addr);
          var hi = mem.readByte(addr + 1);

          return (hi << 8) + lo;
        },
    post: function post(v)
        {
          var v = cpu.mem.readByte(cpu.reg.PC + 1);
          if( v > 0xFF)
          {
            throw "ERROR: post indirect cannot exceed 0xff, received " + v.toString(16);
          }

          var lo = mem.readByte(v);
          var hi = mem.readByte(v + 1);

          var addr = (hi << 8) + lo;

          if(addr % 0x100 != (addr + cpu.reg.Y) % 0x100) //page boundary crossed
          {
            cpu.inst_cc += 1;
          }

          return addr + cpu.reg.Y;
        }
  };

  cpu.P_STATUS = 
  {
    N: function(){ return ((cpu.reg.P & 0x80) >> 7)}, //Negative 1 = True
    V: function(){ return ((cpu.reg.P & 0x40) >> 6)}, //Overflow 1 = True
    B: function(){ return ((cpu.reg.P & 0x10) >> 4)}, //BRK COMMAND
    D: function(){ return ((cpu.reg.P & 0x8) >> 3)},  //DECIMAL MODE 1 = True
    I: function(){ return ((cpu.reg.P & 0x4) >> 2)},  //IRQ Disable 1 = Disable
    Z: function(){ return ((cpu.reg.P & 0x2) >> 1)},  //ZERO 1 = True
    C: function(){ return cpu.reg.P & 0x1 }        //Carry 1 = True
  };

  cpu.P_SET = 
  {
    N: function(val) { cpu.reg.P = (val ? (cpu.reg.P | 0x80) : (cpu.reg.P & 0x7F)) },
    V: function(val) { cpu.reg.P = (val ? (cpu.reg.P | 0x40) : (cpu.reg.P & 0x5F)) },
    B: function(val) { cpu.reg.P = (val ? (cpu.reg.P | 0x10) : (cpu.reg.P & 0x77)) },
    D: function(val) { cpu.reg.P = (val ? (cpu.reg.P | 0x8) : (cpu.reg.P & 0xF7)) },
    I: function(val) { cpu.reg.P = (val ? (cpu.reg.P | 0x4) : (cpu.reg.P & 0xFB)) },
    Z: function(val) { cpu.reg.P = (val ? (cpu.reg.P | 0x2) : (cpu.reg.P & 0xFD)) },
    C: function(val) { cpu.reg.P = (val ? (cpu.reg.P | 0x1) : (cpu.reg.P & 0xFE))}
  };

  //Op codes and function definitions
  cpu.map = [];

  function Op(opFunc, addrFunc, clocks) {
    this.op = opFunc;
    this.addrMode = addrFunc;
    this.execute = function(){
      if(!cpu.debug)
      {
        if(clocks)
        {
          cpu.inst_cc = clocks;
        }

        if(this.addrMode)
        {
          var location = this.addrMode();
          var val = cpu.mem.readByte(location);
          this.op(val, location);
        }else
        {
          this.op();
        }
        cpu.addr.advancePC(this.addrMode);
      }else
      {
        _debug.analyze(this.op, this.addrMode, clocks)
      }
    }
  }

  //Add with carry
  var ADC = function ADC(value)
  {
    var a = cpu.reg.A;
    var r;

    //check for decimal mode setting
    //info on decimal mode flags found at:
    //http://www.6502.org/tutorials/decimal_mode.html
    if(cpu.P_STATUS.D()) 
    {
      //Convert to BCD 
      var aBCD = utils.toBCD(a);
      var valBCD = utils.toBCD(value);

      r = aBCD + valBCD + cpu.P_STATUS.C();

      cpu.P_SET.C((r > 99)); //Carry set in this case
      r = r % 0x100;
      r = utils.fromBCD(r); //Revert to binary
    }else
    {
      r = a + value + cpu.P_STATUS.C();
      cpu.P_SET.C((r > 255));
      r = r % 0x100; //restrict to 8 bits for register updates and status checks
    }

    //Set status flags
    //N and V bit results only function for binary addition
    //N is highest bit in A 
    //V is set if either both high bits are 1 and result high bit is a 0 
    //or if both high bits are 0 and result high bit is a 1
    cpu.P_SET.Z((r === 0));
    cpu.P_SET.N((r > 127));
    //Check for overflow, good explanation here:
    //http://teaching.idallen.com/dat2343/10f/notes/040_overflow.txt
    cpu.P_SET.V((a < 128 && value < 128 && cpu.reg.A > 127) || (a > 127 && value > 127 && cpu.reg.A < 128));

    cpu.reg.A = r;
  }

  cpu.map[cpu.inst.ADC_im]    = new Op(ADC, cpu.addr.im,    2);
  cpu.map[cpu.inst.ADC_zp]    = new Op(ADC, cpu.addr.zp,    3);
  cpu.map[cpu.inst.ADC_zpX]   = new Op(ADC, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.ADC_abs]   = new Op(ADC, cpu.addr.abs,   4);
  cpu.map[cpu.inst.ADC_absX]  = new Op(ADC, cpu.addr.absX,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.ADC_absY]  = new Op(ADC, cpu.addr.absY,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.ADC_pre]   = new Op(ADC, cpu.addr.pre,   6);
  cpu.map[cpu.inst.ADC_post]  = new Op(ADC, cpu.addr.post,  5); //+1 if page boundary crossed

  //Logical AND with accumulator
  var AND = function AND(value)
  {
    cpu.reg.A &= value;
    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0));
  }

  cpu.map[cpu.inst.AND_im]    = new Op(AND, cpu.addr.im,    2);
  cpu.map[cpu.inst.AND_zp]    = new Op(AND, cpu.addr.zp,    3);
  cpu.map[cpu.inst.AND_zpX]   = new Op(AND, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.AND_abs]   = new Op(AND, cpu.addr.abs,   4);
  cpu.map[cpu.inst.AND_absX]  = new Op(AND, cpu.addr.absX,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.AND_absY]  = new Op(AND, cpu.addr.absY,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.AND_pre]   = new Op(AND, cpu.addr.pre,   6);
  cpu.map[cpu.inst.AND_post]  = new Op(AND, cpu.addr.post,  5); //+1 if page boundary crossed

  //Shift accumulator left
  var ASL_A = function ASL_A()
  {
    cpu.reg.A = cpu.reg.A << 1;
    cpu.P_SET.C((cpu.reg.A >> 8));
    cpu.reg.A = cpu.reg.A % 0x100
    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.ASL_A] = new Op(ASL_A, null, 2);

  //Shift memory location left
  var ASL = function ASL(value, location)
  {
    var v = value << 1;
    cpu.P_SET.C((v >> 8));
    v = v % 0x100;
    cpu.P_SET.N((v > 127));
    cpu.P_SET.Z((v === 0));

    mem.writeByte(location, v);
  }

  cpu.map[cpu.inst.ASL_zp]    = new Op(ASL, cpu.addr.zp,    5);
  cpu.map[cpu.inst.ASL_zpX]   = new Op(ASL, cpu.addr.zpX,   6);
  cpu.map[cpu.inst.ASL_abs]   = new Op(ASL, cpu.addr.abs,   6);
  cpu.map[cpu.inst.ASL_absX]  = new Op(ASL, cpu.addr.absX,  7);

  //Branch if carry clear
  var BCC_BLT = function BCC()
  {
    var value = mem.readByte(cpu.reg.PC + 1);
    if(cpu.P_STATUS.C())
    {
      cpu.reg.PC +=2
    }else
    {
      var dest = cpu.reg.PC + 2 + value;
      cpu.inst_cc += 1;
      if(cpu.reg.PC % 0x100 != dest % 0x100) //check if page boundary crossed
      {
        cpu.inst_cc += 1;
      }
      cpu.reg.PC = cpu.reg.PC + 2 + value;
    }
  }

  cpu.map[cpu.inst.BCC_BLT] = new Op(BCC_BLT, null, 2);

  //Branch if carry set
  var BCS_BGE = function BCS()
  {
    var value = mem.readByte(cpu.reg.PC + 1);
    if(!cpu.P_STATUS.C())
    {
      cpu.reg.PC +=2
    }else
    {
      var dest = cpu.reg.PC + 2 + value;
      cpu.inst_cc += 1;
      if(cpu.reg.PC % 0x100 != dest % 0x100) //check if page boundary crossed
      {
        cpu.inst_cc += 1;
      }
      cpu.reg.PC = cpu.reg.PC + 2 + value;
    }
  }

  cpu.map[cpu.inst.BCS_BGE] = new Op(BCS_BGE, null, 2);

  //Branch if equal to zero
  var BEQ_BZS = function BEQ()
  {
    var value = mem.readByte(cpu.reg.PC + 1);
    if(!cpu.P_STATUS.Z())
    {
      cpu.reg.PC +=2
    }else
    {
      var dest = cpu.reg.PC + 2 + value;
      cpu.inst_cc += 1;
      if(cpu.reg.PC % 0x100 != dest % 0x100) //check if page boundary crossed
      {
        cpu.inst_cc += 1;
      }
      cpu.reg.PC = cpu.reg.PC + 2 + value;
    }
  }

  cpu.map[cpu.inst.BEQ_BZS] = new Op(BEQ_BZS, null, 2);

  //Bit Test - see 6507_ops.js for more information
  var BIT = function BIT(value)
  {
    var r = cpu.reg.A & value;
    cpu.P_SET.Z((r === 0));
    cpu.P_SET.N((value > 127));
    cpu.P_SET.V((value & 0x20) >> 5);
  }

  cpu.map[cpu.inst.BIT_zp]  = new Op(BIT, cpu.addr.zp,  3);
  cpu.map[cpu.inst.BIT_abs] = new Op(BIT, cpu.addr.abs, 4);

  //Branch if minus
  var BMI = function BMI()
  {
    var value = mem.readByte(cpu.reg.PC + 1);
    if(!cpu.P_STATUS.N())
    {
      cpu.reg.PC +=2
    }else
    {
      var dest = cpu.reg.PC + 2 + value;
      cpu.inst_cc += 1;
      if(cpu.reg.PC % 0x100 != dest % 0x100) //check if page boundary crossed
      {
        cpu.inst_cc += 1;
      }
      cpu.reg.PC = cpu.reg.PC + 2 + value;
    }
  }

  cpu.map[cpu.inst.BMI] = new Op(BMI, null, 2);

  //Branch if not equal zero
  var BNE = function BNE()
  {
    //Branch source value is a signed 8-bit integer
    var value = utils.fromTwosComplement(mem.readByte(cpu.reg.PC + 1));

    if(cpu.P_STATUS.Z())
    {
      cpu.reg.PC +=2
    }else
    {
      var dest = cpu.reg.PC + 2 + value;
      cpu.inst_cc += 1;
      if(cpu.reg.PC % 0x100 != dest % 0x100) //check if page boundary crossed
      {
        cpu.inst_cc += 1;
      }
      cpu.reg.PC = cpu.reg.PC + 2 + value;
    }
  }

  cpu.map[cpu.inst.BNE_BZC] = new Op(BNE, null, 2);

  //Branch if plus / positive
  var BPL = function BPL()
  {
    var value = utils.fromTwosComplement(mem.readByte(cpu.reg.PC + 1));
    if(cpu.P_STATUS.N())
    {
      cpu.reg.PC +=2
    }else
    {
      var dest = cpu.reg.PC + 2 + value;
      cpu.inst_cc += 1;
      if(cpu.reg.PC % 0x100 != dest % 0x100) //check if page boundary crossed
      {
        cpu.inst_cc += 1;
      }
      cpu.reg.PC = cpu.reg.PC + 2 + value;
    }
  }

  cpu.map[cpu.inst.BPL] = new Op(BPL, null, 2);

  //Force break
  var BRK = function BRK()
  {
    cpu.P_SET.B(1);
    cpu.reg.PC += 2;
    mem.writeByte(cpu.reg.S, cpu.reg.PC >> 8);
    mem.writeByte(cpu.reg.S - 1, cpu.reg.PC & 0xFF);
    mem.writeByte(cpu.reg.S - 2, cpu.reg.P);
    cpu.reg.S -= 3;

    //Write Interrupt Pointer to PC
    var ipHi = mem.readByte(0xFFFF);
    var ipLo = mem.readByte(0xFFFE);
    cpu.reg.PC = (ipHi << 8) + ipLo;
  }

  cpu.map[cpu.inst.BRK] = new Op(BRK, null, 7);

  //Branch if overflow clear
  var BVC = function BVC()
  {
    var value = utils.fromTwosComplement(mem.readByte(cpu.reg.PC + 1));
    if(cpu.P_STATUS.V())
    {
      cpu.reg.PC +=2
    }else
    {
      var dest = cpu.reg.PC + 2 + value;
      cpu.inst_cc += 1;
      if(cpu.reg.PC % 0x100 != dest % 0x100) //check if page boundary crossed
      {
        cpu.inst_cc += 1;
      }
      cpu.reg.PC = cpu.reg.PC + 2 + value;
    }
  }

  cpu.map[cpu.inst.BVC] = new Op(BVC, null, 2);

  //Branch if overflow set
  var BVS = function BVS()
  {
    var value = utils.fromTwosComplement(mem.readByte(cpu.reg.PC + 1));
    if(!cpu.P_STATUS.V())
    {
      cpu.reg.PC +=2
    }else
    {
      var dest = cpu.reg.PC + 2 + value;
      cpu.inst_cc += 1;
      if(cpu.reg.PC % 0x100 != dest % 0x100) //check if page boundary crossed
      {
        cpu.inst_cc += 1;
      }
      cpu.reg.PC = cpu.reg.PC + 2 + value;
    }
  }

  cpu.map[cpu.inst.BVS] = new Op(BVS, null, 2);

  //Clear carry
  var CLC = function CLC()
  {
    cpu.P_SET.C(0);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.CLC] = new Op(CLC, null, 2);

  //Clear decimal mode 
  var CLD = function CLD()
  {
    cpu.P_SET.D(0);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.CLD] = new Op(CLD, null, 2);

  //Clear interrupt mask
  var CLI = function CLI()
  {
    cpu.P_SET.I(0);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.CLI] = new Op(CLI, null, 2);

  //Clear overflow
  var CLV = function CLV()
  {
    cpu.P_SET.V(0);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.CLV] = new Op(CLV, null, 2);

  //Compare memory with accumulator
  var CMP = function CMP(value)
  {
    var r = cpu.reg.A - value;

    cpu.P_SET.N((r > 127));
    cpu.P_SET.C((r < 255));
    cpu.P_SET.Z((r === 0));
  }

  cpu.map[cpu.inst.CMP_im]    = new Op(CMP, cpu.addr.im,    2);
  cpu.map[cpu.inst.CMP_zp]    = new Op(CMP, cpu.addr.zp,    3);
  cpu.map[cpu.inst.CMP_zpX]   = new Op(CMP, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.CMP_abs]   = new Op(CMP, cpu.addr.abs,   4);
  cpu.map[cpu.inst.CMP_absX]  = new Op(CMP, cpu.addr.absX,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.CMP_absY]  = new Op(CMP, cpu.addr.absY,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.CMP_pre]   = new Op(CMP, cpu.addr.pre,   6);
  cpu.map[cpu.inst.CMP_post]  = new Op(CMP, cpu.addr.post,  5); //+1 if page boundary crossed

  //Compare memory with index register X
  var CPX = function CPX(value)
  {
    var r = cpu.reg.X - value;

    cpu.P_SET.N((r > 127));
    cpu.P_SET.C((r < 255));
    cpu.P_SET.Z((r === 0));
  }

  cpu.map[cpu.inst.CPX_im]    = new Op(CPX, cpu.addr.im,  2);
  cpu.map[cpu.inst.CPX_zp]    = new Op(CPX, cpu.addr.zp,  3);
  cpu.map[cpu.inst.CPX_abs]   = new Op(CPX, cpu.addr.abs, 4);

  //Compare memory with index register X
  var CPY = function CPY(value)
  {
    var r = cpu.reg.Y - value;

    cpu.P_SET.N((r > 127));
    cpu.P_SET.C((r < 255));
    cpu.P_SET.Z((r === 0));
  }

  cpu.map[cpu.inst.CPY_im]    = new Op(CPY, cpu.addr.im,  2);
  cpu.map[cpu.inst.CPY_zp]    = new Op(CPY, cpu.addr.zp,  3);
  cpu.map[cpu.inst.CPY_abs]   = new Op(CPY, cpu.addr.abs, 4);

  //Decrement memory by 1
  var DEC = function DEC(value, location)
  {
    var val = (value - 1) % 0x100;
    cpu.P_SET.N((val > 127));
    cpu.P_SET.Z((val === 0));
    mem.writeByte(location, val);
  }

  cpu.map[cpu.inst.DEC_zp]    = new Op(DEC, cpu.addr.zp,    5);
  cpu.map[cpu.inst.DEC_zpX]   = new Op(DEC, cpu.addr.zpX,   6);
  cpu.map[cpu.inst.DEC_abs]   = new Op(DEC, cpu.addr.abs,   6);
  cpu.map[cpu.inst.DEC_absX]  = new Op(DEC, cpu.addr.absX,  7);

  //Decrement index register X by 1
  var DEX = function DEX()
  {
    var val = (cpu.reg.X - 1) % 0x100;
    cpu.P_SET.N((val > 127));
    cpu.P_SET.Z((val === 0));
    cpu.reg.X = val;
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.DEX]    = new Op(DEX, null, 2);

  //Decrement index register Y by 1
  var DEY = function DEY()
  {
    var val = (cpu.reg.Y - 1) % 0x100;
    cpu.P_SET.N((val > 127));
    cpu.P_SET.Z((val === 0));
    cpu.reg.Y = val;
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.DEY]    = new Op(DEY, null, 2);

  //Exclusive OR accumulator with memory
  var EOR = function EOR(value)
  {
    cpu.reg.A = cpu.reg.A ^ value;
    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0));
  }
  cpu.map[cpu.inst.EOR_im]    = new Op(EOR, cpu.addr.im,    2);
  cpu.map[cpu.inst.EOR_zp]    = new Op(EOR, cpu.addr.zp,    3);
  cpu.map[cpu.inst.EOR_zpX]   = new Op(EOR, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.EOR_abs]   = new Op(EOR, cpu.addr.abs,   4);
  cpu.map[cpu.inst.EOR_absX]  = new Op(EOR, cpu.addr.absX,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.EOR_absY]  = new Op(EOR, cpu.addr.absY,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.EOR_pre]   = new Op(EOR, cpu.addr.pre,   6);
  cpu.map[cpu.inst.EOR_post]  = new Op(EOR, cpu.addr.post,  5); //+1 if page boundary crossed

  //Increment memory by 1
  var INC = function INC(value, location)
  {
    var val = (value + 1) % 0x100;
    cpu.P_SET.N((val > 127));
    cpu.P_SET.Z((val === 0));
    mem.writeByte(location, val);
  }

  cpu.map[cpu.inst.INC_zp]    = new Op(INC, cpu.addr.zp,    5);
  cpu.map[cpu.inst.INC_zpX]   = new Op(INC, cpu.addr.zpX,   6);
  cpu.map[cpu.inst.INC_abs]   = new Op(INC, cpu.addr.abs,   6);
  cpu.map[cpu.inst.INC_absX]  = new Op(INC, cpu.addr.absX,  7);

  //Increment index register X by 1
  var INX = function INX()
  {
    var val = (cpu.reg.X + 1) % 0x100;
    cpu.P_SET.N((val > 127));
    cpu.P_SET.Z((val === 0));
    cpu.reg.X = val;
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.INX]    = new Op(INX, null, 2);

  //Increment index register Y by 1
  var INY = function INY()
  {
    var val = (cpu.reg.Y + 1) % 0x100;
    cpu.P_SET.N((val > 127));
    cpu.P_SET.Z((val === 0));
    cpu.reg.Y = val;
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.INY]    = new Op(INY, null, 2);

  //Jump via absolute or indirect addressing
  var JMP_indir = function JMP_indir()
  {
    var hiAddr = mem.readByte(cpu.reg.PC + 2);
    var loAddr = mem.readByte(cpu.reg.PC + 1);

    var hiLoc = mem.readByte((hiAddr << 8) + loAddr + 1);
    var loLoc = mem.readByte((hiAddr << 8) + loAddr);

    cpu.reg.PC = (hiLoc << 8) + loLoc;
  }

  cpu.map[cpu.inst.JMP_indir] = new Op(JMP_indir, null, 5);

  var JMP_dir = function JMP_dir()
  {
    var hiLoc = mem.readByte(cpu.reg.PC + 2);
    var loLoc = mem.readByte(cpu.reg.PC + 1);

    cpu.reg.PC = (hiLoc << 8) + loLoc;
  }

  cpu.map[cpu.inst.JMP_dir] = new Op(JMP_dir, null, 3);

  //Jump to subroutine
  var JSR = function JSR()
  {
    var lo = mem.readByte(cpu.reg.PC + 1);
    var hi = mem.readByte(cpu.reg.PC + 2);

    cpu.reg.PC += 2;
    mem.writeByte(cpu.reg.S, cpu.reg.PC >> 8);
    mem.writeByte(cpu.reg.S - 1, cpu.reg.PC & 0xF);
    cpu.reg.S -= 2;

    cpu.reg.PC = (hi << 8) + lo;
  }

  cpu.map[cpu.inst.JSR] = new Op(JSR, null, 6);

  //Load accumulator from memory or immediate
  var LDA = function LDA(value)
  {
    cpu.reg.A = value;
    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0));
  }

  cpu.map[cpu.inst.LDA_im]    = new Op(LDA, cpu.addr.im,    2);
  cpu.map[cpu.inst.LDA_zp]    = new Op(LDA, cpu.addr.zp,    3);
  cpu.map[cpu.inst.LDA_zpX]   = new Op(LDA, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.LDA_abs]   = new Op(LDA, cpu.addr.abs,   4);
  cpu.map[cpu.inst.LDA_absX]  = new Op(LDA, cpu.addr.absX,  4); //+1 for page boundary crossed
  cpu.map[cpu.inst.LDA_absY]  = new Op(LDA, cpu.addr.absY,  4); //+1 for page boundary crossed
  cpu.map[cpu.inst.LDA_pre]   = new Op(LDA, cpu.addr.pre,   6);
  cpu.map[cpu.inst.LDA_post]  = new Op(LDA, cpu.addr.post,  5); //+1 for page boundary crossed

  //Load index X from memory or immediate
  var LDX = function LDX(value)
  {
    cpu.reg.X = value;
    cpu.P_SET.N((cpu.reg.X > 127));
    cpu.P_SET.Z((cpu.reg.X === 0));
  }

  cpu.map[cpu.inst.LDX_im] = new Op(LDX, cpu.addr.im,     2);
  cpu.map[cpu.inst.LDX_zp] = new Op(LDX, cpu.addr.zp,     3);
  cpu.map[cpu.inst.LDX_zpY] = new Op(LDX, cpu.addr.zpY,   4);
  cpu.map[cpu.inst.LDX_abs] = new Op(LDX, cpu.addr.abs,   4);
  cpu.map[cpu.inst.LDX_absY] = new Op(LDX, cpu.addr.absY, 4); //+1 for page boundary crossed

  //Load index Y from memory or immediate
  var LDY = function LDY(value)
  {
    cpu.reg.Y = value;
    cpu.P_SET.N((cpu.reg.Y > 127));
    cpu.P_SET.Z((cpu.reg.Y === 0));
  }

  cpu.map[cpu.inst.LDY_im] = new Op(LDY, cpu.addr.im,     2);
  cpu.map[cpu.inst.LDY_zp] = new Op(LDY, cpu.addr.zp,     3);
  cpu.map[cpu.inst.LDY_zpX] = new Op(LDY, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.LDY_abs] = new Op(LDY, cpu.addr.abs,   4);
  cpu.map[cpu.inst.LDY_absX] = new Op(LDY, cpu.addr.absX, 4); //+1 for page boundary crossed

  //Logical shift right
  var LSR_A = function LSR_A()
  {
    cpu.P_SET.C((cpu.reg.A & 1));
    cpu.reg.A = cpu.reg >> 1;
    cpu.P_SET.N(0);
    cpu.P_SET.Z((cpu.reg.A === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.LSR_A] = new Op(LSR_A, null, 2);

  var LSR = function LSR(value, location)
  {
    var val = value >> 1;
    cpu.P_SET.C((val & 1));
    cpu.P_SET.N(0);
    cpu.P_SET.Z((val === 0));
    cpu.reg.PC += 1;
    mem.writeByte(location, val);
  }

  cpu.map[cpu.inst.LSR_zp] = new Op(LSR, cpu.addr.zp,     5);
  cpu.map[cpu.inst.LSR_zpX] = new Op(LSR, cpu.addr.zpX,   6);
  cpu.map[cpu.inst.LSR_abs] = new Op(LSR, cpu.addr.abs,   6);
  cpu.map[cpu.inst.LSR_absX] = new Op(LSR, cpu.addr.absX, 7);

  //No op
  var NOP = function NOP()
  {
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.NOP] = new Op(NOP, null, 2);

  //Logical OR memory with accumulator
  var ORA = function ORA(value)
  {
    cpu.reg.A = cpu.reg.A | value;
    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0));
  }

  cpu.map[cpu.inst.ORA_im]    = new Op(ORA, cpu.addr.im,    2);
  cpu.map[cpu.inst.ORA_zp]    = new Op(ORA, cpu.addr.zp,    3);
  cpu.map[cpu.inst.ORA_zpX]   = new Op(ORA, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.ORA_abs]   = new Op(ORA, cpu.addr.abs,   4);
  cpu.map[cpu.inst.ORA_absX]  = new Op(ORA, cpu.addr.absX,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.ORA_absY]  = new Op(ORA, cpu.addr.absY,  4); //+1 if page boundary crossed
  cpu.map[cpu.inst.ORA_pre]   = new Op(ORA, cpu.addr.pre,   6);
  cpu.map[cpu.inst.ORA_post]  = new Op(ORA, cpu.addr.post,  5); //+1 if page boundary crossed

  //Push accumulator to stack
  var PHA = function PHA()
  {
    mem.writeByte(cpu.reg.S, cpu.reg.A);
    cpu.reg.S -= 1;
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.PHA] = new Op(PHA, null, 3);

  //Push status register(P) to stack
  var PHP = function PHP()
  {
    mem.writeByte(cpu.reg.S, cpu.reg.P);
    cpu.reg.S -= 1;
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.PHP] = new Op(PHP, null, 3);

  //Pull contents of accumulator from stack
  var PLA = function PLA()
  {
    cpu.reg.S += 1;
    cpu.reg.A = mem.readByte(cpu.reg.S);
    cpu.reg.PC += 1;

    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0 ));
  }

  cpu.map[cpu.inst.PLA] = new Op(PLA, null, 4);

  //Pull contents of status register from stack
  var PLP = function PLP()
  {
    cpu.reg.S += 1;
    cpu.reg.P = mem.readByte(cpu.reg.S);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.PLP] = new Op(PLP, null, 4);

  //Rotate accumulator or memory left through carry
  var ROL_A = function ROL_A()
  {
    var c = cpu.P_STATUS.C();
    var a = cpu.reg.A << 1;
    a |= c;
    cpu.P_SET.C((a >> 8));

    cpu.reg.A = a % 0x100;
    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.ROL_A] = new Op(ROL_A, null, 2);

  //Rotate memory bit left
  var ROL = function ROL(value, location)
  {
    var c = cpu.P_STATUS.C();
    var val = value << 1;
    val |= c;
    cpu.P_SET.C((val >> 8));

    val = val % 0x100;
    cpu.P_SET.N((val > 127));
    cpu.P_SET.Z((val === 0));
    mem.writeByte(location, val);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.ROL_zp]    = new Op(ROL, cpu.addr.zp,    5);
  cpu.map[cpu.inst.ROL_zpX]   = new Op(ROL, cpu.addr.zpX,   6);
  cpu.map[cpu.inst.ROL_abs]   = new Op(ROL, cpu.addr.abs,   6);
  cpu.map[cpu.inst.ROL_absX]  = new Op(ROL, cpu.addr.absX,  7);

  //Rotate accumulator right through carry
  var ROR_A = function ROR_A()
  {
    var c = cpu.P_STATUS.C();
    var a = cpu.reg.A >> 1;
    a |= (c << 7);

    cpu.P_SET.C((cpu.reg.A & 1));
    cpu.P_SET.N((a > 127));
    cpu.P_SET.Z((a === 0));

    cpu.reg.A = a;
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.ROR_A] = new Op(ROR_A, null, 2);

  //Rotate memory right through carry
  var ROR = function ROR(value, location)
  {
    var c = cpu.P_STATUS.C();
    var val = val >> 1;
    val |= (c << 7);

    cpu.P_SET.C((value & 1));
    cpu.P_SET.N((a > 127));
    cpu.P_SET.Z((a === 0));

    mem.writeByte(location, val);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.ROR_zp]   = new Op(ROR, cpu.addr.zp,     5);
  cpu.map[cpu.inst.ROR_zpX]  = new Op(ROR, cpu.addr.zpX,    6);
  cpu.map[cpu.inst.ROR_abs]  = new Op(ROR, cpu.addr.abs,    6);
  cpu.map[cpu.inst.ROR_absX] = new Op(ROR, cpu.addr.absX,   7);

  //Return from interrupt
  var RTI = function RTI()
  {
    cpu.reg.P = mem.readByte(cpu.reg.S + 1);
    var lo = mem.readByte(cpu.reg.S + 2);
    var hi = mem.readByte(cpu.reg.S + 3);
    cpu.reg.PC = (hi << 8) + lo;
    cpu.reg.S += 3;
  }

  cpu.map[cpu.inst.RTI] = new Op(RTI, null, 6);

  //Return from subroutine
  var RTS = function RTS()
  {
    var lo = mem.readByte(cpu.reg.S + 1);
    var hi = mem.readByte(cpu.reg.S + 2);
    cpu.reg.S += 2;
    cpu.reg.PC = (hi >> 8) + lo + 1;
  }

  cpu.map[cpu.inst.RTS] = new Op(RTS, null, 6);

  //Subtract with carry
  var SBC = function SBC(value)
  {
    var a = cpu.reg.A;
    var r;

    if(cpu.P_STATUS.D()) //Check for decimal mode, see ADC notes
    {
      var aBCD = utils.toBCD(a);
      var valBCD = utils.toBCD(value);

      r = aBCD + cpu.P_STATUS.C() - 1 - valBCD;
      cpu.P_SET.C((r >= 0));
      r = utils.fromBCD(r);
    }else
    {
      r = a + cpu.P_STATUS.C() - 1 - value;
      cpu.P_SET.C((r < 255)); //6502 sets complement of borrow, so no borrow = 1, borrow = 0
    }

    //Set status flags
    //see ADC notes, same distinctions apply
    r = r % 0x100; //restrict to 8 bits
    cpu.P_SET.Z((r === 0));
    cpu.P_SET.N((r > 127));
    cpu.P_SET.V((a < 128 && value > 128 && cpu.reg.A > 127) || (a > 127 && value < 127 && cpu.reg.A < 128));

    cpu.reg.A = r;
  }

  cpu.map[cpu.inst.SBC_im]    = new Op(SBC, cpu.addr.im,    2);
  cpu.map[cpu.inst.SBC_zp]    = new Op(SBC, cpu.addr.zp,    3);
  cpu.map[cpu.inst.SBC_zpX]   = new Op(SBC, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.SBC_abs]   = new Op(SBC, cpu.addr.abs,   4);
  cpu.map[cpu.inst.SBC_absX]  = new Op(SBC, cpu.addr.absX,  4); //+1 for page boundary crossed
  cpu.map[cpu.inst.SBC_absY]  = new Op(SBC, cpu.addr.absY,  4); //+1 for page boundary crossed
  cpu.map[cpu.inst.SBC_pre]   = new Op(SBC, cpu.addr.pre,   6);
  cpu.map[cpu.inst.SBC_post]  = new Op(SBC, cpu.addr.post,  5); //+1 for page boundary crossed


  //Set carry
  var SEC = function SEC()
  {
    cpu.P_SET.C(1);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.SEC] = new Op(SEC, null, 2);

  //Set decimal mode
  var SED = function SED()
  {
    cpu.P_SET.D(1);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.SED] = new Op(SED, null, 2);

  //Set interrupt mask
  var SEI = function SEI()
  {
    cpu.P_SET.I(1);
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.SEI] = new Op(SEI, null, 2);

  //Store accumulator in memory
  var STA = function STA(value, location)
  {
    mem.writeByte(location, cpu.reg.A);
  }

  cpu.map[cpu.inst.STA_zp]    = new Op(STA, cpu.addr.zp,    3);
  cpu.map[cpu.inst.STA_zpX]   = new Op(STA, cpu.addr.zpX,   4);
  cpu.map[cpu.inst.STA_abs]   = new Op(STA, cpu.addr.abs,   4);
  cpu.map[cpu.inst.STA_absX]  = new Op(STA, cpu.addr.absX,  5);
  cpu.map[cpu.inst.STA_absY]  = new Op(STA, cpu.addr.absY,  5);
  cpu.map[cpu.inst.STA_pre]   = new Op(STA, cpu.addr.pre,   6);
  cpu.map[cpu.inst.STA_post]  = new Op(STA, cpu.addr.post,  6);

  //Store index X in memory
  var STX = function STX(value, location)
  {
    mem.writeByte(location, cpu.reg.X);
  }

  cpu.map[cpu.inst.STX_zp]    = new Op(STX, cpu.addr.zp,  3);
  cpu.map[cpu.inst.STX_zpY]   = new Op(STX, cpu.addr.zpY, 4);
  cpu.map[cpu.inst.STX_abs]   = new Op(STX, cpu.addr.abs, 4);

  //Store index Y in memory
  var STY = function STY(value, location)
  {
    mem.writeByte(location, cpu.reg.Y);
  }

  cpu.map[cpu.inst.STY_zp]    = new Op(STY, cpu.addr.zp,  3);
  cpu.map[cpu.inst.STY_zpX]   = new Op(STY, cpu.addr.zpX, 4);
  cpu.map[cpu.inst.STY_abs]   = new Op(STY, cpu.addr.abs, 4);

  //Transfer accumulator to index X
  var TAX = function TAX()
  {
    cpu.reg.X = cpu.reg.A;
    cpu.P_SET.N((cpu.reg.X > 127));
    cpu.P_SET.Z((cpu.reg.X === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.TAX] = new Op(TAX, null, 2);

  //Transfer accumulator to index Y
  var TAY = function TAY()
  {
    cpu.reg.Y = cpu.reg.A;
    cpu.P_SET.N((cpu.reg.Y > 127));
    cpu.P_SET.Z((cpu.reg.Y === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.TAY] = new Op(TAY, null, 2);

  //Transfer stack pointer to index X
  var TSX = function TSX()
  {
    cpu.reg.X = cpu.reg.S;
    cpu.P_SET.N((cpu.reg.X > 127));
    cpu.P_SET.Z((cpu.reg.X === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.TSX] = new Op(TSX, null, 2);

  //Transfer index X to accumulator
  var TXA = function TXA()
  {
    cpu.reg.A = cpu.reg.X;
    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.TXA] = new Op(TXA, null, 2);

  //Transfer index X to stack pointer 
  var TXS = function TXS()
  {
    cpu.reg.S = cpu.reg.X;
    cpu.P_SET.N((cpu.reg.S > 127));
    cpu.P_SET.Z((cpu.reg.S === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.TXS] = new Op(TXS, null, 2);

  //Transfer index Y to accumulator
  var TYA = function TYA()
  {
    cpu.reg.A = cpu.reg.Y;
    cpu.P_SET.N((cpu.reg.A > 127));
    cpu.P_SET.Z((cpu.reg.A === 0));
    cpu.reg.PC += 1;
  }

  cpu.map[cpu.inst.TYA] = new Op(TYA, null, 2);

  return cpu;

} (CPU_6507, MEMORY || {}));
