#version 300 es

//// soft silver spirals shader
//// ported from shadertoy


precision mediump float;

out vec4 FragColor; // in es with only one output, no need to specify location

uniform vec2 screenSize;
uniform int time; // in millisecs


//// copied over from shadertoy
const float pi = 3.141592653589793;

float spiralpiece (vec2 uv, float rotate) { 
    
    // take polar coords 
    vec2 polar = vec2(length(uv - vec2(0.0)),
                      atan(uv.y, uv.x) + rotate*pi);
    
    // log spiral is e^(2*pi*theta), thanks wikipedia
    // this makes a spiral boundrary, abs and subtract from 1 for spiral line pieces
    // with MAGIC constants for nicer 'colors'. ok nicer greyscale, whatever. 
    return 1.0 - clamp(abs(mod(polar.y, pi*2.0) - (3.0 * log(polar.x))), 0.0, 1.1);
}

// stack spiralpieces line segments 4 times over.
// TODO: spirals not perfect, can see boundraries between pieces
// MAGIC: why 8.1? because it looks better than 8.0 >_< 
// probably 'should be' some multiple of pi or something else stupid like that
vec4 spiral (vec2 uv, float rotate, vec3 color) {
	return clamp(vec4(spiralpiece(uv*1.000, rotate) 
                    + spiralpiece(uv*8.12, rotate) 
                    + spiralpiece(uv*66.0, rotate)
                    + spiralpiece(uv*536.0, rotate)),
                 0.0, 1.0) * vec4(color, 0.0);
}

// rings... distance to center, take mod to repeat, subtract and abs to make symmetrical. 
// then pow for less blur / thinner pieces, and weirder silvery overlaps. 
float ring (vec2 p, float offset) {
    // MAGIC WITH EXTRA MAGIC ON TOP HOLY SHIT
    // color   v1    |    ringsize (*will* break it)    v2, 1/2*v1 v3 | color v4
    return pow(2.42*abs(mod(offset-length(vec2(0.0)-p), 0.75) -0.375) + 0.1, 5.2);
}



void main() {
	vec2 uv = (gl_FragCoord.xy / screenSize) - vec2(0.5); // resolution independant with origin in center
	float aspect = screenSize.x / screenSize.y; // aspect ratio
	uv.y /= aspect; // aspect ratio correction -- same scale for x and y axis
    
	float ftime = float(time) / 1000.0; // floating point time in seconds -- for shadertoy compat

	//// ----- copied over from shadertoy

	// camera
	uv = uv * vec2(3.0 + 0.5* /*distance*/sin(ftime*0.5/*time*/));
    // rotation animation
	float rotate = /*-*/ftime; // uncomment for inwards spiral...
    // ring animation
    float ringoffset = ftime * 0.375;
    
    /// more objects
    // soft silvery ring-emphasis, center of screen. does this one actually do anything?
    vec4 ring1 = clamp(vec4(1.0 - abs(1.4*length(uv - vec2(0.0)) -1.0)), -1.0, 1.0);
    // same again, edge of screen
    vec4 ring2 = clamp(vec4(1.0 - abs(0.5*pow(length(uv - vec2(0.0)), 2.0) -1.0)), -1.0, 1.0);
    // central spot
    vec4 spot = smoothstep(0.3, 0.6,clamp(vec4(1.0 - 110.0*length(uv - vec2(0.0))), 0.0, 1.0));
    
    // combine parts by adding... goes weird-in-a-good-way when they overlap 
    // yeah, this is why I clamp my spirals :P
    // TODO: should probably be a loop of some kind I guess
    vec4 sumc = vec4(spiral(uv, rotate*1.00, vec3(0.22))
                   + spiral(uv, rotate*0.95, vec3(0.22))
                   + spiral(uv, rotate*0.90, vec3(0.22))
                   + spiral(uv, rotate*0.85, vec3(0.22))
                   + spiral(uv, rotate*0.80, vec3(0.22))
                   + spiral(uv, rotate*0.75, vec3(0.22))
                   + spiral(uv, rotate*0.70, vec3(0.22))
                   + spiral(uv, rotate*0.65, vec3(0.22))
                   + 0.132* ring(uv, 0.05*ringoffset)
                   + 0.132* ring(uv, 0.10*ringoffset)
                   + 0.132* ring(uv, 0.15*ringoffset)
                   + 0.132* ring(uv, 0.20*ringoffset)
                   + 0.132* ring(uv, 0.25*ringoffset)
                   + 0.132* ring(uv, 0.30*ringoffset)
                   + 0.132* ring(uv, 0.35*ringoffset)
                   + 0.132* ring(uv, 0.40*ringoffset)
                   + ring1 * 0.08 // might be too dim to have much of an effect :/
                   + ring2 * 0.15
                   // MAGIC. FUCKING MAGIC.
                   + 0.32 * smoothstep(0.05, 0.6, abs(1.0 - length(uv - vec2(0.0)+0.1 *1.0)))
                   + spot * 0.6
                   );
    
    // 'tone mapping' lol
    vec4 color = pow(sumc, vec4(1.2)) - vec4(0.1);

	//// ---- end copied code


	// gamma correction
	float gamma = 2.2; 
    FragColor.rgb = pow(color.rgb, vec3(1.0/gamma));
}
