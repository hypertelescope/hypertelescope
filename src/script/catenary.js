//  -*-coding: utf-8;-*-
// Directive for JShint
/*global D:true G:true NLS:true profiles:true Image:true $:false
 */
/*!
  @file   catenary.js
  @author Jérôme Maillot
  @date   Sun May 19 2013

  @brief   Main file for cable shape
*/


// Profile is the valley profile
(function(G, D, profiles) {
	'use strict';
	var skyColor, valleyColor, textColor, ticksColor;
	var anchorColor, cableColorDim, cableColor, gondolaColor;

	function setColorScheme(forSnapshot) {
		if (forSnapshot) {
			// Clear with the background color, not transparent black, so that
			// recorded images have the right background color.
			skyColor       = '#E0FFFF';
			valleyColor    = '#FFC060';
			textColor      = '#040810';
			ticksColor     = '#404040';
			anchorColor    = '#505050';
			cableColorDim  = '#8080FF';
			cableColor     = '#1010C0';
			gondolaColor   = '#106010';
		} else {
			skyColor       = '#081020';
			valleyColor    = '#302010';
			textColor      = '#80E0E0';
			ticksColor     = '#606060';
			anchorColor    = '#909090';
			cableColorDim  = '#C0C020';
			cableColor     = '#FFFF00';
			gondolaColor   = '#80FF80';
		}
	}

	function findMinLocation(spline) {
		var minX = 0;
		var minY = spline[0][1];
		for (var i = 1 ; i<spline.length ; i++) {
			if (spline[i][1] < minY) {
				minX = i;
				minY = spline[i][1];
			}
		}
		return minX;
	}

	function findMaxAltitude(spline, minSplineIndex) {
		var maxYleft = spline[0][1];
		var maxYright = spline[spline.length-1][1];
        var i;
		for (i = 0 ; i<minSplineIndex ; i++) {
			if (spline[i][1] > maxYleft) {
				maxYleft = spline[i][1];
			}
		}
		for (i = minSplineIndex ; i<spline.length ; i++) {
			if (spline[i][1] > maxYright) {
				maxYright = spline[i][1];
			}
		}
		return Math.min(maxYleft, maxYright);
	}

	// Precompute a C-spline out of the valley profile

	var spline;
	var minSplineIndex;
	var minAltitude;
	var maxAltitude;
	function initProfileData(profile) {
		if (profile === undefined) {
			spline = [];
			minSplineIndex = -1;
			minAltitude = 500;
			maxAltitude = 5000;
		} else {
			spline = G.cspline(profile, 0.5, 8);
			minSplineIndex = findMinLocation(spline);
			minAltitude = spline[minSplineIndex][1];
			maxAltitude = findMaxAltitude(spline, minSplineIndex);
		}
	}

	function cosh(x) { return (Math.exp(x) + Math.exp(-x))/2; }
	function sinh(x) { return (Math.exp(x) - Math.exp(-x))/2; }
	function argsinh(x) { return Math.log(x+Math.sqrt(1+x*x)); }

	function roundAt(val, power) { return Math.round(val*power)/power; }

	// Return all X coordinales of points in the curve with altitude "altitude"
	function locate(altitude) {
		var res = [];
		var dy;
		var frac;
        var i;

		for (i = minSplineIndex ; i>0 ; i--) {
			dy = spline[i][1] - spline[i-1][1];
			frac = (spline[i][1]-altitude) / dy;
			if ((frac>=0) && (frac<=1)) {
				res.push(spline[i][0] + frac * (spline[i-1][0] - spline[i][0]));
				break;
			}
		}

		for (i = minSplineIndex ; i<spline.length ; i++) {
			dy = spline[i][1] - spline[i-1][1];
			frac = (spline[i][1]-altitude) / dy;
			if ((frac>=0) && (frac<=1)) {
				res.push(spline[i][0] + frac * (spline[i-1][0] - spline[i][0]));
				break;
			}
		}

		// Make sure we have on point on each side of the valley minimum

		if (res.length < 2) {
			return [ spline[0][0], spline[spline.length-1][0] ];
		}
		return res;
	}

	function drawValley(ctx, data, halfSize) {
		if (spline.length <2) {return;}

		var scale = data.meterScale;
		ctx.save();
		ctx.fillStyle = valleyColor;
		ctx.scale(1, -1);

		ctx.translate(-data.anchors[0]*scale-halfSize, -data.altitude*scale);

		ctx.beginPath();
		ctx.moveTo(scale*spline[0][0], 0);
		for(var i=0 ; i<spline.length ; i++) {
			ctx.lineTo(scale*spline[i][0], scale*spline[i][1]);
		}
		ctx.lineTo(scale*spline[spline.length-1][0], 0);
		ctx.fill();

		if ($('#profile').val() === 'C8') {
			var C8coord = [-216, 2090];
			ctx.translate(scale*C8coord[0], scale*C8coord[1]);

			/* North vector
			var long = (44+19/60)*Math.PI/180;
			var north = [200*Math.cos(long), 200*Math.sin(long)];
			ctx.strokeStyle = anchorColor;
			ctx.beginPath();
			D.segment(ctx, [0, 0], north);
			D.arrowHead(ctx, [0, 0], north, 10);
			ctx.stroke();
			*/

			if (!data.forSnapshot) {
				ctx.scale(0.75, -0.75);
				ctx.drawImage(c8Icon, -c8Icon.width/2, -c8Icon.height/2);
			}
		}

		ctx.restore();
	}

	function drawAnchor(ctx, halfSize) {
		var height = 15;
		var offset = 10;

		ctx.save();
		ctx.strokeStyle = anchorColor;
		ctx.fillStyle   = anchorColor;

		ctx.translate(offset+halfSize, 0);

		ctx.beginPath();
		ctx.moveTo(-offset, 0);
		ctx.lineTo(0, offset*0.8);
		ctx.lineTo(0, -offset*0.8);
		ctx.fill();

		ctx.lineWidth = 5;
		ctx.beginPath();
		D.segment(ctx, [0, -height], [0, height*1.4]);
		ctx.stroke();

		ctx.lineWidth = 2;
		ctx.beginPath();
		for (var i= -height ; i<=height ; i += height/2 ) {
			D.segment(ctx, [0, i], [height*0.75, i+height/2]);
		}
		ctx.stroke();

		ctx.restore();
	}

	function drawHalfCable(ctx, data, halfSize, mirror) {
		var numSamples = 50;
		var massRatio = data.weight/(data.tension*2);
		var param = data.tension/data.linMass;
		var horizDistToMin = param * argsinh(massRatio);
		var vertDistToMin = param * cosh(horizDistToMin/param);
		var vertDist = param * cosh((data.valleySize/2 + horizDistToMin)/param) - vertDistToMin;
		var chord = [[0, vertDist], [halfSize/data.meterScale, 0]];

		// Compute cable length
		var length0 =  param * sinh(horizDistToMin/param);
		var length1 =  param * sinh((data.valleySize/2 + horizDistToMin)/param);
		var length = 2*(length1 - length0);

		ctx.save();
		ctx.fillStyle = textColor;

		// Draw chord
		if (data.forSnapshot) { ctx.lineWidth = 3; }
		if (!mirror) {
			ctx.strokeStyle = cableColorDim;
			ctx.beginPath();
			D.segment(ctx,
					  G.mul2(data.meterScale, chord[0]),
					  G.mul2(data.meterScale, chord[1]));
			D.segment(ctx,
					  [0, 0],
					  G.mul2(data.meterScale, chord[0]));
			ctx.stroke();

			if (minSplineIndex>0) {
				var valleyDist = data.altitude-spline[minSplineIndex][1]-vertDist;
				ctx.fillText(NLS.get('Valley distance')+': '+roundAt(valleyDist, 10)+' m', 20, data.meterScale*(vertDist+valleyDist/2));
			}
			ctx.textAlign='center';
			ctx.fillText(NLS.get('Vertical distance')+': '+roundAt(vertDist, 10)+' m', 0, -8);
			ctx.textAlign='end';
			ctx.fillText(NLS.get('Cable length')+': '+roundAt(length, 10)+' m', halfSize-5, -8);
			ctx.textAlign='start';


			// FIXME
			//ctx.fillText("l' : "+roundAt(horizDistToMin, 1000)+" m",
			//			 -halfSize+5, 140);
			//ctx.fillText("h' : "+roundAt(vertDistToMin-param, 1000)+" m",
			//			 -halfSize+5, 160);
			var straight = 2*Math.sqrt(data.valleySize*data.valleySize/4+vertDist*vertDist);
		}

		ctx.strokeStyle = cableColor;

		var maxDist = -1;
		var maxSegment;
		ctx.beginPath();
		ctx.moveTo(0, data.meterScale*vertDist);
		var delta = (data.valleySize/2)/numSamples;
		for (var i=1 ; i<=numSamples ; i++ ) {
			var dist = param * cosh((i*delta + horizDistToMin)/param) - vertDistToMin;
			dist = vertDist - dist;
			var point = [i*delta, dist];
			ctx.lineTo(data.meterScale*point[0], data.meterScale*point[1]);

			var closest = G.proj2(point, chord);
			var distToClosest = G.sqDist2(closest, point);
			if (distToClosest>maxDist) {
				maxDist = distToClosest;
				maxSegment = [point, closest];
			}
		}
		ctx.stroke();

		if (!mirror) {
			ctx.strokeStyle = cableColorDim;
			ctx.beginPath();
			D.segment(ctx,
					  G.mul2(data.meterScale, maxSegment[0]),
					  G.mul2(data.meterScale, maxSegment[1]));
			ctx.stroke();
			maxDist = Math.sqrt(maxDist);
			ctx.fillText(NLS.get('Chord distance')+': '+roundAt(maxDist, 10)+'m',
						 data.meterScale*maxSegment[0][0],
						 data.meterScale*maxSegment[0][1]+25);
			ctx.fillText(NLS.get('Straight distance')+': '+roundAt(straight, 1)+'m',
						 data.meterScale*maxSegment[0][0],
						 data.meterScale*maxSegment[0][1]+50);

			// Vertical tension.
			var vTens = data.tension *
				sinh((data.valleySize/2 + horizDistToMin)/param);
			// Total tension:
			var tens = Math.sqrt(vTens*vTens + data.tension*data.tension);
			ctx.fillText(NLS.get('Tension')+': '+roundAt(tens, 10)+' kg', 5-halfSize, -8);

			if ($('#profile').val() === 'C8') {
				// Draw 50m ground mirror area: f = F/D = 2
				var Dground = 50;
				ctx.beginPath();
				ctx.moveTo(0, data.meterScale*vertDist);
				ctx.lineTo(-Dground/2, data.meterScale*(vertDist+101));
				ctx.lineTo( Dground/2, data.meterScale*(vertDist+101));
				ctx.lineTo(0, data.meterScale*vertDist);
				ctx.stroke();
				ctx.fillText('Effective mirror area: D=50m', 35, data.meterScale*(vertDist+101));
			}

			// Draw gondola
			ctx.fillStyle = gondolaColor;
			ctx.fillRect(-5, data.meterScale*vertDist-5, 10, 30);
		}
		ctx.restore();
	}

	/*! Redraw the canvas.

	  @param canvas Canvas to draw into
	  @param data Current values
	*/
	function refresh(canvas, data) {
		var ctx = canvas.getContext('2d');
		var border = 25;						  // Border in pixels
		var halfSize = (canvas.width / 2)-border; // half valley in pixels
		data.meterScale = halfSize / (data.valleySize/2);

		setColorScheme(data.forSnapshot);

		// Save state
		ctx.save();
		if (data.forSnapshot) {
			ctx.font = 'bold 24px Calibri';
		} else {
			ctx.font = '16px Arial';
		}

		ctx.fillStyle = skyColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Center the coordinate system to the valley mid point
		ctx.translate(canvas.width / 2, border*2);

		drawValley(ctx, data, halfSize);

		// Draw scale
		ctx.strokeStyle = ticksColor;
		ctx.fillStyle = textColor;
		ctx.lineWidth = 1;

		var verticalTicks = [50, 100, 200, 500, 1000, 2000];
		var minYpixels = 40;
		if (data.forSnapshot) { minYpixels=100; }
		ctx.beginPath();
		D.segment(ctx, [-halfSize, 0], [halfSize, 0]);
		for (var it in verticalTicks) {
			var t = verticalTicks[it];
			var pixelY = data.meterScale*t;
			if ((pixelY>minYpixels) && (pixelY<canvas.height-60)) {
				D.segment(ctx, [-halfSize, pixelY], [halfSize, pixelY]);
				ctx.fillText('-'+t.toString()+' m', -halfSize, pixelY-4);
			}
		}
		ctx.stroke();

		// Draw negative 1/2
		ctx.save();
		ctx.scale(-1, 1);
		drawAnchor(ctx, halfSize);
		drawHalfCable(ctx, data, halfSize, true);
		ctx.restore();

		// Draw positive 1/2
		drawAnchor(ctx, halfSize);
		drawHalfCable(ctx, data, halfSize, false);

		// Actual valley size:
		var bottom = canvas.height-border*2-15;
		ctx.fillText(NLS.get('Anchors distance')+': '+roundAt(data.valleySize, 10)+' m', 40-halfSize, bottom-8);

		ctx.beginPath();
		D.arrowHead(ctx, [5-halfSize, bottom], [halfSize-5, bottom], 10);
		D.arrowHead(ctx, [halfSize-5, bottom], [5-halfSize, bottom], 10);
		ctx.moveTo(halfSize-5, bottom);
		ctx.lineTo(5-halfSize, bottom);
		ctx.stroke();

		// Restore state
		ctx.restore();
	}

	/*! Collect all UI values into a JS object.
	  @return A new object with UI values stored in attributes.
	*/
	function getData() {
		// Collect numerical data for all UI elements
		var data = $('div.slider,input[type=checkbox]').getUIData();
		// Convert grams to kg
		data.linMass /= 1000;
		if (data.altitude < minAltitude+20) {
			data.altitude = minAltitude+20;
		}
		if (data.altitude > maxAltitude) {
			data.altitude = maxAltitude;
		}
		if (spline.length>0) {
			data.anchors = locate(data.altitude);
			data.valleySize = data.anchors[1] - data.anchors[0];
		} else {
			data.altitude = 0;
		}
		return data;
	}

	/*! Refresh the canvas
	 */
	function update() {
		var canvas = $('#schema')[0];
		var data = getData();
		refresh(canvas, data);
	}

	/*! Update the valley Profile then refresh
	 */
	function updateProfile() {
		var val = $('#profile').val();
		var profile = profiles[val];
		var preset = profiles.presets[val];

		initProfileData(profile);

		if (preset !== undefined) {
			// Constants
			$('#weight').val(30);
			$('#linMass').val(30);

			for (var key in preset) {
				$('#'+key).val(preset[key]);
			}
		}

		if (profile === undefined) {
			$('#altitude').  fancySlider('visibility', false);
			$('#valleySize').fancySlider('visibility', true);
		} else {
			$('#altitude').  fancySlider('visibility', true);
			$('#valleySize').fancySlider('visibility', false);
		}

		update();
	}

	var c8Icon = new Image();
	c8Icon.src = 'img/C8icon.png';
	c8Icon.onload = function() {
		update();
	};

	function main() {
		// make the canvas interactive to allow record.
		$('#schema').icanvas();

		$.finalizeUI();

		$('#profile').change(updateProfile);

		// Refresh the main view when sliders / checkboxes change
		$('div.slider').on('change slidechange', update);
		$('#forSnapshot').on('change keyup', update);

		updateProfile();
	}

	$('document').ready(main);
})(G, D, profiles);
