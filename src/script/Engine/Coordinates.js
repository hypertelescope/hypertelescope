//  -*-coding: utf-8;-*-
// Directive for JShint
/*global G:true */

/*!

  @file   Coordinates.js
  @author Jérôme Maillot
  @date   Tue Dec 25 13:54:37 2012

  @brief  Coordinate changes routines
*/

/*!
  Coordinate manipulation, including presets
*/
function Coord() {
    'use strict';
}

/*!
  Coordinate converter class
*/
function CoordConvert() {
    'use strict';
}

// Run in an anonymous function, to hide variables.
// Pass G as a variable. Local look up is faster than global
(function(G) {
	'use strict';

	Coord.presets = {
		ign1:    { name: 'IGN REF1',		pos: [   0,        0,     2063.144] },
		est:     { name: 'Moteur Est',		pos: [  19.471,   27.15,  2066.71 ] },
		ouest:   { name: 'Moteur Ouest',	pos: [-256.822,   40.642, 2048.827] },
		C1:      { name: 'Centre sphere',   pos: [-133.520,  -42.064, 2246.810] },
		C8:      { name: 'C8 (Moteur Sud)', pos: [-112.539, -216.277, 2090.075] },
		AncS:    { name: 'Ancrage Sud',		pos: [-116.667, -444.384, 2239.258] },
		AncN:    { name: 'Ancrage Nord',	pos: [-101.784,  341.373, 2240    ] },
		MirN:    { name: 'Miroir Nord',		pos: [-109.255,  -21.413, 2050.365] },
		MirS:    { name: 'Miroir Sud',		pos: [-109.83,   -36.919, 2048.896] },
		theo:    { name: 'REF Theodolite',	pos: [-105.703,   20.604, 2057.474] },
		treuil:  { name: 'Treuil',			pos: [-124.614,   46.098, 2059.71 ] },
		MelezeO: { name: 'Mélèzes Ouest',	pos: [-199.918,   15.841, 2035.644] }
	};


	//! IGN1 in XYZ coordinates
	var xyz0  = [ 4540448.348, 538942.653, 4434974.354 ];

	var xyz_u = [ -0.11782706,  0.99303413, 0.00001353 ];
	var xyz_v = [ -0.69376071, -0.08232640, 0.71548476 ];
	var xyz_a = [  0.71048492,  0.08430895, 0.69864381 ];

	var uva_x = [ -0.11783860, -0.69377601,  0.710501902 ];
	var uva_y = [  0.99303276, -0.082328759, 0.084294079 ];
	var uva_z = [  1.42871E-06,  0.715469652, 0.698628343 ];

	var en0  = [ 1000511.203, 6364913.275 ];
	var en_u = [  0.99942269, 0.04772088 ];
	var en_v = [ -0.04772168, 0.99942308 ];

	var det = G.det2(en_u, en_v);
	var uv_e = [  en_v[1]/det, -en_u[1]/det ] ;
	var uv_n = [ -en_v[0]/det,  en_u[0]/det ] ;

	var ll0  = [ 6.76922841, 44.31868192 ];
	var ll_u = 3600 * 22.168;
	var ll_v = 3600 * 30.877;

	var alt0 = 2063.144;

	CoordConvert.prototype.XYZtoUVA = function(x, y, z) {
		var pnt = G.sub3([x, y, z], xyz0);
		return [ G.dot3(pnt, xyz_u),
				 G.dot3(pnt, xyz_v),
				 G.dot3(pnt, xyz_a) + alt0 ];
	};

	CoordConvert.prototype.ENAtoUVA = function(e, n, a) {
		// Allow to pass in [e, n, a]
		if (n === undefined) {
			n = e[1];
			a = e[2];
			e = e[0];
		}

		var pnt = G.sub2([e, n], en0);
		return [ G.dot2(pnt, en_u), G.dot2(pnt, en_v), a ];
	};

	CoordConvert.prototype.LLAtoUVA = function(lon, lat, a) {
		var pnt = G.sub2([lon, lat], ll0);
		return [ pnt[0] * ll_u, pnt[1] * ll_v, a ];
	};

	CoordConvert.prototype.UVAtoXYZ = function(u, v, a) {
		var uva = [u, v, a - alt0];
		var pnt = [ G.dot3(uva, uva_x), G.dot3(uva, uva_y), G.dot3(uva, uva_z) ];
		return G.add3(xyz0, pnt);
	};

	CoordConvert.prototype.UVAtoENA = function(u, v, a) {
		// Allow to pass in [u, v, a]
		if (v === undefined) {
			v = u[1];
			a = u[2];
			u = u[0];
		}

		var uv = [u, v];
		var pnt = G.add2(en0, [G.dot2(uv, uv_e), G.dot2(uv, uv_n)] );
		return [ pnt[0], pnt[1], a ];
	};

	CoordConvert.prototype.UVAtoLLA = function(u, v, a) {
		var pnt = G.add2(ll0, [ u/ll_u, v/ll_v ] );
		return [ pnt[0], pnt[1], a ];
	};

	CoordConvert.prototype.XYZtoENA = function(x, y, z) {
		return this.UVAtoENA(this.XYZtoUVA(x, y, z));
	};
	CoordConvert.prototype.XYZtoLLA = function(x, y, z) {
		return this.UVAtoLLA(this.XYZtoUVA(x, y, z));
	};
	CoordConvert.prototype.ENAtoXYZ = function(e, n, a) {
		return this.UVAtoXYZ(this.ENAtoUVA(e, n, a));
	};
	CoordConvert.prototype.ENAtoLLA = function(e, n, a) {
		return this.UVAtoLLA(this.ENAtoUVA(e, n, a));
	};

	CoordConvert.prototype.dms = function(val) {
		var d = Math.floor(val);
		var m = Math.floor((val-d)*60);
		var s = (((val-d)*60-m)*60).toFixed(5);
		return ''.concat(String(d), '° ', String(m), "' ", String(s), '"');
	};

	CoordConvert.prototype.accurate = function(uva) {
		if ((uva[2]<1500) || (uva[2]>2500)) {return false;}
		if (G.dot2(uva, uva) > 1000*1000) {return false;}
		return true;
	};
})(G);
