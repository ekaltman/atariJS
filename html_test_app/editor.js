$(function()
{

  function IDE()
  {
    var paused = false;
    var built = false;
    var runInterval = 100;
    var defaultPC = 0xF000;

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

    fileInput.change(readBinaryFile);

    this.editor.doc.cm.on("change", function(changeObj)
    {
      built = false;
    });

    function build(binaryData)
    {
      //if passed binary file data load it into memory
      if(binaryData !== null && binaryData !== undefined)
      {
        MEMORY.loadBinary(defaultPC, binaryData);
        built = true;
      }else //assume data is present in textEditor
      {
        if(!built)
        {
          simulator.assemble();
          built = true;
        }
      }
    }

    function run(numIterations)
    {
      var currentCycles = CPU_6507.cc;
      var runInterval;
      var runFunction = function()
      {
        if(numIterations)
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
        var regText;
        if(reg !== "P")
        {
          regText = reg + " = 0x" + CPU_6507.reg[reg].toString(16).toUpperCase();
        }else
        {
          regText = reg + " = " + CPU_6507.reg[reg].toString(2);
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
