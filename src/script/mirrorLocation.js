//  -*-coding: utf-8;-*-
// Directive for JShint
/*global D:true G:true Coord:true
  VirtualTanslate:true
  heightmap:true
  spherepreset:true
  console:true
  CoordConvert:true
  measures2010:true
  measures2013:true
  $:false
 */
/*!
  @file   mirrorLocation.js
  @author Jérôme Maillot
  @date   Sun Jun 09 18:00:08 2013

  @brief   Main file for mirror positionning.
*/

(function(hMap, sphPresets, G) {
	'use strict';

	var converter = new CoordConvert();

	//! List of recently measured points
	var probePresets = [];
	if (measures2013 !== undefined) {
		probePresets = measures2013;
	}

	// Minimum distance between saved probes
	var probeMinDist = 0.1;
	var probeMinDist2 = probeMinDist*probeMinDist;

	var secondaryManipSize = 16;

	// Hard code the sphere location to 'North Mirror'
	var sphLocation;
	for (var i=0 ; i<sphPresets.length ; i++ ) {
		var name = sphPresets[i].name;
		if (name === 'North Mirror') {
			sphLocation = sphPresets[i].data;
		}
	}

	// Image size (pixels)
	var sizeOverview =  512;
	var sizeZoom     = 4096;
	var origin       = [-800, -600];

	// Range of height that will have a blue overlay
	var heightMin = 0;
	var heightMax = 0;

	var imgDisplaySize = 512;

	// Declinaison Vega == +38° 47′ 01.2802
	// Lattitude C8 == 44° 19' 00.25045" N
	var vegaAngle = 44-38 + (19-47)/60 + (0.25045-1.2802)/3600;
	// 5.5330472916666666666666666666667

	// Offset of Vega's projection on ground (m)
	var vegaOffset = 202 * Math.sin(Math.PI/180*vegaAngle);
	// 19.477 m


	// Declinaison Deneb == +45° 16′ 49.2
	// Lattitude C8 == 44° 19' 00.25045" N
	var denebAngle = 44-45 + (19-16)/60 + (0.25045-49.2)/3600;
	// -0.96359709722222222222222222222222

	// Offset of Vega's projection on ground (m)
	var denebOffset = - 202 * Math.sin(Math.PI/180*denebAngle);
	// (-) -3.397 m


	// Area size (m)
	var areaSize = 1000.0;

	// Pixel size in main area and zoom area
	var pixSize = areaSize/sizeOverview;
	var pixSizeZoom = areaSize/sizeZoom;
	var superSampling = sizeZoom/sizeOverview;

	// Cache the presets for faster access.
	var presets = Coord.presets;

	// Colors to display sphere/ground difference
	var colorScale;

	function interpColor(val, colorScale, defVal) {
		if (val >= colorScale[0][0]) {
			for (var i = 1 ; i<colorScale.length ; i++ ) {
				// between values i-1 and i
				if (val < colorScale[i][0]) {
					var c0 = colorScale[i-1];
					var c1 = colorScale[i];
					var perc = (val-c0[0])/(c1[0]-c0[0]);
					var perc2 = 1-perc;

					return [
						perc2*c0[1][0] + perc*c1[1][0],
						perc2*c0[1][1] + perc*c1[1][1],
						perc2*c0[1][2] + perc*c1[1][2]
					];
				}
			}
		}
		return defVal;
	}

	/*!
	  Compute the coordinates in the canvases, from the UV coordinates
	  in meter.
	  [0,1] -> coords in overview
	  [2,3] -> coords in zoom area
	 */
	function canvasCoord(inputPoint, data) {
		return [
			// Coords in overview.
			(inputPoint[0]-origin[0])/pixSize,
			(inputPoint[1]-origin[1])/pixSize,
			// Coords in zoom area
			(inputPoint[0]-origin[0])/pixSizeZoom + data.coordOffsetX,
			(inputPoint[1]-origin[1])/pixSizeZoom + data.coordOffsetY];
	}

	// Bilinear interpolation in a map
	function interpolate(coord, sampledData, sizeX, sizeY) {
		var floorCoord = [Math.floor(coord[0]), Math.floor(coord[1])];
		var fracCoord  = [coord[0] - floorCoord[0], coord[1] - floorCoord[1]];

		// Clamp
		if ((floorCoord[0] < 0) || (floorCoord[1] < 0) ||
			(floorCoord[0] >= sizeX) || (floorCoord[1] >= sizeY)) {
			return -1;
		}

		var j = floorCoord[0] + floorCoord[1] * sizeX;
		var val = (1-fracCoord[1]) *
			( (1-fracCoord[0]) * sampledData[j] + fracCoord[0] * sampledData[j+1] );
		j += sizeX;
		val += fracCoord[1] *
			( (1-fracCoord[0]) * sampledData[j] + fracCoord[0] * sampledData[j+1] );

		return val;
	}

	/*! Redraw the probe canvas overlay, as well as the numerical values

	  @param canvas Canvas to draw into
	  @param data Current values
	*/
	function refreshProbe(canvas, data) {
		var ctx = canvas.getContext('2d');
		var width = canvas.width, height = canvas.height;

		var probeCoord = canvasCoord([data.UVA0, data.UVA1], data);
		var localh = interpolate(probeCoord, hMap.data, width, height);
		localh = clamp(localh);

		var coords = {
			probe2010: [data.UVA0, data.UVA1, localh],
			probe: [data.UVA0, data.UVA1, data.UVA2],
			MirN: presets.MirN.pos,
			MirS: presets.MirS.pos
		};

		$('#C1-U').text(String(clamp(data.posX)));
		$('#C1-V').text(String(clamp(data.posY)));
		$('#C1-A').text(String(clamp(data.centerZ+data.radius)));

		var r2 = data.radius*data.radius;
		for (var key in coords) {
			$('#'+key+'-Z').text(String(coords[key][2]));
			var d2 = G.sqDist2(coords[key], [data.posX, data.posY]);
			if (d2 <= r2) {
				var z = data.centerZ + data.radius-Math.sqrt(r2-d2);
				var z2 = clamp(z);
				$('#'+key+'-sphZ').text(String(z2));
				$('#'+key+'-diff').text(String(clamp(z-coords[key][2])));
			} else {
				$('#'+key+'-sphZ').text('N/A');
				$('#'+key+'-diff').text('N/A');
			}
		}

		ctx.save();
		ctx.clearRect(0, 0, width, height);
		ctx.scale(1, -1);
		ctx.translate(0, -height);

		ctx.strokeStyle = '#FF2020';
		D.cross(ctx, [probeCoord[2], probeCoord[3]], width, height);

		var probeCoord2 = canvasCoord([data.UVAb0, data.UVAb1], data);
		ctx.beginPath();
		ctx.moveTo(probeCoord2[2]-secondaryManipSize, probeCoord2[3]);
		ctx.lineTo(probeCoord2[2]+secondaryManipSize, probeCoord2[3]);
		ctx.moveTo(probeCoord2[2], probeCoord2[3]-secondaryManipSize);
		ctx.lineTo(probeCoord2[2], probeCoord2[3]+secondaryManipSize);
		ctx.stroke();

		ctx.save();
		if ( ctx.setLineDash !== undefined )   {
			ctx.setLineDash([10, 5]); }
		else if ( ctx.mozDash !== undefined ) {
			ctx.mozDash = [10, 5]; }
		ctx.beginPath();
		ctx.moveTo(probeCoord[2], probeCoord[3]);
		ctx.lineTo(probeCoord2[2], probeCoord2[3]);
		ctx.stroke();
		ctx.restore();

		var coord;
		ctx.strokeStyle = '#F0B0E0';
		if (data.drawC1) {
			coord = canvasCoord([data.posX, data.posY], data);
			D.target(ctx, coord[2], coord[3], 10);
		}
		if (data.drawMirN) {
			coord = canvasCoord(presets.MirN.pos, data);
			D.target(ctx, coord[2], coord[3], 10);
		}
		if (data.drawMirS) {
			coord = canvasCoord(presets.MirS.pos, data);
			D.target(ctx, coord[2], coord[3], 10);
		}
		var i;
		if (data.drawIGN) {
			ctx.strokeStyle = '#B0E0B0';
			for ( i = 0 ; i<measures2010.length ; i++ ) {
				coord = canvasCoord(measures2010[i], data);
				D.target(ctx, coord[2], coord[3], 10);
			}
		}
		if (data.drawProbes) {
			ctx.strokeStyle = '#B0D0E0';
			for ( i = 0 ; i<probePresets.length ; i++ ) {
				coord = canvasCoord(probePresets[i], data);
				D.target(ctx, coord[2], coord[3], 10);
			}
		}

		ctx.restore();
	}

	/*! Redraw the canvas.

	  @param canvas Canvas to draw into
	  @param data Current values
	*/
	function refreshLayer(canvas, cen, data, pixSize, offset, superSampling) {
		var ctx = canvas.getContext('2d');
		var width = canvas.width, height = canvas.height;
		// Center in super sampled coordinates

		// save state
		ctx.save();
		ctx.clearRect(0, 0, width, height);

		var	imageData = ctx.createImageData(width, height);
		var i, j, d2, z2, localh;
		var dMax = data.groundRadius/pixSize;
		var dMax2 = dMax * dMax;
		var transparency2 = 255*data.transp2;

		// height value sphere center.

		var scaleZ = 1.0/data.allowedH; // Max out at 4 m

		for(var y = 0; y < height; y ++) {
			for(var x = 0; x < width; x ++) {
				// In case of super sampling, need to interpolate,
				// otherwise direct read.
				if (superSampling === 1) {
					j = x + y * width;
					localh = hMap.data[j];
				} else {
					var xx = (x - offset[0])/superSampling;
					var yy = (y - offset[1])/superSampling;
					localh = interpolate([xx, yy], hMap.data, width, height);
				}

				// Flip vertically: canvas origin is top/left
				i = (x + (height-y-1) * width) * 4;
				d2 = G.sqDist2([x, y], cen);

				imageData.data[i+0] = 0;
				imageData.data[i+1] = 0;
				imageData.data[i+2] = 0;
				imageData.data[i+3] = 0;
				if (d2<dMax2) {
					// FIXME verify!
					z2 = data.radius-Math.sqrt(data.radius2-pixSize*pixSize*d2);
					z2 = data.centerZ + z2 - localh;
					z2 *= scaleZ;

					if (Math.abs(z2) < 1.0) {
						var color = interpColor((z2+1)/2, colorScale,
												[0, 0, 0]);
						imageData.data[i+0] = color[0];
						imageData.data[i+1] = color[1];
						imageData.data[i+2] = color[2];
						imageData.data[i+3] = transparency2;
					}
				}
			}
		}

		ctx.putImageData(imageData, 0, 0);

		ctx.strokeStyle = '#E0E060';
		D.target(ctx, cen[0], height-1-cen[1], dMax, 0.8);
		if (dMax>vegaOffset/pixSize) {
			D.target(ctx, cen[0], height-1-cen[1]-vegaOffset/pixSize, dMax/2, 0.8);
		}
		ctx.restore();
	}

	function refreshZoom(canvas, data) {
		// Shift image background
		$('#mapzoom').css({'left': String(data.imgOffsetX)+'px',
						   'top':  String(data.imgOffsetY)+'px'});

		refreshLayer(canvas, [data.center[2], data.center[3]], data, pixSizeZoom,
					 [data.coordOffsetX, data.coordOffsetY],
					 superSampling);
	}

	function saveProbe() {
		var data = $('input').getUIData();
		var value = [data.UVA0, data.UVA1, data.UVA2];

		// Make sure it is not there yet
		// loop backward as we remove items.
		for ( var i = probePresets.length ; i-- ; ) {
			if (G.sqDist2(value, probePresets[i]) < probeMinDist2) {
				probePresets.splice(i, 1);
			}
		}
		probePresets.push(value);

		updateTop();
	}

	function dumpSavedProbes() {
		var string = JSON.stringify(probePresets);
		console.log(string);
	}

	/*! Collect all UI values into a JS object.
	  @return A new object with UI values stored in attributes.
	*/
	function getData() {

		// Collect numerical data for all UI elements
		var data = $('div.slider,input').getUIData();

		// Add constants
		var keys = ['posX', 'posY', 'radius', 'groundRadius', 'zOffset'];
		for(var i=0 ; i < keys.length ; i++) {
			data[keys[i]] = sphLocation[keys[i]];
		}

		// Compute derived values.
		var point = [(data.posX-origin[0])/pixSizeZoom,
					 (data.posY-origin[1])/pixSizeZoom];

		// Remap point to image center. Add 1 (border size). Image
		// origin is top-left, swap Y
		// FIXME: verify the supersampling offsets
		data.imgOffsetX = imgDisplaySize/2 - point[0] + Number(superSampling);
		data.imgOffsetY = imgDisplaySize/2 - ((sizeZoom-1)-point[1]) + 0.0*superSampling;

		// Offset for meter -> zoom pixel coords
		data.coordOffsetX = imgDisplaySize/2 - point[0] + 0.5*superSampling;
		data.coordOffsetY = imgDisplaySize/2 - point[1] + 0.5*superSampling;

		// coordinates of sphere center projection
		data.center = canvasCoord([data.posX, data.posY], data);
		// Z value for the sphere at center
		data.centerZ = data.zOffset + interpolate(data.center,
												  hMap.data, sizeOverview, sizeOverview);

		data.radius2 = data.radius*data.radius;
		data.groundRadius2 = data.groundRadius * data.groundRadius;

		return data;
	}

	// Used to prevent infinite loop updates
	var isInRefresh = false;

	/*! Refresh the canvas
	 */
	function updateTop() {
		if (isInRefresh) {return;}
		var canvasZT = $('#mapzoomlayertop')[0];
		var data = getData();
		refreshProbe(canvasZT, data);
		updateDistance();
	}

	function update() {
		if (isInRefresh) {return;}
		isInRefresh = true;
		var canvasZ  = $('#mapzoomlayer')[0];
		var data = getData();

		refreshZoom(canvasZ, data);

		// Update the min/max numrical values in the height scale in
		// case it was modified by the user.

		$('#tele-scale-min').text(-Math.round(data.allowedH*10)/10);
		$('#tele-scale-max').text(Math.round(data.allowedH*10)/10);
		isInRefresh = false;

		updateTop();
	}

	function setupScale() {
		$('.scale').each(function() {
			var JQthis = $(this);
			var height = parseFloat(JQthis.css('height'));
			var width  = parseFloat(JQthis.css('width'))-100;
			var min = parseFloat(JQthis.attr('min'));
			var max = parseFloat(JQthis.attr('max'));

			JQthis.css('position', 'relative');
			var id = $(this).getId();
			var idBack = id+'-background';
			var idTicks = id+'-ticks';
			var idMin = id+'-min';
			var idMax = id+'-max';

			var inner =
				'<table class="layout"><tr><td id="'+idMin+'">'+min+'</td>'+
				'<td><div style="position:relative; '+
				'height:'+height+'px; width:'+width+'px; " >'+
				"<canvas id='"+idBack+"' style='z-index=1'></canvas>"+
				"<canvas id='"+idTicks+"' style='z-index=2'></canvas>"+
				'</div><td id="'+idMax+'">'+max+'</td></tr></table>';
			JQthis.append(inner);

			var JQback  = $('#'+idBack);
			JQback.css('position', 'absolute');
			JQback.height(height);
			JQback.width(width);

			$.drawTicksInCanvas(JQback, min, max);
			// Draw the background gradient
			var ctx = JQback[0].getContext('2d');
			var data = $.parseJSON('['+JQthis.attr('data')+']');

			ctx.save();
			var lingrad = ctx.createLinearGradient(0, 0, width, 0);
			for (var i=0 ; i<data.length-1 ; i+=2) {
				lingrad.addColorStop(data[i], data[i+1]);
			}
			ctx.fillStyle = lingrad;
			// draw shapes
			ctx.fillRect(0, 0, width, height);
			ctx.restore();

			var JQticks = $('#'+idTicks);
			JQticks.css('position', 'absolute');
			JQticks.height(height);
			JQticks.width(width);

			$.drawTicksInCanvas(JQticks, min, max);
		});
	}

	function keyAccelerators(event) {
		if (event.type === 'keydown') {
			var haut = $('#zOffset');
			var val = haut.getFloat();
			var displ = 0.1;
			if (event.shiftKey) {displ *= 5 ;}
			if (event.ctrlKey) {displ *= 2 ;}
			switch (event.which) {
				case 90: // 'z' decrement
				haut.val(val - displ);
				break;
				case 88: // 'x' increment
				haut.val(val + displ);
				break;
				case 83: // 's' Save probe
				saveProbe();
				break;
			}
		}
		return true;
	}

	function clamp(val) {
		return Math.round(val*1000)/1000;
	}

	function clamp3(vect) {
		return [clamp(vect[0]), clamp(vect[1]), clamp(vect[2])];
	}

	function updateDistance() {
		var pt0 = [$('#UVA0').val(), $('#UVA1').val(), $('#UVA2').val()];
		var pt1 = [$('#UVAb0').val(), $('#UVAb1').val(), $('#UVAb2').val()];
		var d2 = G.dist2(pt0, pt1);
		var d3 = G.dist3(pt0, pt1);

		$('#distance2').text(String(clamp(d2))+'m (horiz)');
		$('#distance3').text(String(clamp(d3))+'m (3D)');
	}

	var blockUpdate = false;
	function UVAtoENA(suffix, index, val) {
		var fromName = 'UVA';
		var toName = 'ENA';
		if (suffix !== undefined) {
			fromName += suffix;
			toName += suffix;
		}
		var uva = [$('#'+fromName+'0').val(),
				   $('#'+fromName+'1').val(),
				   $('#'+fromName+'2').val()];
		if (index !== undefined) {uva[index] = val;}
		var ena = clamp3(converter.UVAtoENA(uva));

		blockUpdate = true;
		$('#'+toName+'0').val(ena[0]);
		$('#'+toName+'1').val(ena[1]);
		$('#'+toName+'2').val(ena[2]);
		blockUpdate = false;
		updateTop();
	}

	function ENAtoUVA(suffix, index, val) {
		var fromName = 'ENA';
		var toName = 'UVA';
		if (suffix !== undefined) {
			fromName += suffix;
			toName += suffix;
		}
		if (blockUpdate) {return;}
		var ena = [$('#'+fromName+'0').val(),
				   $('#'+fromName+'1').val(),
				   $('#'+fromName+'2').val()];
		if (index !== undefined) {ena[index] = val;}
		var uva = clamp3(converter.ENAtoUVA(ena));

		$('#'+toName+'0').val(uva[0]);
		$('#'+toName+'1').val(uva[1]);
		$('#'+toName+'2').val(uva[2]);
	}

	function main() {
		// For iOS: disable page scrolling to get mouse move events
		//$("body").on('touchmove', function(e){ e.preventDefault(); });

		// Get the color scale from the scae control
		var data = $.parseJSON('['+$('#tele-scale').attr('data')+']');
		var i;
		colorScale = [];
		for (i=0 ; i<data.length-1 ; i+=2) {
			var red   = parseInt(data[i+1].substring(1, 3), 16);
			var green = parseInt(data[i+1].substring(3, 5), 16);
			var blue  = parseInt(data[i+1].substring(5, 7), 16);
			colorScale.push([data[i], [red, green, blue]]);
		}

		$.finalizeUI();
		setupScale();

		// Set the default values
		var MirSpos = Coord.presets.MirS.pos;
		$('#UVA0').val(MirSpos[0]);
		$('#UVA1').val(MirSpos[1]);
		$('#UVA2').val(MirSpos[2]);
		UVAtoENA();
		$('#UVAb0').val(MirSpos[0]);
		$('#UVAb1').val(MirSpos[1]);
		$('#UVAb2').val(MirSpos[2]);
		UVAtoENA('b');

		var cbData = [
			{sel:'#UVA0', pos:0, suffix:'',  cb:UVAtoENA},
			{sel:'#UVA1', pos:1, suffix:'',  cb:UVAtoENA},
			{sel:'#UVA2', pos:2, suffix:'',  cb:UVAtoENA},
			{sel:'#ENA0', pos:0, suffix:'',  cb:ENAtoUVA},
			{sel:'#ENA1', pos:1, suffix:'',  cb:ENAtoUVA},
			{sel:'#ENA2', pos:2, suffix:'',  cb:ENAtoUVA},
			{sel:'#UVAb0', pos:0, suffix:'b', cb:UVAtoENA},
			{sel:'#UVAb1', pos:1, suffix:'b', cb:UVAtoENA},
			{sel:'#UVAb2', pos:2, suffix:'b', cb:UVAtoENA},
			{sel:'#ENAb0', pos:0, suffix:'b', cb:ENAtoUVA},
			{sel:'#ENAb1', pos:1, suffix:'b', cb:ENAtoUVA},
			{sel:'#ENAb2', pos:2, suffix:'b', cb:ENAtoUVA}
		];
		for (i=0 ; i<cbData.length ; i++ ) {
			// Need to wrap the inner part of a loop in an anonymous
			// function call to add a scope. This is necessary so that
			// cd is a different variable at each iteration and can be
			// used for the on(spin) closure.
			(function() {
				var cd = cbData[i];
				$(cd.sel).on('change', function() {
								 cd.cb(cd.suffix);
				});

				$(cd.sel).on('spin', function(event, ui) {
								 cd.cb(cd.suffix, cd.pos, ui.value);
				});
			})();
		}

		// Get the min/max actual values for the scale
		//Set $('#ground-scale-max').text(Math.round(heightmap.max/10)*10);
		heightMin = parseInt($('#ground-scale-min').text(), 10);
		heightMax = parseInt($('#ground-scale-max').text(), 10);

		// Init values
		$('div.slider').on('change slidechange', update);
		$('.JQspinner').on('change spinchange', updateTop);
		$('input.boolean').on('change', updateTop);

		// Resize the canvases to match the height map.
		$('#mapzoomlayer').attr({'width': heightmap.sizeX, 'height': heightmap.sizeY});
		$('#mapzoomlayertop').attr({'width': heightmap.sizeX, 'height': heightmap.sizeY});

		// Add Z X shortcuts to modify altitude
		var JQcanvasZoom = $('#mapzoomlayertop').icanvas();
		JQcanvasZoom.on('keydown', keyAccelerators);

		// Add a secondary manip to compute distances. Add it first so
		// that it has picking priority
		var JQcanvasZoomTop = $('#mapzoomlayertop').icanvas();
		var manip = new VirtualTanslate(JQcanvasZoomTop, $('#UVAb0'), $('#UVAb1'));
		manip.option('sensorSize', secondaryManipSize*2);
		manip.option('yUp', true);

		// Add cross hair manip to display altitude
		manip = new VirtualTanslate(JQcanvasZoomTop, $('#UVA0'), $('#UVA1'));
		manip.option('yUp', true);

		$('#SaveProbe').click(saveProbe);
		$('#DumpProbes').click(dumpSavedProbes);

		update();
	}

	$('document').ready(main);
})(heightmap, spherepreset, G);
