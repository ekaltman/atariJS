$(function()
{

  function IDE()
  {
    var paused = false;
    var running = false;
    var built = false;
    var runIntervalTime = 1;
    var defaultPC = 0xF000;
    var maxDebugStatements = 300;
    var runInterval;
    var JSONTestCodeUrl = "tutorial_code.json";
    var tutorialSnippets = [];

    //interface variables
    var editor      = this.editor = CodeMirror($("#textEditor")[0], {keyMap:"vim"});
    var hexWindow   = $("#hexWindow");
    var hexMap      = $("#hexMap");
    var registers   = $("#registerList > p");
    var display     = $("#display");
    var debug       = this.debug = $("#debugOutput");
    var codeSelect  = $("#codeSnippets");

    var playButton        = $("#playButton");
    var pauseButton       = $("#pauseButton");
    var stopButton        = $("#stopButton");
    var forwardButton     = $("#forwardButton");
    var rewindButton      = $("#rewindButton");
    var hexRefreshButton  = $("#hexRefreshButton");
    var interationInput   = $("#runIterations");
    var fileInput         = $("#fileInput");

    interationInput.forceNumeric();

    //Initialization
    function loadSetupJSON()
    {
      $.getJSON(JSONTestCodeUrl, initializeIDE)
    }

    function initializeIDE(jsonData)
    {
      var selectOutput = ['<option value="blank"></option>'];

      var i;
      for( i = 0; i < jsonData.codeSnippets.length; i++)
      {
        var snippet = jsonData.codeSnippets[i];
        var codeString = ";";

        codeString += snippet["title"].toUpperCase() + "\n";
        codeString += ";" + snippet["description"].replace(/\n/g, "\n;") + "\n\n";
        codeString += snippet["code"];
        tutorialSnippets.push(codeString);

        selectOutput.push('<option value="' + i +'">' + (i + 1) + ": " + snippet["optionLabel"] + '</option>');
      }

      codeSelect.html(selectOutput.join(''));
    }

    //UI Event Handlers
    codeSelect.change(function(element)
    {
      reset();

      if(this.value != "blank")
      {
        editor.doc.setValue(tutorialSnippets[parseInt(this.value)]);
      }else
      {
        editor.doc.setValue("");
      }

    });

    playButton.click(function()
    {
      paused = false;
      var numIters = parseInt(interationInput.val());
      if(numIters !== 0 && !isNaN(numIters))
      {
        build();
        run(numIters);
      }else if(isNaN(numIters))
      {
        build();
        run();
      }else
      {
        debug.append("<p>Error: Something wrong with iterations input, reading: " + numIters + "</p>");
      }
    });

    pauseButton.click(function()
    {
      paused = !paused;
    });

    forwardButton.click(function()
    {
      if(!built)
      {
        build();
      }
      run(1);
    });

    stopButton.click(reset);

    hexRefreshButton.click(function()
    {
      refreshHexMap();
    });


    fileInput.change(readBinaryFile);

    this.editor.doc.cm.on("change", function(changeObj)
    {
      built = false;
    });


    //Data and run-time functions
    function convertHexDumpToHTML(hexDump)
    {
      return "<p>" + hexDump.replace(/\n/g, "<br/>") + "</p>";
    }

    function refreshHexMap()
    {
      hexMap.empty();
      hexMap.append(convertHexDumpToHTML(MEMORY.hexDump()));
    }

    function reset()
    {
      running = false;
      clearInterval(runInterval);
      CPU_6507.reset();
      debug.empty();
      updateRegisterOutput();
    }

    function build(binaryData)
    {
      //if passed binary file data load it into memory
      if(binaryData !== null && binaryData !== undefined)
      {
        CPU_6507.reset();
        MEMORY.loadBinary(defaultPC, binaryData);
        editor.setValue("");
        built = true;
        refreshHexMap();
      }else //assume data is present in textEditor
      {
        if(!built)
        {
          CPU_6507.reset();
          simulator.assemble();
          built = true;
          refreshHexMap();
        }
      }
    }

    function run(numIterations)
    {
      var currentCycles = CPU_6507.cc;
      var runFunction = function()
      {
        if(paused)
        {
            running = false;
            clearInterval(runInterval);
        }else if(numIterations != undefined && numIterations != "")
        {
          if((CPU_6507.cc - currentCycles) < numIterations)
          {
            CPU_6507.step();
            updateRegisterOutput();
          }else
          {
            running = false;
            clearInterval(runInterval);
          }
        }else
        {
          CPU_6507.step();
          updateRegisterOutput();
        }
      }

      if(!running)
      {
        running = true;
        runInterval = setInterval(runFunction, runIntervalTime);
      }
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
        alert('The File APIs are not supported by your browser, please run something more modern.');
      }
    }

    //IDE initialization function
    updateRegisterOutput();
    loadSetupJSON();
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
