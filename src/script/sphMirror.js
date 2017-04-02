//  -*-coding: utf-8;-*-
// Directive for JShint
/*global D:true G:true
  GeomContainer:true
  Parabola:true
  Arc:true
  $:false
 */
/*!
  @file   sphMirror.js
  @author Jérôme Maillot
  @date   Sun Dec 23 18:00:08 2012

  @brief   Main file for spherical mirror.
*/

(function(G, D) {
	'use strict';

	// Actual radius in meters
	var C1rad = 202;

	/*! Redraw the canvas..

	  @param canvas Canvas to draw into
	  @param data Current values
	*/
	function refresh(canvas, data) {
		// Config values
		var border=0.025;
		var ctx = canvas.getContext('2d');

		// save state
		ctx.save();
		// Clear with the background color, not transparent black, so that
		// recorded images have the right background color.
		var backColor = $('body').css('background-color');
		ctx.fillStyle = backColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Convert to Radian
		var dirAngle = Math.PI/180 * data.starDir;
		var radius = 0.9*Math.min((1-2*border) * canvas.height,
								  (1-2*border) * canvas.width / 2);

		// Center coordinates system to sphere center
		ctx.save();
		var translX = (1.0 - border) * canvas.height - radius;
		ctx.translate(canvas.width / 2, translX);
		drawTelescope(ctx, radius, 1, 2, 25-translX, data);
		// restore state
		ctx.restore();

		var blurRatio=0;
		var w, h;
		if (data.zoom>1) {
			// Center coordinates system to focal point
			ctx.save();
			ctx.translate(-5, 5);

			// Draw a close up in the top left corner
			w = canvas.width/3;
			h = canvas.height/3;
			ctx.fillStyle = backColor;
			ctx.fillRect(2*w, 0, w, h);
			ctx.strokeStyle = '#506070';
			ctx.fillStyle = '#C0D0E0';
			ctx.beginPath();
			ctx.rect(2*w, 0, w, h);
			ctx.stroke();
			ctx.clip();

			ctx.font = '18px Arial';
			ctx.fillText('Zoom: '+(Math.round(data.zoom*10)/10)+'x', 2*w+5, 20);

			radius *= data.zoom;

			ctx.translate(2*w + canvas.width  / 6 + radius/2*Math.sin(dirAngle),
						  canvas.height / 6 - radius/2*Math.cos(dirAngle));
			blurRatio = drawTelescope(ctx, radius, data.zoom, 0.5, -999, data);
			// restore state

			ctx.restore();
		}

		// Draw the legend
		if (data.legend) {
			w = 250;
			h = 85;
			ctx.save();
			ctx.translate(5, 5);
			ctx.fillStyle = backColor;
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = '#C0D0E0';
			ctx.strokeStyle = '#506070';
			ctx.beginPath();
			ctx.rect(0, 0, w, h);
			ctx.stroke();
			ctx.clip();
			ctx.font = '24px Arial';
			ctx.fillText('C1 Radius: '+C1rad+'m', 5, 25);
			var apert=Math.round(data.aperture);
			ctx.fillText('Ground radius: '+apert+'m', 5, 50);

			if (blurRatio>0) {
				var blur = C1rad * blurRatio;
				if (blur>0.2) {
					if (blur>5) {
						blur = Math.round(blur);
					} else {
						blur = Math.round(100*blur)/100;
					}
					ctx.fillText('Image size: '+blur+'m', 5, 75);
				} else {
					blur *= 1000;
					if (blur>5) {
						blur = Math.round(blur);
					} else if (blur>0.02) {
						blur = Math.round(100*blur)/100;
					} else {
						blur = Math.round(10000*blur)/10000;
					}
					ctx.fillText('Image size: '+blur+'mm', 5, 75);
				}
			}

			ctx.restore();
		}

		// If record is on, save the frame at theend of the refresh
		if (window.recordingFrameNumber) {
			$('#schema').icanvas('saveFrame', 'sphMirror',
								 window.recordingFrameNumber);
		}
	}

	/*! Main draw routine

	  @param ctx
	  @param radius
	  @param rayLineWidth
	  @param starDist
	  @param data
	*/
	function drawTelescope(ctx,
						   radius, zoomFactor,
						   rayLineWidth, starDist,
						   data) {
		// Config values
		var teleColor    = '#0080FF';
		var mirorColor   = '#40C0FF';
		var focalColor   = '#40FFC0';
		var lostRayColor = '#202020';
		var inRayColor   = 'grey';
		var rayColor     = 'white';
		var starColor    = '#FFFF20';
		var ratio = radius / C1rad;
		// Aperture in pixel size.
		var aperture = ratio*data.aperture;

		// Convert to Radian
		var dirAngle = Math.PI/180 * data.starDir;
		var sinStar  = Math.sin(dirAngle);
		var cosStar  = Math.cos(dirAngle);

		// Build the telescope geometry
		var spans = [];
		var i;
		var angle    = Math.asin(data.aperture/C1rad);

		//var teleGeom = new Arc([0,0], radius, spans);
		var teleGeom = new GeomContainer();
		if (data.parabolic) {
			var deltaX = 2 * ratio * data.aperture / data.numMirror;
			var X0 = -deltaX * (data.numMirror-1)/2;
			for (i=0 ; i<data.numMirror ; i++) {
				spans.push(X0 + i*deltaX - deltaX/2*data.mirrorDensity);
				spans.push(X0 + i*deltaX + deltaX/2*data.mirrorDensity);
			}
			teleGeom.addChild(new Parabola([0, radius], radius/2, Math.PI, spans));
		} else {
			var deltaAngle = 2*angle / data.numMirror;
			var angle0 = Math.PI/2-angle + deltaAngle/2;
			for (i=0 ; i<data.numMirror ; i++) {
				spans.push(angle0 + i*deltaAngle - deltaAngle/2*data.mirrorDensity);
				spans.push(angle0 + i*deltaAngle + deltaAngle/2*data.mirrorDensity);
			}
			teleGeom.addChild(new Arc([0, 0], radius, spans));
		}

		// Compute all rays
		var paths = [];
		var path;
		for (i= -data.nbRays ; i<=data.nbRays ; i++) {
			var x = aperture*i*data.raySpan/data.nbRays;
			var y = -2*radius;
			var orig = [x*cosStar-y*sinStar, radius+x*sinStar+y*cosStar];
			var dir  = [-sinStar, cosStar];

			path = [orig];
			// Do at most 10 reflections
			for (var j=0 ; j<10 ; j++) {
				var res = teleGeom.intersect(orig, dir);
				if (res.length === 0) {break;}
				orig = res[0];
				path.push(orig);
				dir = G.refl(dir, res[1]);
			}
			// Extend by .75 radius after the last bounce. If no bounce,
			// make the ray long enough to hit the ground.
			if (path.length === 1) {
				path.push(G.add2(orig, G.mul2(3*radius, dir)));
			} else {
				path.push(G.add2(orig, G.mul2(0.75*radius, dir)));
			}
			paths.push(path);
		}

		ctx.lineWidth = rayLineWidth;

		if (zoomFactor === 1) {
			// Draw lost rays (no bounce) in dark grey
			ctx.strokeStyle = lostRayColor;
			ctx.beginPath();
			for (i=0 ; i<paths.length ; i++) {
				path = paths[i];
				if (path.length===2) {
					D.segment(ctx, path[0], path[1]);
				}
			}
			ctx.stroke();

			// Draw incoming and bouncing rays, lighter grey
			ctx.strokeStyle = inRayColor;
			ctx.beginPath();
			for (i=0 ; i<paths.length ; i++) {
				path = paths[i];
				if (path.length>2) {
					D.segment(ctx, path[0], path[1]);
				}
			}
			ctx.stroke();
		}

		// Draw reflected rays, white
		// Size of the blur area.
		var minBlur=0, maxBlur=0;
		ctx.strokeStyle = rayColor;
		ctx.beginPath();
		for (i=0 ; i<paths.length ; i++) {
			path = paths[i];
			if (path.length>2) {
				D.polyline(ctx, path, 1);
				D.arrowHead(ctx, path[path.length-2], path[path.length-1], 10);

				// FIXME: Intersection with y=r/2 plane
				/*l = (radius/2-y)/dy;
				  x += l * dx;
				  if (x<minBlur) minBlur = x;
				  if (x>maxBlur) maxBlur = x;
				*/
			}
		}
		ctx.stroke();

		// Draw wavefront
		ctx.fillStyle = '#FFFF20';
		for (i=0 ; i<paths.length ; i++) {
			path = paths[i];
			var wf = G.march(radius*data.length, path);
			D.circle(ctx, wf[0], wf[1], 3);
		}

		// Draw the star
		ctx.fillStyle = starColor;
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 1;
		D.star(ctx, (radius-starDist)*sinStar/cosStar, starDist, 15);

		// Draw focal circle and tele center
		ctx.strokeStyle = teleColor;
		ctx.fillStyle   = teleColor;
		D.circle(ctx, 0, 0, 10);
		if (zoomFactor === 1) {

			// Work around a precision bug. Large radius + large offset
			// are rounded slightly off... Works fine for starDir = +/- 25
			// degres, but radius is about 1/0.997 too large for starDir =
			// 0 degres. Even a slight linear interpolation does not
			// work well, the focal plane seems to move around when
			// changing the star direction.
			D.arc(ctx, 0, 0, radius/2, Math.PI/2-angle*3);
		}

		// Draw the mirrors
		ctx.strokeStyle = mirorColor;
		ctx.fillStyle   = mirorColor;
		ctx.lineWidth = 5;
		ctx.fillStyle = '#FFFF20';
		teleGeom.draw(ctx);

		// Draw focal point
		ctx.strokeStyle = focalColor;
		ctx.fillStyle   = focalColor;
		if (data.drawFocal) {
			D.circle(ctx, -sinStar * radius/2, cosStar * radius/2, 5);
		}

		// Mirror center2
		return (maxBlur - minBlur)/radius;
	}

	/*! Collect all UI values into a JS object.
	  @return A new object with UI values stored in attributes.
	*/
	function getData() {
		// Collect numerical data for all UI elements
		var data = $('div.slider,input[type=checkbox],input[type=radio]').getUIData();
		data.raySpan = 0.99;
		return data;
	}

	/*! Refresh the canvas
	 */
	function update() {
		var canvas = $('#schema')[0];
		var data = getData();
		refresh(canvas, data);
	}

	/*! Update the canvas resolution after menu change
	 */
	function updateRes() {
		var res = { 'HD':     [1280, 720],
					'FullHD': [1920, 1080],
					'*':      [768, 576]};
		var val = res[$('#res').val()];
		if (val === undefined) { val = res['*']; }
		$('#schema').attr({width:val[0], height:val[1]});
		update();
	}

	function main() {
		// make the canvas interactive to allow record.
		$('#schema').icanvas();

		$.finalizeUI();

		// Refresh the main view when check box change
		$('input').on('change', update);

		// Refresh the main view when sliders change
		$('div.slider').on('slidechange', update);
		$('div.slider').on('change', update);

		$('#res').change(updateRes);

		// Init values
		$('#zoom').val(20);
		$('#dispFocal').attr('checked', true);
		$('#res').val('PAL');

		updateRes();
	}

	$('document').ready(main);
})(G, D);
