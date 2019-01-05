#version 300 es
precision mediump float;

out vec4 FragColor; // in es with only one output, no need to specify location

uniform vec2 screenSize;
uniform int time; // in millisecs

void main() {
	vec2 uv = gl_FragCoord.xy / screenSize; // TODO: add aspect ratio correction
	
	// triangluar transform 
	float anim = abs(0.5-fract(float(time) / 8000.0)); // 8s cycle

    // red/green vary across screen, blue across time
	vec4 color = vec4(uv, anim, 1.0);

	// gamma correction
	float gamma = 2.2; 
    FragColor.rgb = pow(color.rgb, vec3(1.0/gamma));
}
