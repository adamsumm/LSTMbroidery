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
    document.getElementById('floatCanvas').addEventListener('click', pickColorForPattern, false);
    document.getElementById('floatCanvas').addEventListener('mousemove', sampleColorForPattern, false);
    // April's
    //document.getElementById('genButton').addEventListener('click', generateSomething, false);
    document.getElementById('csvButton').addEventListener('click', saveAsCSV, false);
    document.getElementById('pngSaveTiny').addEventListener('click', saveTinyAsPng, false);
    document.getElementById('pngSaveBig').addEventListener('click', saveBigAsPng, false);
    document.getElementById('pngOverlay').addEventListener('click', saveOverlayAsPng, false);
    document.getElementById('pngOverlaySmall').addEventListener('click', saveOverlayAsPngSmall, false);
    document.getElementById('toggleDots').addEventListener('click', toggleDotsOnBigCanvas, false);
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
    redrawPattern(false, false, false);
}

var lastBigDraw = true;

function redrawPattern(big, med, small){
	if(big !== undefined){
		currentlyLoadedPattern.drawShape(document.getElementById('mycanvas'), 1, big);
		lastBigDraw = big;
	} else {
		currentlyLoadedPattern.drawShape(document.getElementById('mycanvas'), 1, true);
	}
	
	if(med !== undefined){
		currentlyLoadedPattern.drawShape(document.getElementById('medcanvas'), .5, med);
	} else {
		currentlyLoadedPattern.drawShape(document.getElementById('medcanvas'), .5, false);
	}
	
	if(small !== undefined){
		currentlyLoadedPattern.drawShape(document.getElementById('tinycanvas'), 227/1000, small);
	} else {
		currentlyLoadedPattern.drawShape(document.getElementById('tinycanvas'), 227/1000, false);
	}
}

function toggleDotsOnBigCanvas(event){
	if(lastBigDraw === true){
		redrawPattern(false, false, false);
	} else {
		redrawPattern(true, false, false);
	}
}

function sampleColorForPattern(event){
	var canvas = document.getElementById('floatCanvas');
	var rect = canvas.getBoundingClientRect();
	var ctx = canvas.getContext('2d');
	var x = Math.floor(event.clientX -rect.left) +1;
	var y = Math.floor(event.clientY -rect.top) +1;
	var pixel = ctx.getImageData(x, y, 1, 1);
	var data = pixel.data;
	//console.log("sampling from canvas at " + x + ", " + y);
	
	var colorSampleCanvas = document.getElementById('colorSample');
	var csctx = colorSampleCanvas.getContext('2d');
	csctx.fillStyle = "rgb(" + data[0] + ", " + data[1] + ", " + data[2] + ")";
	csctx.fillRect(0, 0, colorSampleCanvas.width, colorSampleCanvas.height);
}

function pickColorForPattern(event){
	if(currentlyLoadedPattern !== undefined && overlayImg !== null){
		var canvas = document.getElementById('floatCanvas');
		var overlayDiv = $('overlayDiv');
		
		var rect = canvas.getBoundingClientRect();
		console.log("rect" + rect.left + ", " + rect.top);
		console.log(overlayDiv.offset.left + ", " + overlayDiv.offset.top);
		
		
		var ctx = canvas.getContext('2d');
		var x = Math.floor(event.clientX -rect.left) +1;
		var y = Math.floor(event.clientY -rect.top) +1;
		//TODO: IF THE IMAGE HAS BEEN MANIPULATED, WE NEED TO ADJUST X AND Y BY THAT AMOUNT!!!
		console.log("picking from image at " + x + ", " + y);
		var pixel = ctx.getImageData(x, y, 1, 1);
		var data = pixel.data;
		currentlyLoadedPattern.setNextColor(data[0], data[1], data[2]);
		redrawPattern(false, false, false);
	}
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

// Set in showOverlayDiv, called with a fresh img
var overlayImg = null;
var overlayVars = null;

function showOverlayDiv(img){
	var overlayDiv = document.getElementById('overlayDiv');
	// Show overlay div
	overlayDiv.style.visibility = "visible";
	
	// Position overlay div over target canvas -- should this be a parameter?
	var targetCanvas = document.getElementById('mycanvas');
	console.log("targetCanvas..."); console.log(targetCanvas);
	console.log($('#mycanvas').position());

	overlayDiv.style.left = $('#mycanvas').position().left +"px";
	overlayDiv.style.top = $('#mycanvas').position().top +"px";
	overlayDiv.style.opacity = "0.4";
	
	// Put in the image
	//overlayDiv.appendChild(img);
	
	img.onload = function(){
		overlayImg = img;
		resetOverlayVars(0, 0, img.width, img.height);
		redrawOverlayImage();
	};
	
}

function redrawOverlayImage(){
	if(overlayImg !== null){
		var imgCanvas = document.getElementById('floatCanvas');
		var imgContext = imgCanvas.getContext('2d');
		
		// May have to check that dx and dy are not negative and instead draw it as sx and sy
		// See https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
		imgContext.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
		imgContext.drawImage(overlayImg, overlayVars.dx, overlayVars.dy, overlayVars.width, overlayVars.height);
	}
}

function hideOverlayDiv(){
	var overlayDiv = document.getElementById('overlayDiv');
	overlayDiv.style.visibility = "hidden";
}

// Should send in size of canvas...
function resetOverlayVars(x, y, w, h){
	overlayVars = {
		dx:x, dy:y, width:w, height:h
	};
}

////////////////////////////////////////////////////////////////
/// IMAGE EDITING ///
////////////////////////////////////////////////////////////////
// Register keys
// w,a,s,d - move image up,left,down,right --- BEING PREPARED TO CHOP/ADD PADDING AS NEEDED
// i,j,k,l - stretch bigger vert, smaller hori, smaller vert, bigger hori (0,0 upper left axis directions)
// 
var keys = {};
keys[87] = false; // w
keys[65] = false; // a
keys[83] = false; // s
keys[68] = false; // d
keys[73] = false; // i
keys[74] = false; // j
keys[75] = false; // k
keys[76] = false; // l

// Register keypress -> function
document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

function keyDown(e){
	if(e.keyCode in keys)
  		keys[e.keyCode] = true;
}

function keyUp(e){
	if(e.keyCode in keys)
  		keys[e.keyCode] = false;
}

function update(){
	if(keys[87] === true){ //w
		//console.log("w...");
		moveFloatingImage("up");
	}
	if(keys[65] === true){ // a
		//console.log("a...");
		moveFloatingImage("left");
	}
	if(keys[83] === true){ // s
		//console.log("s...");
		moveFloatingImage("down");
	}
	if(keys[68] === true){ // d
		//console.log("d...");
		moveFloatingImage("right");
	}
	if(keys[73] === true){ // i
		//console.log("i...");
		stretchFloatingImage("shrinkVert");
	}
	if(keys[74] === true){ // j
		//console.log("j...");
		stretchFloatingImage("shrinkHori");
	}
	if(keys[75] === true){ // k
		//console.log("k...");
		stretchFloatingImage("growVert");
	}
	if(keys[76] === true){ // l
		//console.log("l...");
		stretchFloatingImage("growHori");
	}
}

setInterval(update, 30);

// Keypress functions

function moveFloatingImage(direction){
	if (direction === "up"){
		overlayVars.dy--;
	} else if (direction === "down"){
		overlayVars.dy++;
	} else if (direction === "right"){
		overlayVars.dx++;
	} else if (direction === "left"){
		overlayVars.dx--;
	} else {
		console.log("moveFloatingImage unrecognized direction (should be up, down, right, left): " + direction);
	}
	redrawOverlayImage();
}

function stretchFloatingImage(direction){
	if (direction === "shrinkVert"){
		overlayVars.height--;
	} else if (direction === "growVert"){
		overlayVars.height++;
	} else if (direction === "shrinkHori"){
		overlayVars.width--;
	} else if (direction === "growHori"){
		overlayVars.width++;
	} else {
		console.log("stretchFloatingImage unrecognized direction (should be shrink/grow Vert/Hori): " + direction);
	}
	redrawOverlayImage();
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

function saveOverlayAsPng(evt){
	if(overlayImg === null){
		console.log("No image loaded into overlay canvas to save. ABORT!!!");
		return;
	}
	
	var canvas = document.getElementById('floatCanvas');
	var name = "bigOverlay.png";
	
	if(currentlyLoadedPattern){
		name = currentlyLoadedPattern.loadedFileName.split(".")[0];
		name += "_bigO.png";
	}
	
	canvas.toBlob(function(blob) {
	    saveAs(blob, name);
	});
}

function saveOverlayAsPngSmall(evt){
	if(overlayImg === null){
		console.log("No image loaded into overlay canvas to save. ABORT!!!");
		return;
	}
	
	var srcCanvas = document.getElementById('floatCanvas');
	var canvas = document.getElementById('secretCanvas');
	// TRANSFER CANVAS HERE!!!!
	var dstCtx = canvas.getContext('2d');
	
	dstCtx.clearRect(0, 0, canvas.width, canvas.height);
	dstCtx.drawImage(srcCanvas, 0, 0, 227, 227);
	
	var name = "smOverlay.png";
	
	if(currentlyLoadedPattern){
		name = currentlyLoadedPattern.loadedFileName.split(".")[0];
		name += ".png";
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
