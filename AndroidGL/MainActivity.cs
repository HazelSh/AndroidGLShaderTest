using Android.App;
using Android.OS;
using Android.Runtime;
using Android.Widget;
using Android.Content;
using Android.Util;

using System;
using System.Text;
using System.IO;

using OpenTK;
using OpenTK.Graphics;
using OpenTK.Graphics.ES31;
using OpenTK.Platform.Android;

using Boolean = OpenTK.Graphics.ES31.Boolean;


/// TODO:
/// change drawing code to use index buffer and drawElements
/// port over raymarcher fragment shader from old project

namespace AndroidGL {

    // Renderer view
    [Activity(Label = "@string/app_name", Theme = "@style/AppTheme", Icon = "@mipmap/android_gl_icon")]
    public class MainActivity : Activity {

        protected override void OnCreate(Bundle savedInstanceState) {

            base.OnCreate(savedInstanceState);

            DisplayMetrics display = new DisplayMetrics();
            this.WindowManager.DefaultDisplay.GetMetrics(display); // modifies display

            AndroidGameView gameView = new myGLView(this, 
                new Size(display.WidthPixels, display.HeightPixels),
                this.Intent.GetStringExtra("filename"));

            SetContentView(gameView);

            gameView.Run(30.0);
        }

    }
    
    public class myGLView : AndroidGameView {

        // initialized with 
        Activity context;
        Size screensize;
        string shaderFilename;

        // state sharing between methods
        int androidGLprogram;
        uint vao;

        // as normalized device coords -- no model/view/projection/camera transforms yet
        float[] vertices = new float[] { -0.98f,  0.98f, 0.0f,    // top left
                                         -0.98f, -0.98f, 0.0f,    // bottom left
                                          0.98f, -0.98f, 0.0f,    // bottom right
                                         -0.98f,  0.98f, 0.0f,    // top left again -- set up ebo/drawElements at some point
                                          0.98f, -0.98f, 0.0f,    // bottom right again
                                          0.98f,  0.98f, 0.0f };  // top right

        public myGLView (Activity activity, Size size, string filename) : base (activity) {
            screensize = size;
            context = activity;
            shaderFilename = filename;
        }

        // really simple method for putting strings on screen
        // dialogs are better than toasts if there's any chance of getting 3 at once
        public void ShowDialog(string message) {
            AlertDialog.Builder dialogBuilder = new AlertDialog.Builder(context);
            dialogBuilder.SetMessage(message);
            AlertDialog dialog = dialogBuilder.Create();
            dialog.Show();
        }

        public void GlErrorCheck() {
            ErrorCode glError;
            bool error = false;
            StringBuilder output = new StringBuilder();

            // have to call glGetError in a loop! it pops an error-stack which can gain multiple entries at once
            glError = GL.GetErrorCode();
            while(glError != ErrorCode.NoError) {
                error = true;
                output.AppendLine(Enum.GetName(typeof(ErrorCode), glError));
                glError = GL.GetErrorCode();
            }
            string message = output.ToString();

            // in past, checked if error was empty string, but that failed on hardware with empty dialogs -- maybe other whitespace?
            if (error) { ShowDialog("OpenGL error: " + message); } 
        }

        public int LoadShader(ShaderType type, string code) {

            int s = GL.CreateShader(type);
            GL.ShaderSource(s, code);
            GL.CompileShader(s);

            // shader error checking
            int compileStatus;
            GL.GetShader(s, ShaderParameter.CompileStatus, out compileStatus);
            if (compileStatus == (int)Boolean.False) {
                ShowDialog("Shader-compile error: " + GL.GetShaderInfoLog(s));
            }

            return s;
        }

        public int LoadProgram(string VertexCode, string FragmentCode) {

            int p = GL.CreateProgram();
            int vertex = LoadShader(ShaderType.VertexShader, VertexCode);
            int fragment = LoadShader(ShaderType.FragmentShader, FragmentCode);
            GL.AttachShader(p, vertex);
            GL.AttachShader(p, fragment);
            GL.LinkProgram(p);
            GL.ValidateProgram(p);
            GL.DeleteShader(vertex); // flags shader for deletion when detached
            GL.DeleteShader(fragment);

            // program error checking
            int linkStatus;
            int validationStatus;
            GL.GetProgram(p, ProgramParameter.LinkStatus, out linkStatus);
            GL.GetProgram(p, ProgramParameter.ValidateStatus, out validationStatus);
            if (linkStatus == (int)Boolean.False || validationStatus == (int)Boolean.False) {
                ShowDialog("OpenGL Program linking/validation error: " + GL.GetProgramInfoLog(p));
            }

            return p;
        }

        protected override void CreateFrameBuffer() {
            this.ContextRenderingApi = GLVersion.ES3;
            base.CreateFrameBuffer();
        }

        protected override void OnLoad(EventArgs e) {
            base.OnLoad(e);

            GL.ClearColor(0.2f, 0.2f, 0.2f, 1.0f); // slate grey

            GL.Viewport(0, 0, screensize.Width, screensize.Height);

            // read shader source
            string vertexCode;
            using (StreamReader s = new StreamReader(context.Assets.Open("vertex.glsl"))) {
                vertexCode = s.ReadToEnd();
            }

            string fragmentCode;
            using (StreamReader s = new StreamReader(context.Assets.Open("shaders/" + shaderFilename))) {
                fragmentCode = s.ReadToEnd();
            }

            // setup program
            androidGLprogram = LoadProgram(vertexCode, fragmentCode);

            // setup uniforms
            GL.UseProgram(androidGLprogram);
            GL.Uniform2(GL.GetUniformLocation(androidGLprogram, "screenSize"), (float)screensize.Width, (float)screensize.Height);

            // setup to update time per-frame
            initialTime = SystemClock.ElapsedRealtime();
            timeLocation = GL.GetUniformLocation(androidGLprogram, "time");

            // setup vao
            GL.GenVertexArrays(1, out vao);
            GL.BindVertexArray(vao);

            // in context for the vao, load vertices via vbo
            uint vbo;
            GL.GenBuffers(1, out vbo);
            GL.BindBuffer(BufferTarget.ArrayBuffer, vbo);
            GL.BufferData<float>(BufferTarget.ArrayBuffer, (IntPtr)Buffer.ByteLength(vertices), vertices, BufferUsage.StaticDraw);
            GL.VertexAttribPointer(0, 3, VertexAttribPointerType.Float, false, 0, IntPtr.Zero);
            GL.EnableVertexAttribArray(0);

            GlErrorCheck();
        }

        protected override void OnUpdateFrame(FrameEventArgs e) {
            base.OnUpdateFrame(e);
            // world sim (physics timestep) goes here?
        }

        long currentTime;
        long initialTime;
        int timeLocation;
        protected override void OnRenderFrame(FrameEventArgs e) {
            base.OnRenderFrame(e);
            
            GL.Clear(ClearBufferMask.ColorBufferBit);

            currentTime = SystemClock.ElapsedRealtime();
            GL.UseProgram(androidGLprogram);
            GL.Uniform1(timeLocation, (int)(currentTime - initialTime));

            GL.BindVertexArray(vao);
            GL.DrawArrays(BeginMode.Triangles, 0, 6);

            SwapBuffers();
        }

    }

}