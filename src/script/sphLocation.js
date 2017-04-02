//  -*-coding: utf-8;-*-
// Directive for JShint
/*global D:true G:true Coord:true
  VirtualTanslate:true
  heightmap:true
  spherepreset:true
  console:true
  $:false
 */
/*!
  @file   sphMirror.js
  @author Jérôme Maillot
  @date   Sun Dec 23 18:00:08 2012

  @brief   Main file for spherical mirror.
*/

(function(hMap, sphPresets, G) {
	'use strict';

	// Image size (pixels)
	var sizeOverview =  512;
	var sizeZoom     = 4096;
	var origin       = [-800, -600];

	// Range of height that will have a blue overlay
	var heightMin = 0;
	var heightMax = 0;

	var imgDisplaySize = 512;

	// Declinaison Vega == +38° 47′ 01.2802
	// Latitude C8 == 44° 19' 00.25045" N
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

	// Geographic north direction. It corresponds to [0, cos(lat), sin(lat)]
	// with 44° 19' 00.25045" N
	// Values were computed explicitly using Circe and an offset along
	// the Z axis.
	var north = [ 0, 0.715318, 0.699300];

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

		var probeCoord = canvasCoord([data.cursX, data.cursY], data);
		var localh = interpolate(probeCoord, hMap.data, width, height);
		localh = Math.floor(0.5+localh*1000)/1000;

		var coords = {
			probe: [data.cursX, data.cursY, localh],
			MirN: presets.MirN.pos,
			MirS: presets.MirS.pos
		};

		$('#C1-U').text(String(Math.floor(0.5+(data.posX)*1000)/1000));
		$('#C1-V').text(String(Math.floor(0.5+(data.posY)*1000)/1000));
		$('#C1-A').text(String(Math.floor(0.5+(data.centerZ+data.radius)*1000)/1000));

		var r2 = data.radius*data.radius;
		for (var key in coords) {
			$('#'+key+'-Z').text(String(coords[key][2]));
			var d2 = G.sqDist2(coords[key], [data.posX, data.posY]);
			if (d2 <= r2) {
				var z = data.centerZ + data.radius-Math.sqrt(r2-d2);
				var z2 = Math.floor(0.5+z*1000)/1000;
				$('#'+key+'-sphZ').text(String(z2));
				$('#'+key+'-diff').text(String(Math.floor(0.5+(z-coords[key][2])*1000)/1000));
			} else {
				$('#'+key+'-sphZ').text('N/A');
				$('#'+key+'-diff').text('N/A');
			}
		}

		ctx.save();
		ctx.clearRect(0, 0, width, height);
		ctx.scale(1, -1);
		ctx.translate(0, -height);

		ctx.strokeStyle = '#E0D0B0';
		D.cross(ctx, [probeCoord[2], probeCoord[3]], width, height);

		if (data.drawMirN) {
			var MirNcord = canvasCoord(presets.MirN.pos, data);
			D.target(ctx, MirNcord[2], MirNcord[3], 10);
		}
		if (data.drawMirS) {
			var MirScord = canvasCoord(presets.MirS.pos, data);
			D.target(ctx, MirScord[2], MirScord[3], 10);
		}

		ctx.restore();
	}

	/*! Redraw the canvas overlay.

	  @param canvas Canvas to draw into
	  @param data Current values
	*/
	function refreshTop(canvas, data) {
		var ctx = canvas.getContext('2d');
		var width = canvas.width, height = canvas.height;
		var ratio = 1/pixSize;
		var ign1 = G.mul2(-ratio, origin);
		var C1   = G.add2(G.mul2(ratio, presets.C1.pos), ign1);
		var C8   = G.add2(G.mul2(ratio, presets.C8.pos), ign1);
		var MirN = G.add2(G.mul2(ratio, presets.MirN.pos), ign1);
		var MirS = G.add2(G.mul2(ratio, presets.MirS.pos), ign1);

		ctx.save();
		ctx.scale(1, -1);
		ctx.translate(0, -height);

		ctx.clearRect(0, 0, width, height);

		if (data.drawIGN1) {
			ctx.strokeStyle = '#C0D0E0';
			D.cross(ctx, ign1, width, height);
		}

		if (data.drawC1) {
			ctx.strokeStyle = '#E0C0D0';
			D.cross(ctx, C1, width, height);
		}

		if (data.drawC8) {
			ctx.strokeStyle = '#E0C0D0';
			D.cross(ctx, C8, width, height);
		}

		if (data.drawMirN) {
			ctx.strokeStyle = '#E0C0D0';
			D.cross(ctx, MirN, width, height);
		}
		if (data.drawMirS) {
			ctx.strokeStyle = '#E0C0D0';
			D.cross(ctx, MirS, width, height);
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
		var scale = 255.0/(heightMax-heightMin);
		var dMax = data.groundRadius/pixSize;
		var dMax2 = dMax * dMax;
		var transparency = 255*data.transp;
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
				var zColor = (localh-heightMin)*scale;
				if ((zColor>=0) && (zColor<256)) {
					imageData.data[i+0] = 64;
					imageData.data[i+1] = 255-zColor;
					imageData.data[i+2] = 255;
					imageData.data[i+3] = transparency;
				} else {
					imageData.data[i+0] = 0;
					imageData.data[i+1] = 0;
					imageData.data[i+2] = 0;
					imageData.data[i+3] = 0;
				}

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

	function refresh(canvas, data) {
		refreshLayer(canvas, data.center, data, pixSize, [0, 0], 1);
	}

	function refreshZoom(canvas, data) {
		// Shift image background
		$('#mapzoom').css({'left': String(data.imgOffsetX)+'px',
						   'top':  String(data.imgOffsetY)+'px'});

		data.transp = 0;
		refreshLayer(canvas, [data.center[2], data.center[3]], data, pixSizeZoom,
					 [data.coordOffsetX, data.coordOffsetY],
					 superSampling);
	}

	function saveTargetPreset() {
		// Collect numerical data for all UI elements
		var data = $('div.slider,input[type=checkbox]').getUIData();
		var targetData = {
			'pos': [data.cursX, data.cursY]
		};

		var string = JSON.stringify(targetData);
		console.log(string);
	}

	function savePreset() {
		// Collect numerical data for all UI elements
		var data = $('div.slider,input[type=checkbox]').getUIData();
		var string = JSON.stringify(data);
		console.log(string);
	}

	function updatePreset() {
		var id = parseFloat($('#presets').val());
		var data = sphPresets[id].data;
		for (var key in data) {
			$('#'+key).val(data[key]);
		}
	}

	/*! Project the sphere location along the C8 geographic north direction.
	 */
	function alignC8() {
		// First, set the x coordinate
		var posX = presets.C8.pos[0];
		$('#posX').setValueIfDiff(posX);

		// Compute the elevation offset.
		var posY = $('#posY').getFloat();
		var deltaY = posY - presets.C8.pos[1];
		var k = deltaY / north[1];
		var posZ = north[2] * k;

		// Coords in overview.
		var coord = [(posX-origin[0])/pixSize, (posY-origin[1])/pixSize];
		var localh = interpolate(coord,
								 hMap.data, heightmap.sizeX, heightmap.sizeY);

		var radius = $('#radius').val();
		var zOffset = presets.C8.pos[2] + (posZ-radius)-localh;
		$('#zOffset').setValueIfDiff(zOffset);
	}

	/*! Collect all UI values into a JS object.
	  @return A new object with UI values stored in attributes.
	*/
	function getData() {
		// First get the alignC8 value, and project if necessary.
		var isAlign = $('#alignC8').getBool();
		if (isAlign) { alignC8(); }

		// Collect numerical data for all UI elements
		var data = $('div.slider,input[type=checkbox]').getUIData();

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
	function update() {
		if (isInRefresh) {return;}
		isInRefresh = true;
		var canvas   = $('#map')[0];
		var canvasZ  = $('#mapzoomlayer')[0];
		var canvasZT = $('#mapzoomlayertop')[0];
		var data = getData();
		refresh(canvas, data);
		refreshZoom(canvasZ, data);
		refreshProbe(canvasZT, data);

		// Update the min/max numrical values in the height scale in
		// case it was modified by the user.

		$('#tele-scale-min').text(-Math.round(data.allowedH*10)/10);
		$('#tele-scale-max').text(Math.round(data.allowedH*10)/10);
		isInRefresh = false;
	}

	/*! Refresh the canvas
	 */
	function updateTop() {
		if (isInRefresh) {return;}
		isInRefresh = true;
		var canvas = $('#maplayer')[0];
		var data = getData();
		refreshTop(canvas, data);
		isInRefresh = false;
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
				case 83: // 's' Save preset
				if (event.srcElement.id === 'mapzoomlayertop') {
					saveTargetPreset();
				} else {
					savePreset();
				}
				break;
			}
		}
		return true;
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

		// Add the presets to the menu
		var JQpresets= $('#presets');
		for (i=0 ; i<sphPresets.length ; i++ ) {
			var name = sphPresets[i].name;
			JQpresets.append('<option value="'+String(i)+'">'+name+'</option>');
		}
		JQpresets.on('change', updatePreset);

		$.finalizeUI();
		setupScale();
		// Set the values to the first preset. Needs to be done AFTER
		// finalize UI
		updatePreset();

		// Get the min/max actual values for the scale
		//Set $('#ground-scale-max').text(Math.round(heightmap.max/10)*10);
		heightMin = parseInt($('#ground-scale-min').text(), 10);
		heightMax = parseInt($('#ground-scale-max').text(), 10);

		$('input').on('change', updateTop);

		// Init values
		$('#res').val('PAL');
		$('div.slider').on('change slidechange', update);

		// Resize the canvases to match the height map.
		$('#map').attr({'width': heightmap.sizeX, 'height': heightmap.sizeY});
		$('#maplayer').attr({'width': heightmap.sizeX, 'height': heightmap.sizeY});
		$('#mapzoomlayer').attr({'width': heightmap.sizeX, 'height': heightmap.sizeY});
		$('#mapzoomlayertop').attr({'width': heightmap.sizeX, 'height': heightmap.sizeY});

		// Make the canvas interactive, add one manip for the sphere
		var JQcanvas = $('#maplayer').icanvas();
		var manip = new VirtualTanslate(JQcanvas, $('#posX'), $('#posY'));
		manip.option('yUp', true);

		// Add Z X shortcuts to modify altitude
		JQcanvas.on('keydown', keyAccelerators);
		var JQcanvasZoom = $('#mapzoomlayertop').icanvas();
		JQcanvasZoom.on('keydown', keyAccelerators);

		// Add cross hair manip to display altitude
		var JQcanvasZoomTop = $('#mapzoomlayertop').icanvas();
		manip = new VirtualTanslate(JQcanvasZoomTop, $('#cursX'), $('#cursY'));

		manip.option('yUp', true);
		manip.option('xScale', superSampling);
		manip.option('yScale', superSampling);

		updateTop();
		update();
	}

	$('document').ready(main);
})(heightmap, spherepreset, G);
