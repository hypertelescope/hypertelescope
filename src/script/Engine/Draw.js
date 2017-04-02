//  -*-coding: utf-8;-*-
// Directive for JShint
/*global G:true */
/*!
@file   Draw.js
@author Jérôme Maillot
@date   Sun Dec 30 19:34:50 2012

@brief  Draw helper routines
*/

/*!
  Draw namespace @c D: defines 2D draw helper routines.
 */
var D = (function(G) {
	'use strict';
	return {

		/*! Draw a line segment. Do not call beginPath/stroke to allow
		  path grouping.

		  @param[in] ctx 2D context to draw into.
		  @param[in] pt1 2D point
		  @param[in] pt2 2D point
		*/
		segment: function(ctx, pt1, pt2) {
			ctx.moveTo(pt1[0], pt1[1]);
			ctx.lineTo(pt2[0], pt2[1]);
		},

		/*! Draw an arrow head at the end of the segment. Do not call
		  beginPath/stroke to allow path grouping.

		  @param[in] ctx 2D context to draw into.
		  @param[in] pt1 2D point
		  @param[in] pt2 2D point
		  @param[in] size Size of the arrow, projected along segment axis
		*/
		arrowHead: function(ctx, pt1, pt2, size) {
			var dir = G.mul2(size, G.normalized(G.sub2(pt1, pt2)));
			ctx.moveTo(pt2[0]+dir[0]-dir[1]/2, pt2[1]+dir[1]+dir[0]/2);
			ctx.lineTo(pt2[0], pt2[1]);
			ctx.lineTo(pt2[0]+dir[0]+dir[1]/2, pt2[1]+dir[1]-dir[0]/2);
		},

		/*! Draw a line segment. Do not call beginPath/stroke to allow
		  path grouping.

		  @param[in] ctx 2D context to draw into.
		  @param[in] pts Array of 2D point
		  @param[in] startAt Index of the first point in the array.
		*/
		polyline: function(ctx, pts, startAt) {
			ctx.moveTo(pts[startAt][0], pts[startAt][1]);
			for (var j=startAt+1 ; j<pts.length ; j++) {
				ctx.lineTo(pts[j][0], pts[j][1]);
			}
		},

		/*! Draw a filled circle
		  @param[in] ctx 2D context to draw into.
		  @param[in] x Center.
		  @param[in] y Center.
		  @param[in] r Radius.
		*/
		circle: function(ctx, x, y, r) {
			ctx.beginPath();
			ctx.arc(x, y, r, 0, 2*Math.PI, false);
			ctx.fill();
		},

		/*! Draw an arc, symmetrical vertically.
		  @param[in] ctx 2D context to draw into.
		  @param[in] x Center.
		  @param[in] y Center.
		  @param[in] r Radius.
		  @param[in] a Half angle.
		*/
		arc: function(ctx, x, y, r, a) {
			ctx.beginPath();
			ctx.arc(x, y, r, a, Math.PI-a, false);
			ctx.stroke();
		},

		/*! Draw a filled star, 5 branches.
		  @param[in] ctx 2D context to draw into.
		  @param[in] x Center.
		  @param[in] y Center.
		  @param[in] r Radius.
		*/
		star: function(ctx, x, y, r) {
			var i, angle, nbBranch=5;
			var delta=Math.PI/nbBranch;

			ctx.beginPath();
			ctx.moveTo(x, y-r);
			for (i=1 ; i<=nbBranch ; i++) {
				angle = (2*i-1) * delta;
				ctx.lineTo(x+r*0.4*Math.sin(angle), y-r*0.4*Math.cos(angle));
				angle = 2*i * delta;
				ctx.lineTo(x+r*Math.sin(angle), y-r*Math.cos(angle));
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		},

		target: function(ctx, x, y, size, ratio) {
			if (ratio === undefined) {
				ratio = 0.5;
			}

			ctx.beginPath();
			ctx.arc(x, y, size, 0, 2*Math.PI, true);

			ctx.moveTo(x-size, y);
			ctx.lineTo(x-size*ratio, y);
			ctx.moveTo(x+size, y);
			ctx.lineTo(x+size*ratio, y);
			ctx.moveTo(x, y-size);
			ctx.lineTo(x, y-size*ratio);
			ctx.moveTo(x, y+size);
			ctx.lineTo(x, y+size*ratio);

			ctx.stroke();
		},

		cross: function(ctx, xy, sizex, sizey) {
			ctx.beginPath();
			ctx.moveTo(xy[0], 0);
			ctx.lineTo(xy[0], sizey);
			ctx.moveTo(0,     xy[1]);
			ctx.lineTo(sizex, xy[1]);
			ctx.stroke();
		},

		doubleCross: function(ctx, xy, sizex, sizey, delta) {
			if (delta === undefined) {
				delta = 2;
			}
			D.cross(ctx, [xy[0]-delta, xy[1]-delta], sizex, sizey);
			D.cross(ctx, [xy[0]+delta, xy[1]+delta], sizex, sizey);
		}
	};
})(G);
