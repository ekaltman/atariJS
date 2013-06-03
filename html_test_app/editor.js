$(function()
{

  function IDE()
  {
    var paused = false;
    var built = false;
    var runInterval = 1;
    var defaultPC = 0xF000;
    var maxDebugStatements = 300;

    //interface variables
    var editor = this.editor = CodeMirror($("#textEditor")[0], {keyMap:"vim"});
    var hexWindow = $("#hexMap");
    var registers = $("#registerList > p");
    var display = $("#display");
    var debug = this.debug = $("#debugOutput");

    var playButton   = $("#playButton");
    var pauseButton  = $("#pauseButton");
    var stopButton   = $("#stopButton");
    var forwardButton   = $("#forwardButton");
    var rewindButton   = $("#rewindButton");
    var interationInput = $("#runIterations");
    interationInput.forceNumeric();

    var fileInput = $("#fileInput");

    playButton.click(function()
    {
      paused = false;
      var numIters = parseInt(interationInput.val());
      if(numIters !== 0 && !isNaN(numIters))
      {
        build();
        run(numIters);
      }else
      {
        debug.append("<p>Error: Iterations specified not a valid number</p>");
      }
    });

    pauseButton.click(function()
    {
      if(!paused)
      {
        paused = true;
      }
    });

    forwardButton.click(function()
    {
      if(!built)
      {
        build();
      }
      run(1);
    });

    stopButton.click(function()
    {
      CPU_6507.reset();
      debug.empty();
      updateRegisterOutput();
    });

    fileInput.change(readBinaryFile);

    this.editor.doc.cm.on("change", function(changeObj)
    {
      built = false;
    });

    function convertHexDumpToHTML(hexDump)
    {
      var lines = hexDump.split("\n");
      var html = "<p>";

      var i;
      for(i = 0; i < lines.length; i++)
      {
        html += lines[i] + "<br/>";
      }

      return html + "</p>";
    }

    function build(binaryData)
    {
      //if passed binary file data load it into memory
      if(binaryData !== null && binaryData !== undefined)
      {
        CPU_6507.reset();
        MEMORY.loadBinary(defaultPC, binaryData);
        built = true;
        hexWindow.empty();
        hexWindow.append(convertHexDumpToHTML(MEMORY.hexDump()));
      }else //assume data is present in textEditor
      {
        if(!built)
        {
          CPU_6507.reset();
          simulator.assemble();
          built = true;
          hexWindow.empty();
          hexWindow.append(convertHexDumpToHTML(MEMORY.hexDump()));
        }
      }
    }

    function run(numIterations)
    {
      var currentCycles = CPU_6507.cc;
      var runInterval;
      var runFunction = function()
      {
        if(numIterations != undefined)
        {
          if((CPU_6507.cc - currentCycles) < numIterations && !paused)
          {
            CPU_6507.step();
            updateRegisterOutput();
          }else
          {
            clearInterval(runInterval);
          }
        }else if(paused)
        {
          clearInterval(runInterval);
        }
      }

      runInterval = setInterval(runFunction, runInterval);
    }

    function updateRegisterOutput()
    {
      registers.each(function()
      {
        var reg = $(this).attr("id").slice(8);
        var regText = reg + " = ";

        if(reg == "P")
        {
          regText += CPU_6507.reg[reg].toString(2);
        }else if(reg == "PC")
        {
          regText += (CPU_6507.reg[reg] & 0xFFFF).toString(16).toUpperCase();
        }else
        {
          regText += (CPU_6507.reg[reg] & 0xFF).toString(16).toUpperCase();
        }
        $(this).text(regText);

      });
    }

    function readBinaryFile(event)
    {
      if(window.File && window.FileReader && window.FileList && window.Blob)
      {
        var file = event.target.files[0];

        if(file)
        {
          var fr = new FileReader();
          fr.onload = function(event)
          {
            var fileContents = event.target.result;
            build(fileContents);
          }
          fr.readAsBinaryString(file);
        }
      } else
      {
        alert('The File APIs are not supported by your browser');
      }
    }

    //IDE initialization function
    updateRegisterOutput();
  }

  var ide = new IDE();
  var simulator = new SimulatorWidget(null, MEMORY, ide.editor.doc, ide.debug);
  CPU_6507.debugOutput(ide.debug);

});

//forceNumeric() plugin from:
//http://www.west-wind.com/weblog/posts/2011/Apr/22/Restricting-Input-in-HTML-Textboxes-to-Numeric-Values
jQuery.fn.forceNumeric = function () {

             return this.each(function () {
                 $(this).keydown(function (e) {
                     var key = e.which || e.keyCode;

                     if (!e.shiftKey && !e.altKey && !e.ctrlKey &&
                     // numbers   
                         key >= 48 && key <= 57 ||
                     // Numeric keypad
                         key >= 96 && key <= 105 ||
                     // comma, period and minus, . on keypad
                        key == 190 || key == 188 || key == 109 || key == 110 ||
                     // Backspace and Tab and Enter
                        key == 8 || key == 9 || key == 13 ||
                     // Home and End
                        key == 35 || key == 36 ||
                     // left and right arrows
                        key == 37 || key == 39 ||
                     // Del and Ins
                        key == 46 || key == 45)
                         return true;

                     return false;
                 });
             });
         }
