//  -*-coding: utf-8;-*-
// Directive for JShint
/*global D:true G:true Coord:true
  CoordConvert:true
  VirtualTanslate:true
  jQuery:false
 */
/**
  @file   Coordinates-ui.js
  @author Jérôme Maillot
  @date   Tue Dec 25 13:57:53 2012

  @brief  UI callbacks for coordinate transformation pages
*/

(function($, D, G) {
	'use strict';

	// Config variables:

	// Image size (pixels)
	var sizeOverview =  512;
	var sizeZoom     = 4096;
	var origin    = [-800, -600];

	var imgDisplaySize = 512;
	// Area size (m)
	var areaSize = 1000.0;

	var zoomRectSize = sizeOverview / (sizeZoom/sizeOverview);

	// Global data
	var presetData = [];
	for (var key in Coord.presets) {
		// Use extend for deep copy
		var val = Coord.presets[key];
		presetData.push($.extend(true, {
			posAsString: [val.pos[0].toFixed(3),
						  val.pos[1].toFixed(3),
						  val.pos[2].toFixed(3)].join(' ') },
								 Coord.presets[key]));
	}

	// Sizes in pixel.
	var targetSize = 10;
	var mesureTargetSize = 5;

	/** Draw and array of point over the canvas
		[u, v, a]
	 */
	function drawArray(array, origin, pixSize, height, offX, offY,
					   targSize, ctx) {
		for(var i=0 ; i<array.length ; i++) {
			var xx       = array[i][0];
			var yy       = array[i][1];
			var point   = [(xx-origin[0])/pixSize+offX,
						   (yy-origin[1])/pixSize+offY];
			if (height>0) {
				point[1] = (height-1)-point[1];
			}

			D.target(ctx, point[0], point[1], targSize);
		}
	}

	/** Redraw the canvas overlay.

	  @param canvas Canvas to draw into
	  @param data Current values
	*/
	function refreshTop() {
		var drawPresets = $('#drawPresets').getBool();
		var draw2010 = $('#draw2010').getBool();
		var draw2012 = $('#draw2012').getBool();
		var draw2013 = $('#draw2013').getBool();

		var canvas  = $('#maplayer')[0];
		var ctx     = canvas.getContext('2d');
		var width   = canvas.width, height = canvas.height;
		var pixSize = areaSize/(sizeOverview-1);
		var x       = $('#posX').val();
		var y       = $('#posY').val();
		var point   = [(x-origin[0])/pixSize, (y-origin[1])/pixSize];

		ctx.save();
		ctx.scale(1, -1);
		ctx.translate(0, -height);

		ctx.clearRect(0, 0, width, height);

		ctx.strokeStyle = '#C0D0E0';
		ctx.beginPath();
		ctx.moveTo(point[0], 0);
		ctx.lineTo(point[0], height);
		ctx.moveTo(0,        point[1]);
		ctx.lineTo(width,    point[1]);
		ctx.stroke();
		// Draw zoom area
		ctx.strokeRect(point[0]-zoomRectSize/2, point[1]-zoomRectSize/2,
					   zoomRectSize, zoomRectSize);

		if (drawPresets) {
			ctx.strokeStyle = '#FFFF40';
			for(var i=0 ; i<presetData.length ; i++) {
				var xx       = presetData[i].pos[0];
				var yy       = presetData[i].pos[1];
				point   = [(xx-origin[0])/pixSize, (yy-origin[1])/pixSize];
				D.target(ctx, point[0], point[1], targetSize);
			}
		}

		if (draw2010) {
			ctx.strokeStyle = '#40FFFF';
			drawArray(measures2010, origin, pixSize, 0, 0, 0,
					  mesureTargetSize, ctx);
		}
		if (draw2012) {
			ctx.strokeStyle = '#FFFFFF';
			drawArray(sol2012, origin, pixSize, 0, 0, 0,
					  mesureTargetSize, ctx);
		}
		if (draw2013) {
			ctx.strokeStyle = '#FF4040';
			drawArray(sol2013, origin, pixSize, 0, 0, 0,
					  mesureTargetSize, ctx);
		}

		ctx.restore();

		// Zoom area
		pixSize = areaSize/(sizeZoom-1);
		point   = [(x-origin[0])/pixSize, (sizeZoom-1)-(y-origin[1])/pixSize];
		// remap point to image center. Add 1 (border size)
		var offX = String(1+imgDisplaySize/2 - point[0]);
		var offY = String(1+imgDisplaySize/2 - point[1]);
		$('#mapzoom').css({'left': offX+'px', 'top': offY+'px'});

		drawZoomLayer();
	}

	function drawZoomLayer() {
		var drawPresets = $('#drawPresets').getBool();
		var draw2010 = $('#draw2010').getBool();
		var draw2012 = $('#draw2012').getBool();
		var draw2013 = $('#draw2013').getBool();
		var canvas  = $('#mapzoomlayer')[0];
		var ctx     = canvas.getContext('2d');
		var width   = canvas.width, height = canvas.height;
		var w2      = width/2, h2 = height/2;
		var skip    = 20;

		ctx.save();
		ctx.scale(1, -1);
		ctx.translate(0, -height);

		ctx.clearRect(0, 0, width, height);

		ctx.strokeStyle = '#081020';
		ctx.fillStyle = '#C0E0FF';

		ctx.fillRect(w2-2, 0, 4, h2 - 2*skip);
		ctx.fillRect(w2-2, h2 + 2*skip, 4, h2 - 2*skip);
		ctx.fillRect(0, h2-2, w2 - 2*skip, 4);
		ctx.fillRect(w2 + 2*skip, h2-2, w2 - 2*skip, 4);

		ctx.beginPath();
		ctx.moveTo(w2, 0);
		ctx.lineTo(w2, h2 - skip);
		ctx.moveTo(w2, h2 + skip);
		ctx.lineTo(w2, height);
		ctx.moveTo(0,         h2);
		ctx.lineTo(w2 - skip, h2);
		ctx.moveTo(w2 + skip, h2);
		ctx.lineTo(width,     h2);
		ctx.stroke();

		if (drawPresets || draw2013 || draw2012 || draw2010) {
			ctx.save();
			ctx.scale(1, -1);
			ctx.translate(0, -height);

			var pixSize = areaSize/(sizeZoom-1);
			var x       = $('#posX').val();
			var y       = $('#posY').val();
			var point   = [(x-origin[0])/pixSize, (y-origin[1])/pixSize];
			// remap point to image center
			var offX = imgDisplaySize/2 - point[0];
			var offY = imgDisplaySize/2 - point[1];

			if (drawPresets) {
				ctx.strokeStyle = '#FFFF40';
				for(var i=0 ; i<presetData.length ; i++) {
					var xx       = presetData[i].pos[0];
					var yy       = presetData[i].pos[1];

					var point2   = [(xx-origin[0])/pixSize+offX,
									(height-1)-((yy-origin[1])/pixSize+offY)];

					D.target(ctx, point2[0], point2[1], targetSize);
				}
			}

			if (draw2010) {
				ctx.strokeStyle = '#40FFFF';
				drawArray(measures2010, origin, pixSize, height, offX, offY,
						  targetSize, ctx);
			}
			if (draw2012) {
				ctx.strokeStyle = '#FFFFFF';
				drawArray(sol2012, origin, pixSize, height, offX, offY,
						  targetSize, ctx);
			}
			if (draw2013) {
				ctx.strokeStyle = '#FF4040';
				drawArray(sol2013, origin, pixSize, height, offX, offY,
						  targetSize, ctx);
			}

			ctx.restore();
		}

		ctx.restore();
	}

	function setIfDiff(elem, val) {
		if (elem.val() !== val) {
			elem.val(val);
		}
	}

	function getInputCoords() {
		var coord=$('#coord').val().replace(/[;,\s]+/g, '|').split('|');
		// coord[0] is empty if the string starts with a blank.
		if (coord[0] === '') {
			coord.shift();
		}
		var a = parseFloat(coord[0]);
		var b = parseFloat(coord[1]);
		var c = parseFloat(coord[2]);

		// Make it simple to copy from Google: set the altitude to
		// 2000 if not set
		if (isNaN(c)) { c = 2000; }

		// Warning: to be consistent with GoogleMap, input shows lat
		// before long.
		if ($('#from-unit').val() === 'LLA') {
			return [b, a, c];
		}

		return [a, b, c];
	}


	/** Recompute all coordinates and update the table.
	 */
	function update() {
		var system = $('#from-unit').val();
		var coord = getInputCoords();
		var converter = new CoordConvert();

		var a = coord[0];
		var b = coord[1];
		var c = coord[2];

		var uva, xyz, lla, ena;

		if (!(isNaN(a) || isNaN(b) || isNaN(c))) {
			switch (system) {
			case 'UVA': uva = [a, b, c]; break;
			case 'LLA': lla = [a, b, c]; uva = converter.LLAtoUVA(a, b, c); break;
			case 'ENA': ena = [a, b, c]; uva = converter.ENAtoUVA(a, b, c); break;
			case 'XYZ': xyz = [a, b, c]; uva = converter.XYZtoUVA(a, b, c); break;
			}
			if (lla === undefined) {lla = converter.UVAtoLLA(uva[0], uva[1], uva[2]);}
			if (ena === undefined) {ena = converter.UVAtoENA(uva[0], uva[1], uva[2]);}
			if (xyz === undefined) {xyz = converter.UVAtoXYZ(uva[0], uva[1], uva[2]);}

			// Update the manipulator
			if (userInput !== 'pos') {
				setIfDiff($('#posX'), uva[0]);
				setIfDiff($('#posY'), uva[1]);
			}

			// Update the results
			$('#UVA0').text(uva[0].toFixed(3));
			$('#UVA1').text(uva[1].toFixed(3));
			$('#UVA2').text(uva[2].toFixed(3));

			$('#LLA1').html(lla[1].toFixed(8) +'°');
			$('#LLA0').html(lla[0].toFixed(8) +'°');
			$('#LLA2').text(lla[2].toFixed(3));
			$('#LLA1b').html(converter.dms(lla[1]));
			$('#LLA0b').html(converter.dms(lla[0]));

			$('#ENA0').text(ena[0].toFixed(3));
			$('#ENA1').text(ena[1].toFixed(3));
			$('#ENA2').text(ena[2].toFixed(3));

			$('#XYZ0').text(xyz[0].toFixed(3));
			$('#XYZ1').text(xyz[1].toFixed(3));
			$('#XYZ2').text(xyz[2].toFixed(3));

			// Check if we are within the precision range of matrices.
			if (converter.accurate(uva)) {
				$('.res').css({'background-color': '', 'color': ''});
				$('#warning').hide();
			} else {
				$('.res').css({'background-color': '#A01020', 'color': 'white'});
				$('#warning').show();
			}
		} else {
			$('.res').text('');
			$('.res').css({'background-color': '', 'color': ''});
			$('#warning').hide();
		}

		refreshTop();
	}

	/**
	   Stores the input widget that user interacted. Prevents update loops.
	 */
	var userInput;

	function refreshPreset() {
		if ($('#from-unit').val() === 'UVA') {
			var coords = getInputCoords();
			for(var i=0 ; i<presetData.length ; i++) {
				if (G.eq3(presetData[i].pos, coords)) {
					$('#presets').val(presetData[i].name);
					return;
				}
			}
		}
		$('#presets').val('-');
	}

	function updateFromManip() {
		if (userInput === undefined) {
			userInput = 'pos';
		}

		if (userInput !== 'coord') {
			var converter = new CoordConvert();
			var uva = [0, 0, 0];
			uva[0] = parseFloat($('#posX').val());
			uva[1] = parseFloat($('#posY').val());
			uva[2] = parseFloat($('#UVA2').text());
			if (isNaN(uva[2])) {
				uva[2] = 2063.144;
			}

			var values;
			var system = $('#from-unit').val();
			var prec = [3, 3, 3];
			switch (system) {
			case 'UVA': values = uva; break;
			case 'LLA':
				values = converter.UVAtoLLA(uva[0], uva[1], uva[2]);
				values = [values[1], values[0], values[2]];
				prec = [8, 8, 3];
				break;
			case 'ENA':
				values = converter.UVAtoENA(uva[0], uva[1], uva[2]);
				break;
			case 'XYZ':
				values = converter.UVAtoXYZ(uva[0], uva[1], uva[2]);
				break;
			}

			values = [values[0].toFixed(prec[0]),
					  values[1].toFixed(prec[1]),
					  values[2].toFixed(prec[2])];

			$('#coord').val(values.join(' '));

		    refreshPreset();
		    update();
		}

		if (userInput === 'pos') {
			userInput = undefined;
		}
	}

	function updateFromInput() {
		if (userInput === undefined) {
			userInput = 'coord';
		}

		refreshPreset();
		update();

		if (userInput === 'coord') {
			userInput = undefined;
		}
	}

	/** Apply a preset.
	 */
	function applyPreset() {
		var name = $('#presets').val();
		for(var i=0 ; i<presetData.length ; i++) {
			if (presetData[i].name === name) {
				userInput = 'coord';
				$('#coord').val(presetData[i].posAsString);
				$('#from-unit').val('UVA');
				update();
				userInput = undefined;
				return;
			}
		}
	}

	/**
	   Build the preset UI
	 */
	function createPresetMenu() {
		var menu = $('#presets');
		for(var i=0 ; i<presetData.length ; i++) {
			var name = presetData[i].name;
			menu.append("<option value='"+name+"'>"+name+'</option>');
		}
		$('#presets').val(presetData[0].name);
	}

	/**
		Update the input data when changing the coordinate system
	 */
	function changeUnits() {
		var system = $('#from-unit').val();
		var coordUI = [ '#'+system+'0', '#'+system+'1', '#'+system+'2' ];
		if (system === 'LLA') {
			coordUI = [coordUI[1], coordUI[0], coordUI[2]];
		}
		var coordVals = [ $(coordUI[0]).text(), $(coordUI[1]).text(), $(coordUI[2]).text() ];
		$('#coord').val(coordVals.join(' ').replace(/°/g, ''));
		updateFromInput();
	}

	/** Main routine: register all even listeners
	 */
	function main() {
		createPresetMenu();
		$.finalizeUI();

		// Listen for change on all <input>s and <select>s
		$('#coord').on('change keyup', updateFromInput);
		$('#from-unit').on('change', changeUnits);
		$('#presets').on('change keyup', applyPreset);
		$('div.slider').on('change slidechange', updateFromManip);
		$('#drawPresets').on('change keyup', refreshTop);
		$('#draw2010').on('change keyup', refreshTop);
		$('#draw2012').on('change keyup', refreshTop);
		$('#draw2013').on('change keyup', refreshTop);

		// Resize the canvas to match the background image.
		//var image = $("#map");
		//var h = image.height();
		//var w = image.width();
		var h = imgDisplaySize; // img is not yet loaded
		var w = imgDisplaySize;
		$('#maplayer').attr({'width': w, 'height': h});
		$('#mapzoomlayer').attr({'width': w, 'height': h});

		// Make the canvas interactive, add one manip for current point
		var JQcanvas = $('#maplayer').icanvas();
		var manip = new VirtualTanslate(JQcanvas, $('#posX'), $('#posY'));
		manip.option('yUp', true);

		// Make the zoom canvas interactive, add one manip
		JQcanvas = $('#mapzoomlayer').icanvas();
		manip = new VirtualTanslate(JQcanvas, $('#posX'), $('#posY'));
		manip.option('yUp', true);
		// Set the manip to move the background. Default moves the
		// manip on top of the background. This reverses the
		// translation.
		manip.option('dragBackground', true);
		manip.option('xScale', sizeZoom/sizeOverview);
		manip.option('yScale', sizeZoom/sizeOverview);

		applyPreset();
		drawZoomLayer();
	}

	$('document').ready(main);

})(jQuery, D, G);
