var message = [];
if (!window.FileReader) {
    message = '<p>The ' +
              '<a href="http://dev.w3.org/2006/webapi/FileAPI/" target="_blank">File API</a>s ' +
              'are not fully supported by this browser.</p>' +
              '<p>Upgrade your browser to the latest version.</p>';

    document.querySelector('body').innerHTML = message;
} else {
	
    //document.getElementById('fileDropBox').addEventListener('dragover', handleDragOver, false);
    //document.getElementById('fileDropBox').addEventListener('drop', handleFileSelection, false);
    document.getElementById('files').addEventListener('change', handleFileSelection, false);
    document.getElementById('overlayImage').addEventListener('change', handleImageOverlaySelection, false);
    // April's
    //document.getElementById('genButton').addEventListener('click', generateSomething, false);
    document.getElementById('csvButton').addEventListener('click', saveAsCSV, false);
    document.getElementById('pngSaveTiny').addEventListener('click', saveTinyAsPng, false);
    document.getElementById('pngSaveBig').addEventListener('click', saveBigAsPng, false);
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var currentlyLoadedPattern;

///////////////////////////////////////////////////////////////
/// EMBROIDERY FILE FORMAT READER ///
/// Goes handleFileSelection -> startFileRead -> displayFileText -> then draws the pattern
////////////////////////////////////////////////////////////////


function handleFileSelection(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer ? evt.dataTransfer.files : evt.target.files;

    if (!files) {
      alert("<p>At least one selected file is invalid - do not select any folders.</p><p>Please reselect and try again.</p>");
      return;
    }

    for (var i = 0, file; file = files[i]; i++) {
      if (!file) {
            alert("Unable to access " + file.name); 
            continue;
      }
      if (file.size == 0) {
            alert("Skipping " + file.name.toUpperCase() + " because it is empty.");
            continue;
      }
      startFileRead(file);
    }
}


function startFileRead(fileObject){
	var reader = new FileReader();

    // Set up asynchronous handlers for file-read-success, file-read-abort, and file-read-errors:
    reader.onloadend = function (x) { displayFileText.apply(null, [fileObject.name, x]); }; // "onloadend" fires when the file contents have been successfully loaded into memory.
    reader.abort = handleFileReadAbort; // "abort" files on abort.
    reader.onerror = handleFileReadError; // "onerror" fires if something goes awry.

    if (fileObject) { // Safety first.
      reader.readAsArrayBuffer(fileObject); // Asynchronously start a file read thread. Other supported read methods include readAsArrayBuffer() and readAsDataURL().
    }
}

function displayFileText(filename, evt) {
    var view = new jDataView(evt.target.result, 0, evt.size);
    var pattern = new Pattern();
    filename = filename.toLowerCase();
    if (filename.endsWith("pes")) {
        pesRead(view, pattern);
    } else if (filename.endsWith("pec")) {
        pecRead(view, pattern);
    } else if (filename.endsWith("pcs")) {
        pcsRead(view, pattern);
    } else if (filename.endsWith("dst")) {
        dstRead(view, pattern);
    } else if (filename.endsWith("jef")) {
        jefRead(view, pattern);
    } else if (filename.endsWith("exp")) {            
        expRead(view, pattern);
    } else if (filename.endsWith("vp3")) {            
        vp3Read(view, pattern);
    } else if (filename.endsWith("xxx")) {            
        xxxRead(view, pattern);
    } else if (filename.endsWith("csv")) {            
        csvRead(view, pattern);
    }
    //console.log("..  " + pattern.stitches[0].x + ", " + pattern.stitches[0].y );
    //console.log(".  " + pattern.stringifyStitches());
    pattern.moveToPositive();
    //console.log("..  " + pattern.stringifyStitches());
    //console.log("...  " + pattern.stringifyStitches());

    pattern.loadedFileName = filename;
    currentlyLoadedPattern = pattern;
    redrawPattern();
}

function redrawPattern(){
	currentlyLoadedPattern.drawShape(document.getElementById('mycanvas'), 1, true);
    currentlyLoadedPattern.drawShape(document.getElementById('medcanvas'), .5, false);
    currentlyLoadedPattern.drawShape(document.getElementById('tinycanvas'), 227/1000, false);
}

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////
/// IMAGE FORMAT READER ///
/// handleImageOverlaySelection -> startImageRead -> showOverlayDiv
////////////////////////////////////////////////////////////////

function handleImageOverlaySelection(evt){
	evt.stopPropagation();
    evt.preventDefault();
    
    var files = evt.dataTransfer ? evt.dataTransfer.files : evt.target.files;

    if (!files) {
      alert("<p>At least one selected file is invalid - do not select any folders.</p><p>Please reselect and try again.</p>");
      return;
    }
    
    for (var i = 0, file; file = files[i]; i++) {
      if (!file) {
            alert("Unable to access " + file.name); 
            continue;
      }
      if (file.size == 0) {
            alert("Skipping " + file.name.toUpperCase() + " because it is empty.");
            continue;
      }
      startImageRead(file);
    }
    
}

function startImageRead(fileObject) {
    var reader = new FileReader();

    // Set up asynchronous handlers for file-read-success, file-read-abort, and file-read-errors:
    reader.onloadend = function (x) { 
    	// fileDisplayArea.innerHTML = "";
    	var img = new Image();
    	img.src = reader.result;
    	// fileDisplayArea.appendChild(img);
    	showOverlayDiv(img);
    }; // "onloadend" fires when the file contents have been successfully loaded into memory.
    reader.abort = handleFileReadAbort; // "abort" files on abort.
    reader.onerror = handleFileReadError; // "onerror" fires if something goes awry.

    if (fileObject) { // Safety first.
      reader.readAsDataURL(fileObject); // Asynchronously start a file read thread. Other supported read methods include readAsArrayBuffer() and readAsDataURL().
    }
}


function showOverlayDiv(img){
	var overlayDiv = document.getElementById('overlayDiv');
	// Show overlay div
	overlayDiv.style.visibility = "visible";
	
	// Position overlay div over target canvas -- should this be a parameter?
	var targetCanvas = document.getElementById('mycanvas');
	console.log("targetCanvas..."); console.log(targetCanvas);
	console.log($('#mycanvas').position());
	
	
	overlayDiv.width = "1000px";
	overlayDiv.height = "1000px";
	img.width = 1000;
	img.height = 1000;
	overlayDiv.style.left = $('#mycanvas').position().left +"px";
	overlayDiv.style.top = $('#mycanvas').position().top +"px";
	
	// Put in the image
	overlayDiv.appendChild(img);
	
}

function hideOverlayDiv(){
	var overlayDiv = document.getElementById('overlayDiv');
	overlayDiv.style.visibility = "hidden";
}



////////////////////////////////////////////////////////////////
//// MUTUAL FUNCTIONS ////
////////////////////////////////////////////////////////////////

function handleFileReadAbort(evt) {
    alert("File read aborted.");
}

function handleFileReadError(evt) {
    var message;
    switch (evt.target.error.name) {
        case "NotFoundError":
            alert("The file could not be found at the time the read was processed.");
        break;
        case "SecurityError":
            message = "<p>A file security error occured. This can be due to:</p>";
            message += "<ul><li>Accessing certain files deemed unsafe for Web applications.</li>";
            message += "<li>Performing too many read calls on file resources.</li>";
            message += "<li>The file has changed on disk since the user selected it.</li></ul>";
            alert(message);
        break;
        case "NotReadableError":
            alert("The file cannot be read. This can occur if the file is open in another application.");
        break;
        case "EncodingError":
            alert("The length of the data URL for the file is too long.");
        break;
        default:
            alert("File error code " + evt.target.error.name);
    }
}

////////////////////////////////////////////////////////////////
//// SAVING/GENERATING FILE FUNCTIONS ////
////////////////////////////////////////////////////////////////

function generateSomething(evt){
	
	if(currentlyLoadedPattern){
		// Undo moveToPositive
		currentlyLoadedPattern.moveToZeroFromPositive();
		// Undo flip vertical
		currentlyLoadedPattern.invertPatternVertical();
		// Undo absolute stitches transformation
		currentlyLoadedPattern.transformToRelStitches();
		
		var nameWithoutExt = currentlyLoadedPattern.loadedFileName.split(".")[0];
		dstWrite(nameWithoutExt + "_generated.dst", currentlyLoadedPattern);
		
	} else {
		var testStr = '040003';
		var byteArray = new Uint8Array(testStr.length/2);
		for(var i = 0; i < byteArray.length; i++){
			byteArray[i] = parseInt(testStr.substr(i*2, 2), 16);
		}
		var blob = new Blob([byteArray], {type:"application/octet-stream"});
		
		console.log(URL.createObjectURL(blob));
		
		saveAs(blob, "test.dst");
	}
	
	//window.requestFileSystem(window.PERSISTENT, 1024*1024, saveFile);
}

function saveTinyAsPng(evt){
	var canvas = document.getElementById("tinycanvas");
	var name = "tinyEmpty.png";
	
	if(currentlyLoadedPattern){
		name = currentlyLoadedPattern.loadedFileName.split(".")[0];
		name += "_tiny.png";
	}
	
	canvas.toBlob(function(blob) {
	    saveAs(blob, name);
	});
}

function saveBigAsPng(evt){
	var canvas = document.getElementById("mycanvas");
	var name = "bigEmpty.png";
	
	if(currentlyLoadedPattern){
		name = currentlyLoadedPattern.loadedFileName.split(".")[0];
		name += "_big.png";
	}
	
	canvas.toBlob(function(blob) {
	    saveAs(blob, name);
	});
}

function saveAsCSV(evt){
	if(currentlyLoadedPattern){
		var nameWithoutExt = currentlyLoadedPattern.loadedFileName.split(".")[0];
		csvWrite(nameWithoutExt + ".csv", currentlyLoadedPattern);
		
	} else {
		// DO NOTHING, THERE IS NO FIIILE
		// okay no we can test saving a file real quick here
		var testStr = "0,0,0,0,1,0\n";
		testStr += "0,0,0,0,0,1";
		
		var blob = new Blob([testStr], {type:"text/csv;charset=utf-8;"});
		
		saveAs(blob, "test.csv");
		
	}
}
