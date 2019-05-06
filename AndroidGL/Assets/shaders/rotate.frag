#version 300 es
precision mediump float;

out vec4 FragColor; // in es with only one output, no need to specify location

uniform vec2 screenSize;
uniform int time; // in millisecs

const float epsilon = 0.001; // used to tell when we are 'on' a surface
const float minStepSize = 0.003;
const int maxIterations = 150;

vec3 eye = vec3(0, 0, 12.0); // camera positon

const float pi = 3.14159265359;

//// utility

mat3x3 rotY (float angle) {
	float cosY = cos(angle);
	float sinY = sin(angle);
	return mat3x3(cosY, 0, sinY, 0, 1, 0, -sinY, 0, cosY);
}

// for rotation and translation only. scales need the space normalized after, no idea for shears
vec3 Transform (vec3 p, mat3x3 t) {
	return inverse(t) * p; 
}

float deg2rad (in float d) {
	return d * (pi / 180.0); 
}

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

const int objectCount = 2;

// sample the distancefield
vec2 distanceField (vec3 point) {
	
	float[objectCount] objects;
	objects[0] = groundplane(point);
	objects[1] = cube(Transform(point, rotY(deg2rad(30.0 * (float(time) * 0.001)))), 1.4); // 30 degrees per s					  

	float dist = objects[0];
	int selectedObject = 0; // init with groundplane
	for (int i = 1; i < objectCount; i++) {
		if (objects[i] < dist) {
			dist = objects[i];
			selectedObject = i;
		}
	}
	return vec2(dist, selectedObject);
	
}

float blur = 0.04; // use small values to round off shapes
vec3 normal (vec3 p) { // returns the gradient of a distance field -- central differences method. code by iq^rgba
  vec3 e = vec3(blur + epsilon, 0, 0); // set up vector with one tiny component
  vec3 n;
  // dimension-wise, swizzle our epsilon vector and sample the distance field at small positive/negative offsets
  n.x = distanceField(p + e.xyy).s - distanceField(p - e.xyy).s;
  n.y = distanceField(p + e.yxy).s - distanceField(p - e.yxy).s;
  n.z = distanceField(p + e.yyx).s - distanceField(p - e.yyx).s;
  return normalize(n);
}

vec3 lightPos = vec3(9.0, 8.0, 6.0);

vec3 shade(vec3 point, int objectIndex) {

	// is there a better place for these? define an object struct, maybe?
	vec3[objectCount] colors;
	colors[0] = vec3(0.2);
	colors[1] = vec3(0.7, 0.1, 0.2);
	colors[2] = vec3(0.3, 0.9, 0.5);

	// pretty much just blinn-phong from my grahpics textbook
	vec3 l = lightPos - point;
	vec3 n = normal(point);
	vec3 e = eye - point;
	vec3 h = normalize(e + l);
	vec3 c = colors[objectIndex];
	float lightDistance = length(l);	
	float lightIntensity = 2.0;
	float diffuse = max(0.0, dot(l, n)) * 1.0/pow(lightDistance, 2.0);
	float specular = pow(max(0.0, dot(h, n)), 24.0);
	float ambient = 0.011; // no lighting involved
	vec3 color = lightIntensity * ((diffuse * c) + specular) + ambient * c;
	return color;
}

vec3 gammaCorrect (vec3 color) {
	const float gammaFactor = 1.0/2.2; 
    return pow(color.rgb, vec3(gammaFactor));
}

void main() {
	vec2 uv = gl_FragCoord.xy / screenSize;
	uv = uv * 2.0 - 1.0;
	float aspectRatio = screenSize.x / screenSize.y;
	uv.y /= aspectRatio;
	
	float dist;
	int iterations;
	vec2 result;

	vec3 ray = normalize(vec3(uv, -5.0)); // MAGIC: distance to the eye-plane. kinda works like inverse FoV. 
	vec3 point = eye; // start at camera 
	do {
		result = distanceField(point); // returns dist, obj
		dist = result.s;
		point += ray * max(dist, minStepSize);

		if (iterations++ > maxIterations){ discard; }
	} while (dist > epsilon);

	vec3 color = shade(point, int(result.t));

	FragColor.rgb = gammaCorrect(color);
}