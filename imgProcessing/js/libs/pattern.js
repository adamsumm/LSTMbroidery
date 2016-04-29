(function (global) {
	"use strict";
	function Stitch(x, y, flags, color) {
		this.flags = flags;
		this.x = x;
		this.y = y;
		this.color = color;
	}

	function Color(r, g, b, description) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.description = description;
	}

	var stitchTypes = {
			normal: 0,
			jump: 1,
			trim: 2,
			stop: 4,
			end: 8
		};

	function Pattern() {
		this.colors = [];
		this.stitches = [];
		this.oldAbsStitches = [];
        this.hoop = {};
		this.lastX = 0;
		this.lastY = 0;
		this.top = 0;
		this.bottom = 0;
		this.left = 0;
		this.right = 0;
		this.oldLeft = 0;
		this.oldTop = 0;
		this.currentColorIndex = 0;
		this.loadedFileName = "";
		this.replaceColorIndex = 0;
	}
	
	Pattern.prototype.rainbowifyColors = function(){
		console.log("rainbowifying Colors...");
		var colorRange = 360 * (9/10); // 90% of colors 0-90%
		var stepSize = Math.floor(colorRange/this.colors.length);
		var currentHue = 0;
		console.log(this.colors[0]);
		
		for(var i = 0; i < this.colors.length; i++){
			console.log("At h value " + currentHue);
			var newColor = tinycolor("hsl(" + currentHue + ", 100%, 50%)");
			currentHue += stepSize;
			
			newColor.toRgb();
			console.log(newColor.toRgb());
			this.colors[i].r = newColor.toRgb().r;
			this.colors[i].g = newColor.toRgb().g;
			this.colors[i].b = newColor.toRgb().b;
		}
	};

	Pattern.prototype.addColorRgb = function (r, g, b, description) {
		this.colors[this.colors.length] = new Color(r, g, b, description);
	};

	Pattern.prototype.addColor = function (color) {
		this.colors[this.colors.length] = color;
	};
	
	Pattern.prototype.setNextColor = function(r, g, b){
		if(this.colors.length > 0){
			var color = new Color(r, g, b, "picked");
			if(this.replaceColorIndex < this.colors.length){
				// replace index and increment
				this.colors[this.replaceColorIndex] = color;
				this.replaceColorIndex++;
			} else {
				// wrap around to 0 and increment past it
				this.colors[0] = color;
				this.replaceColorIndex = 1;
			}
		} else {
			// No colors to set? o.O?
			console.log("Cannot set color of a list with no colors!");
		}
	};

	Pattern.prototype.addStitchAbs = function (x, y, flags, isAutoColorIndex) {
		if ((flags & stitchTypes.end) === stitchTypes.end) {
			this.calculateBoundingBox();
			this.fixColorCount();
			this.rainbowifyColors();
		}
		if (((flags & stitchTypes.stop) === stitchTypes.stop) && this.stitches.length === 0) {
			return;
		}
		if (((flags & stitchTypes.stop) === stitchTypes.stop) && isAutoColorIndex) {
			this.currentColorIndex += 1;
		}
		/*
		if(this.stitches.length === 0){ //&& x !== 0 && y !== 0){
			console.log("--- pattern.js: Adding jumps to first stitch");
			this.prepPatternWithFirstStitch(x, y);
		}*/
		
		//if(x === 0 && y === 0) console.log("!!!! I am making an abs stitch at 0, 0...?");
		this.stitches[this.stitches.length] = new Stitch(x, y, flags, this.currentColorIndex);
	};

	Pattern.prototype.addStitchRel = function (dx, dy, flags, isAutoColorIndex) {
		if (this.stitches.length !== 0) {
			this.lastX = this.stitches[this.stitches.length-1].x;
			this.lastY = this.stitches[this.stitches.length-1].y;
			var nx = this.lastX + dx,
				ny = this.lastY + dy;
			this.lastX = nx;
			this.lastY = ny;
			//if(nx === 0 && ny === 0) console.log("relative stitch at nx, ny === 0. This is okay.");
			this.addStitchAbs(nx, ny, flags, isAutoColorIndex);
		} else {
			this.addStitchAbs(dx, dy, flags, isAutoColorIndex);
			//f(dx === 0 && dy === 0) console.log("!!!! relative stitch at dx, dy === 0. This is probably NOT okay.");
		}
	};
	
	Pattern.prototype.prepPatternWithFirstStitch = function(x, y){
		this.stitches[this.stitches.length] = new Stitch(0, 0, stitchTypes.trim, this.currentColorIndex);
		this.stitches[this.stitches.length] = new Stitch(x, y, stitchTypes.trim, this.currentColorIndex);
	};
	
	Pattern.prototype.transformToRelStitches = function(){
		//console.log("transformToRelStitches OldStitches " + this.stringifyStitches());
		this.oldAbsStitches = [];
		for(var i = 0; i < this.stitches.length; i++){
			var st = this.stitches[i];
			this.oldAbsStitches.push(new Stitch(st.x, st.y, st.flags, st.color));
		}
		
		if(this.stitches.length > 1){ // Safety first
			for(var i = this.stitches.length-1; i >= 1; i--){ // I hope this doesn't mess up the first stitch =X
				// compare this stitch's location to the previous'
				var currentStitch = this.stitches[i];
				var lastStitched = this.stitches[i-1];
				currentStitch.x = currentStitch.x - lastStitched.x;
				currentStitch.y = currentStitch.y - lastStitched.y;
			}
		}
		//console.log("transformToRelStitches New!!!!! " + this.stringifyStitches());
	};

	Pattern.prototype.calculateBoundingBox = function () {
		var i = 0,
			stitchCount = this.stitches.length,
			pt;
		if (stitchCount === 0) {
			this.bottom = 1;
			this.right = 1;
			return;
		}
		this.left = 99999;
		this.top = 99999;
		this.right = -99999;
		this.bottom = -99999;

		for (i = 0; i < stitchCount; i += 1) {
			pt = this.stitches[i];
			if (!(pt.flags & stitchTypes.trim)) {
				this.left = this.left < pt.x ? this.left : pt.x;
				this.top = this.top < pt.y ? this.top : pt.y;
				this.right = this.right > pt.x ? this.right : pt.x;
				this.bottom = this.bottom > pt.y ? this.bottom : pt.y;
			}
		}
	};
	
	// (April)
	// Undoes "moveToPositive"
	// NOTE: Beware order of operations with moveToPositive
	//		IE: do not do an "invertPatternVertical" in the middle 
	//			of calling moveToPositive and this function
	Pattern.prototype.moveToZeroFromPositive = function () {
		console.log("moveToZeroFromPositive OldStitches " + this.stringifyStitches());
		
		
		this.left = this.oldLeft;
		this.top = this.oldTop;
		
		var i = 0,
			stitchCount = this.stitches.length;
		for (i = 0; i < stitchCount; i += 1) {
			this.stitches[i].x += this.left;
			this.stitches[i].y += this.top;
		}
		
		this.right += this.left;
		this.bottom += this.top;
		
		console.log("moveToZeroFromPositive New!!!!! " + this.stringifyStitches());
	};

	Pattern.prototype.moveToPositive = function () {
		var i = 0,
			stitchCount = this.stitches.length;
		for (i = 0; i < stitchCount; i += 1) {
			this.stitches[i].x -= this.left;
			this.stitches[i].y -= this.top;
		}
		// (April) Save dimensions to move back to
		this.oldLeft = this.left;
		this.oldTop = this.top;
		
		this.right -= this.left;
		this.left = 0;
		this.bottom -= this.top;
		this.top = 0;
	};
	
	// BEWARE USING THIS this.left/right will be wrong probably
	Pattern.prototype.translate = function(x, y){
		for (var i = 0; i < this.stitches.length; i += 1) {
			this.stitches[i].x += x;
			this.stitches[i].y += y;
		}
		this.right += x;
		this.left += x;
		this.top += y;
		this.bottom += y;
	};
	
	// BEWARE USING THIS distance between stitches gets big
	Pattern.prototype.scale = function(val) {
		// No scaling down to zero!
		if (val !== 0){
			for (var i = 0; i < this.stitches.length; i++){
				// Make sure there are no decimals... those don't print well...
				this.stitches[i].x = Math.floor(this.stitches[i].x * val);
				this.stitches[i].y = Math.floor(this.stitches[i].y * val);
			}
			
			this.calculateBoundingBox();
		}
	};

	Pattern.prototype.invertPatternVertical = function () {
		var i = 0,
			temp = -this.top,
			stitchCount = this.stitches.length;
		for (i = 0; i < stitchCount; i += 1) {
			this.stitches[i].y = -this.stitches[i].y;
		}
		this.top = -this.bottom;
		this.bottom = temp;
	};

	Pattern.prototype.addColorRandom = function () {
		this.colors[this.colors.length] = new Color(Math.round(Math.random() * 256), Math.round(Math.random() * 256), Math.round(Math.random() * 256), "random");
	};

	Pattern.prototype.fixColorCount = function () {
		var maxColorIndex = 0,
			stitchCount = this.stitches.length,
			i;
		for (i = 0; i < stitchCount; i += 1) {
			maxColorIndex = Math.max(maxColorIndex, this.stitches[i].color);
		}
		while (this.colors.length <= maxColorIndex) {
			this.addColorRandom();
		}
        this.colors.splice(maxColorIndex + 1, this.colors.length - maxColorIndex - 1);
	};
	
	var drawNeedlePos = function(context, x, y, rad, flag){
		context.beginPath();
		
		if((stitchTypes.jump & flag) === stitchTypes.jump){
			context.arc(x, y, rad, 0, 2 * Math.PI, false);
			context.fillStyle = 'black';
		} else if ((stitchTypes.trim & flag) === stitchTypes.trim) {
			context.arc(x, y, rad, 0, 2 * Math.PI, false);
			context.fillStyle = 'green';
		} else if ((stitchTypes.stop & flag) === stitchTypes.stop ||
				   (stitchTypes.end & flag) === stitchTypes.end){
			context.arc(x, y, rad, 0, 2 * Math.PI, false);
			context.fillStyle = 'red';
		} else{
			context.arc(x, y, rad, 0, 2 * Math.PI, false);
			context.fillStyle = 'grey';
		}
		
		context.fill();
	};
	
	Pattern.prototype.drawShape = function(canvas, scale, showPoints) {
		var stScale = 1;
		
		if (scale !== undefined && scale < 1 && scale >= 0){
			stScale = scale;
		} else if (scale > 1 || scale < 0){
			console.log("invalid scale sent to Pattern.drawShape. using default scale 1");
		}
		
		/// 1000 is known as the max canvas and stitch  window
		var topBuffer = (1000 - this.bottom)/2 * stScale; 
		var leftBuffer = (1000 - this.right)/2 * stScale;
		console.log( "topBuffer, leftBuffer: " + topBuffer + ", " + leftBuffer);
		
		if (canvas.getContext) {
			var ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			if(showPoints !== undefined && showPoints === true){
				// Since we skip the first stitch in drawing lines, draw its needle position here
				drawNeedlePos(ctx, leftBuffer + (this.stitches[0].x * stScale), topBuffer + (this.stitches[0].y * stScale), 2, this.stitches[0].flags);
			}
			
			for(var i = 1; i < this.stitches.length; i++){
				var lastSt = this.stitches[i-1];
				var curSt = this.stitches[i];
				
				var color = this.colors[lastSt.color]; // Swaps color
				
				// If this stitch is not a jump (ie, we did not jump here), AND THIS stitch is not a jump, draw a line here
				if((stitchTypes.jump & lastSt.flags) === stitchTypes.jump || 
				   (stitchTypes.trim & lastSt.flags) === stitchTypes.trim ||
				   (stitchTypes.jump & curSt.flags) === stitchTypes.jump || 
				   (stitchTypes.trim & curSt.flags) === stitchTypes.trim){
				   	// DO NOTHIIIIING
			   } else {
				   	
				   	ctx.beginPath();
					ctx.strokeStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
					ctx.moveTo(leftBuffer + (lastSt.x * stScale), topBuffer + (lastSt.y * stScale)); // Moves to point WITHOUT creating a line
				   	
					ctx.lineTo(leftBuffer + (curSt.x * stScale), topBuffer + (curSt.y * stScale)); 
					ctx.stroke(); 
				}
				
				if(showPoints !== undefined && showPoints === true){
					drawNeedlePos(ctx, leftBuffer + (curSt.x * stScale), topBuffer + (curSt.y * stScale), 2, curSt.flags);
				} 
			}
			
		} else {
			global.alert('You need Safari or Firefox 1.5+ to see this demo.');
		}
	};
	
	Pattern.prototype.stringifyStitches = function(){
		var results = "";
		for(var i = 0; i < this.stitches.length; i++){
			results += i + ": (" + this.stitches[i].x + ", " + this.stitches[i].y + ")  ";
		}
		return results;
	};
	
	
	global.Color = Color.prototype.constructor;
	global.Pattern = Pattern.prototype.constructor;
	global.stitchTypes = stitchTypes;

}(this));