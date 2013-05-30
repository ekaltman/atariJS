$(function()
  {
    //$("#inputText").keypress(processKeyInput);
    var simulator = new SimulatorWidget("#inputButton",MEMORY);

    var textInput = $('#inputText');
    var inputCount = 0;
    CPU_6507.debugOutput('#processorTrace');
    $("#runProgram").click(CPU_6507.step);
    $("#binFileInput").change(readBinaryFile);

    function processKeyInput(event)
    {
      if(event.keyCode == 13)
      {
        $("#outputDiv").text(textInput.val());
        $("#inputText").val("");
        return false;
      }else if(event.keyCode == 32)
      {
        return false;
      }

      if(inputCount % 2 == 0)
      {
        var line = $("#inputText").val();
        line += " ";
        $("#inputText").val(line);
      }

      inputCount++;

      return;
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
            MEMORY.loadBinary(0xF000, fileContents);
          }
          fr.readAsBinaryString(file);
        }
      } else
      {
        alert('The File APIs are not supported by your browser');
      }
    }

  });
