#version 300 es
precision mediump float;

out vec4 FragColor; // in es with only one output, no need to specify location

uniform vec2 screenSize;
uniform int time; // in millisecs

const float epsilon = 0.001; // used to tell when we are 'on' a surface
const float minStepSize = 0.003;
const int maxIterations = 150;

vec3 eye = vec3(0, 0, 12.0); // camera positon

//// signed distance field object functions 

float sphere (vec3 p, float r) {
	return length(p) - r;
}

float cube (vec3 p, float s) {
  return max(max(abs(p.x) - s,
                 abs(p.y) - s),
             abs(p.z) - s);
}

float groundplane (vec3 p) {
  return p.y + 2.0; // defines xz plane 
}

//// CSG operations on distance-field objects

float oIntersect (float o1, float o2) { return max(o1, o2); }

float oSubtract (float o1, float o2) { return max(-o1, o2); }

float oUnion (float o1, float o2) { return min(o1, o2); }


const int objectCount = 3;

// sample the distancefield
float distanceField (vec3 point) {
	
	float[objectCount] objects;
	objects[0] = groundplane(point);
	objects[1] = oIntersect(oSubtract(sphere(point, 2.4), cube(point, 1.8)), sphere(point, 2.6));
	objects[2] = sphere(point - vec3(0.0), 1.1);

	float minDistance = objects[0];
	for (int i = 1; i < objectCount; i++) {
		minDistance = min(minDistance, objects[i]);
	}
	return minDistance;
	
}

float blur = 0.04; // use small values to round off shapes
vec3 normal (vec3 p) { // returns the gradient of a distance field -- central differences method. code by iq^rgba
  vec3 e = vec3(blur + epsilon, 0, 0); // set up vector with one tiny component
  vec3 n;
  // dimension-wise, swizzle our epsilon vector and sample the distance field at small positive/negative offsets
  n.x = distanceField(p + e.xyy) - distanceField(p - e.xyy);
  n.y = distanceField(p + e.yxy) - distanceField(p - e.yxy);
  n.z = distanceField(p + e.yyx) - distanceField(p - e.yyx);
  return normalize(n);
}

vec3 lightPos = vec3(9.0, 8.0, 6.0);

vec3 shade(vec3 point) {
	//return vec3(0.8, point.z * 0.14, 0.8); // pink, again

	vec3 l = lightPos - point;
	vec3 n = normal(point);
	vec3 e = eye - point;
	vec3 h = normalize(e + l);
	vec3 c = vec3(0.8, 0.4, 0.4); // pinkish
	float lightDistance = length(l);
	float diffuse = max(0.0, dot(l, n)) * 1.0/pow(lightDistance, 2.0);
	float specular = pow(max(0.0, dot(h, n)), 24.0);
	vec3 color = (diffuse * c) + specular;
	return color;
}

vec3 gammaCorrect (vec3 color) {
	// gamma correction
	float gamma = 2.2; 
    return pow(color.rgb, vec3(1.0/gamma));
}

void main() {
	vec2 uv = gl_FragCoord.xy / screenSize;
	uv = uv * 2.0 - 1.0;
	float aspectRatio = screenSize.x / screenSize.y;
	uv.y /= aspectRatio;
	
	vec3 color;

	vec3 ray = normalize(vec3(uv, -5.0)); // FoV
	float dist;
	int iterations;
	float totalDistance = 0.0;
	
	vec3 point = eye; // start at camera 
	do {
		//dist = distanceField(point);
		dist = distanceField(point);
		point += ray * max(dist, minStepSize);
		totalDistance += dist;

		if (iterations++ > maxIterations){ discard; }
	} while (dist > epsilon);

	//color = vec3(0.6, 0.6, 0.01*float(iterations));

	color = shade(point);

	FragColor.rgb = gammaCorrect(color);
}