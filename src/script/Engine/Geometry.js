//  -*-coding: utf-8;-*-

/*!
  @file   Geometry.js
  @author Jérôme Maillot
  @date   Tue Dec 25 13:55:19 2012

  @brief  Geometry and Linear algebra routines
*/


/*!
  Geometry namespace @c G: defines routines for 2D/3D geometry.
 */
var G = (function(){
	'use strict';
	return {
		//! @name 2D Linear algebra
		//! @{

		eq2: function(a, b) { return ((a[0] === b[0]) &&
									  (a[1] === b[1])); },

		//! 2D vector add: a+b
		add2: function(a, b)  { return [ a[0]+b[0], a[1]+b[1] ]; },

		//! 2D vector substract: a-b
		sub2: function(a, b)  { return [ a[0]-b[0], a[1]-b[1] ]; },

		//! 2D vector dot product: a.b
		dot2: function(a, b)  { return a[0]*b[0] + a[1]*b[1]; },

		//! 2D determinant of matrix [a,b]
		det2: function(a, b)  { return a[0]*b[1] - a[1]*b[0]; },

		/*! 2D vector scalar multiply: l * v
		  @param l scalar
		  @param v 2D vector
		*/
		mul2: function(l, v)  { return [ l*v[0], l*v[1] ]; },

		//! Squared norm of 2D vector ||a||^2
		sqNorm2: function(a)  { return G.dot2(a, a); },

		//! Norm of 2D vector ||a||
		norm2: function(a)    { return Math.sqrt(G.sqNorm2(a)); },

		//! Normalized of 2D vector a/||a||
		normalized: function(a)    { return G.mul2(1/G.norm2(a), a); },

		//! Distance between 2D points
		dist2: function(a, b) { return G.norm2(G.sub2(a, b)); },

		//! Squared distance between 2D points
		sqDist2: function(a, b) { return G.sqNorm2(G.sub2(a, b)); },

		//! Rotate a vector by and angle of given sin and cos
		rot2: function(v, c, s) { return [v[0]*c - v[1]*s,
										  v[1]*c + v[0]*s]; },

		/*! Linear interpolation between a and b, with coefficient l

		  @li lerp2(a, b, 0) -> a
		  @li lerp2(a, b, 1) -> b
		*/
		lerp2: function(a, b, l) { return G.add2(G.mul2(1-l, a), G.mul2(l, b)); },

		//! Project point p on segment s. s = [s[0], s[1]]
		proj2: function(p, s) {
			var vec = G.sub2(s[1], s[0]);
			var vp  = G.sub2(p, s[0]);
			var coef = G.dot2(vp, vec) / G.sqNorm2(vec);

			var vpp = G.mul2(coef, vec);
			var res = G.add2(s[0], vpp);

			return res;
		},

		//! @}

		//! @name 3D Linear algebra
		//! @{
		eq3: function(a, b) { return ((a[0] === b[0]) &&
									  (a[1] === b[1]) &&
									  (a[2] === b[2])); },

		//! 3D vector add: a+b
		add3: function(a, b) { return [ a[0]+b[0], a[1]+b[1], a[2]+b[2] ]; },
		//! 3D vector substract: a-b
		sub3: function(a, b) { return [ a[0]-b[0], a[1]-b[1], a[2]-b[2] ]; },
		//! 3D vector dot product: a.b
		dot3: function(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; },
		//! @}

		//! Squared norm of 3D vector ||a||^2
		sqNorm3: function(a)  { return G.dot3(a, a); },

		//! Norm of 3D vector ||a||
		norm3: function(a)    { return Math.sqrt(G.sqNorm3(a)); },

		//! Distance between 3D points
		dist3: function(a, b) { return G.norm3(G.sub3(a, b)); },

		//! Squared distance between 3D points
		sqDist3: function(a, b) { return G.sqNorm2(G.sub3(a, b)); },

		/*!
		  Computes the reflection of a vector in 2D. Vectors are arrays of 2 float.

		  @param[in] incident Incident ray direction. Pointing towards the surface
		  @param[in] normal Normal vector at the intersection

		  @return reflected vector
		*/
		refl: function(incident, normal) {
			var percent = G.dot2(incident, normal) / G.dot2(normal, normal);
			return G.sub2(incident, G.mul2(2*percent, normal));
		},

		/*! March @c distance along the given path, starting from the first
		  point. If @c distance is larger than the path length, the last
		  segment is extrapolated towards infinity.

		  @param[in] distance to march along the path
		  @param[in] path array of 2D points

		  @return The point at the proper distance along the path
		*/
		march: function(distance, path) {
			var len, dir, i;
			for (i=1 ; i<path.length ; i++) {
				len = G.dist2(path[i-1], path[i]);
				if (len>=distance) {
					return G.lerp2(path[i-1], path[i], distance/len);
				}
				distance -= len;
			}

			// We did not yet reach the distance, extrapolate beyond last point
			i = path.length-1;
			dir = G.sub2(path[i], path[i-1]);
			len = G.norm2(dir);
			return G.add2(path[i], G.mul2(distance/len, dir));
		},

		/*! Tessalate an array of point ad return the corresponding cspline

		  @param[in] points array of 2D points
		  @param[in] tension in [0,1], use 0.5 as a default
		  @param[in] nbOfSegments >1 Use 8 as a default

		  @return a new array of 2D points
		*/
		cspline: function(points, tension, nbOfSegments) {

			var res = [];			// Result

			// Clone array to avoid changing the original
			var _pts = points.slice(0);

			// The algorithm require a previous and next point to the
			// actual point array.
			// Duplicate first points to beginning, end points to end

			_pts.unshift(points[0]); //copy 1st point and insert at beginning
			_pts.push(points[points.length - 1]); //copy last point and append

			// 1. loop goes through point array
			// 2. loop goes through each segment between the 2 pts + 1e
			// point before and after
			for (var i=1; i < (_pts.length - 2); i++) {

				// Calc tension vectors
				var t1 = G.mul2(tension, G.sub2(_pts[i+1], _pts[i-1]));
				var t2 = G.mul2(tension, G.sub2(_pts[i+2], _pts[i  ]));

				for (var t=0; t < nbOfSegments; t++) {
					// Compute step, and the powers
					var st = t / nbOfSegments;
					var st2 = st*st;
					var st3 = st2*st;

					// Compute cardinals
					var c1 =   2 * st3 - 3 * st2 + 1;
					var c2 =  -2 * st3 + 3 * st2;
					var c3 =       st3 - 2 * st2 + st;
					var c4 =       st3 -     st2;

					// Compute interpolated point from control vectors
					var x = c1*_pts[i][0] + c2*_pts[i+1][0] + c3*t1[0] + c4*t2[0];
					var y = c1*_pts[i][1] + c2*_pts[i+1][1] + c3*t1[1] + c4*t2[1];

					// Store points in array
					res.push([x, y]);
				}
			}

			return res;
		}
	};
})();

// Define geometry shapes.
// Each shape should implement draw and intersect routines
//


/*! GeomContainer Geometry
*/
//@STARTCLASS GeomContainer

/*! Container to combine mutiple geometries together
*/
function GeomContainer() {
	'use strict';
	this.children = [];
}

(function() {
	'use strict';
	/*! Add a new child at the end of the container.

	  @param child The child geometry.
	  @return
	*/
	GeomContainer.prototype.addChild = function(child) {
		this.children.push(child);
	};


	/*! Draw all elements in the container with current stroke parameters.
	  @param ctx 2D context to draw into.
	*/
	GeomContainer.prototype.draw = function(ctx) {
		for(var i=0 ; i<this.children.length ; i++) {
			this.children[i].draw(ctx);
		}
	};

	/*! Intersect all elements in the container with the ray. Return the
	 *  closest intersection location and normal. The normal is not
	 *  necessarily normalized.

	 @param origin Ray origin.
	 @param dir Ray direction.
	 @return A 2D point pair [point, normal] if there is a valid
	 intersection, [] otherwise.
	*/

	GeomContainer.prototype.intersect = function(origin, dir) {
		var result = [];
		var sqDist = 1e30;
		for(var i=0 ; i<this.children.length ; i++) {
			var current = this.children[i].intersect(origin, dir);
			if (current.length === 2) {
				var sqDistCurr = G.sqDist2(origin, current[0]);
				if (sqDistCurr < sqDist) {
					sqDist = sqDistCurr;
					result = current;
				}
			}
		}
		return result;
	};
})();

/*! Arc Geometry
*/
//@STARTCLASS Arc

/*! Arc constructor. A "dotted" arc can be defined by a longer span
  vector: [Start1, End1, Start2, End2, ...]

  @param center Circle center
  @param radius Circle radius
  @param span   [Start, End] angles (radians)
*/
function Arc(center, radius, span) {
	'use strict';
    this.center = center;
    this.radius = radius;
    this.span   = span;

    // Precompute radius vectors to define the valid sectors for
    // intersections.
    this.vectors = [];
    for (var i=0 ; i<this.span.length ; i ++ ) {
        this.vectors[i] = [Math.cos(this.span[i]), Math.sin(this.span[i])];
    }
}

(function() {
	'use strict';
	/*! Draw the arc with current stroke parameters.
	  @param ctx 2D context to draw into.
	*/
	Arc.prototype.draw = function(ctx) {
		for (var i=0 ; i<this.span.length ; i += 2 ) {
			ctx.beginPath();
			ctx.arc(this.center[0], this.center[1],
					this.radius, this.span[i], this.span[i+1], false);
			ctx.stroke();
		}
	};

	/*! Intersect the Arc with a ray. Return the location and normal at
	  intersection. The normal is not necessarily normalized

	  @param origin Ray origin.
	  @param dir Ray direction.
	  @return A 2D point pair [point, normal] if there is a valid
	  intersection, [] otherwise.
	*/

	Arc.prototype.intersect = function(origin, dir) {
		var toCenter = G.sub2(origin, this.center);

		// Quadratic equation: a T^2 + 2 b T + c
		var a = G.sqNorm2(dir) ;
		var b = G.dot2(toCenter, dir) ;
		var c = G.sqNorm2(toCenter) - this.radius*this.radius ;
		var discr =  b*b-a*c;

		if (discr>=0) {
			// The solution is the smallest positive t
			discr = Math.sqrt(discr);
			var t1 = (-b - discr)/a;
			var t2 = (-b + discr)/a; // t1 < t2, because a>0
			var candidates = [t1, t2];

			// Take first positive intersection inside the angle span.
			for (var j=0 ; j<candidates.length ; j++) {
				var t = candidates[j];
				if (t>0.0001) {
					var point = G.add2(origin, G.mul2(t, dir));
					var norm  = G.sub2(point, this.center);

					for (var i=0 ; i<this.span.length ; i += 2 ) {
						/*! @FIXME Only works for spans less than 180
						  degrees. For larger spans, we'd need a 'or'
						  instead of 'and'.
						*/
						if ((G.det2(this.vectors[i],   norm) >= 0) &&
							(G.det2(this.vectors[i+1], norm) <= 0)) {
							return [point, norm];
						}
					}
				}
			}
		}

		return [];
	};
})();

/*! Parabola Geometry
*/
//@STARTCLASS Parabola

/*! Parabola constructor. A "dotted" parabola can be defined by a longer span
  vector: [Start1, End1, Start2, End2, ...]

  If angle and origin are 0 and [0,0], the equation is then:
  Y = 1/(4 focalDist) X^2

  @param origin    Position of the minimal point (2D)
  @param focalDist Distance to the focal point
  @param angle     Rotation around minimal point (Counter-clockwise in radians)
  @param span      [Start, End] X values
*/
function Parabola(origin, focalDist, angle, span) {
	'use strict';
    this.origin    = origin;
    this.focalDist = focalDist;
    this.angle     = angle;
    this.span      = span;

	// Number of segments to draw for the entire span.
	var precision = 200;

    // Compute the draw precision
    this._delta = (span[span.length-1] - span[0])/precision;
    this._cos = Math.cos(angle);
    this._sin = Math.sin(angle);

}


(function() {
	'use strict';
	/*! Draw the Parabola with current stroke parameters.
	  @param ctx 2D context to draw into.
	*/
	Parabola.prototype.draw = function(ctx) {
		ctx.save();
		ctx.translate(this.origin[0], this.origin[1]);
		ctx.rotate(this.angle);
		ctx.beginPath();
		// Draw each span, with a precision of this._delta
		for (var i=0 ; i<this.span.length ; i += 2 ) {
			var x0 = this.span[i];
			var x1 = this.span[i+1];

			ctx.moveTo(x0, x0*x0/(4*this.focalDist));
			x0 += this._delta;
			while (x0<x1) {
				ctx.lineTo(x0, x0*x0/(4*this.focalDist));
				x0 += this._delta;
			}
			ctx.lineTo(x1, x1*x1/(4*this.focalDist));
		}
		ctx.stroke();
		ctx.restore();
	};

	/*! Intersect the Parabola with a ray. Return the location and normal at
	  intersection. The normal is not necessarily normalized

	  @param origin Ray origin.
	  @param dir Ray direction.
	  @return A 2D point pair [point, normal] if there is a valid
	  intersection, [] otherwise.
	*/

	Parabola.prototype.intersect = function(origin, dir) {
		// First transform the ray into the normalized parabola reference frame:
		// Y = 1/(4 focalDist) X^2 <==> X^2 - (4 focalDist) Y = 0
		var locOrig = G.sub2(origin, this.origin);
		locOrig = G.rot2(locOrig, this._cos, this._sin);
		var locDir = G.normalized(G.rot2(dir, this._cos, this._sin));
		var candidates = [];

		// Solve for locOrig + l locDir
		if (Math.abs(locDir[0]) < 1e-8) {
			// Degenerate case, vertical ray, the equation is trivial
			var x0 = locOrig[0];
			candidates = [(x0*x0/(4*this.focalDist)-locOrig[1]) / locDir[1]];
		} else {
			// General case, 2nd degree a l^2 + 2 b l + c
			var a = locDir[0] * locDir[0];
			var b = locDir[0] * locOrig[0] - 2 * this.focalDist * locDir[1];
			var c = locOrig[0]*locOrig[0] - 4 * this.focalDist * locOrig[1];
			var discr =  b*b-a*c;
			if (discr>=0) {
				// The solution is the smallest positive t
				discr = Math.sqrt(discr);
				var t1 = (-b - discr)/a;
				var t2 = (-b + discr)/a; // t1 < t2, because a>0
				candidates = [t1, t2];
			}
		}

		// Take first positive intersection inside the angle span.
		for (var j=0 ; j<candidates.length ; j++) {
			var t = candidates[j];
			if (t>0.0001) {
				var point = G.add2(locOrig, G.mul2(t, locDir));
				for (var i=0 ; i<this.span.length ; i += 2 ) {
					if ((point[0] >= this.span[i]) &&
						(point[0] <= this.span[i+1])) {

						// If there is a valid intersection, compute the normal
						var norm = [- point[0] / (2 * this.focalDist), 1];

						// Translate back the intersection, rotate the normal
						var result = [G.add2( G.rot2(point, this._cos, -this._sin),
											  this.origin),
									  G.rot2(norm, this._cos, -this._sin)];

						return result;
					}
				}
			}
		}

		return [];
	};

})();
