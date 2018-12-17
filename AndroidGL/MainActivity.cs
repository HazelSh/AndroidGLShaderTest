using Android.App;
using Android.OS;
using Android.Runtime;
using Android.Widget;
using Android.Content;
using Android.Util;

using System.Text;
using System;

using OpenTK.Graphics.ES31;
using OpenTK.Graphics;
using OpenTK.Platform.Android;
using OpenTK;

using Boolean = OpenTK.Graphics.ES31.Boolean;

/// TODO:
/// draw a square with element / index buffer and DrawElements
/// pass coords into shader
/// port over raymarcher fragment shader from old project
/// perspective correction!

namespace AndroidGL {

    [Activity(Label = "@string/app_name", Theme = "@style/AppTheme", Icon = "@mipmap/android_gl_icon", MainLauncher = true)]
    public class MainActivity : Activity {

        protected override void OnCreate(Bundle savedInstanceState) {

            base.OnCreate(savedInstanceState);

            DisplayMetrics display = new DisplayMetrics();
            this.WindowManager.DefaultDisplay.GetMetrics(display); // modifies display

            AndroidGameView gameView = new myGLView(this, new Size(display.WidthPixels, display.HeightPixels));
            SetContentView(gameView);

            gameView.Run(30.0);
        }

    }
    
    public class myGLView : AndroidGameView {

        // initialized with 
        Activity context;
        Size screensize;

        // state sharing between methods
        int androidGLprogram;
        uint vao;

        // TODO: move shaders to Android assets
        string vertexCode = @"#version 300 es
layout (location = 0) in vec3 position;

void main() {
    gl_Position = vec4(position, 1.0);
}
";

        string fragmentCode = @"#version 300 es
precision mediump float;

out vec4 FragColor; // in es with only one output, no need to specify location

void main() {
    FragColor = vec4(1.0, 0.8, 0.9, 1.0); // light pink
}
";
        // as normalized device coords -- no model/view/projection/camera transforms yet
        float[] vertices = new float[] {  0.0f,  0.5f, 0.0f,    // top
                                         -0.8f, -0.5f, 0.0f,    // bottom left
                                          0.8f, -0.5f, 0.0f };  // bottom right

        public myGLView (Activity activity, Size size) : base (activity) {
            screensize = size;
            context = activity;
        }

        public void ShowDialog(string message)
        {
            AlertDialog.Builder dialogBuilder = new AlertDialog.Builder(context);
            dialogBuilder.SetMessage(message);
            AlertDialog dialog = dialogBuilder.Create();
            dialog.Show();
        }

        public void GlErrorCheck() {
            ErrorCode glError;
            StringBuilder output = new StringBuilder();

            glError = GL.GetErrorCode();
            while(glError != ErrorCode.NoError) {
                output.AppendLine(Enum.GetName(typeof(ErrorCode), glError));
                glError = GL.GetErrorCode();
            }
            string message = output.ToString();
            if (message != "") {
                ShowDialog(message);
            }
        }

        public int LoadShader(ShaderType type, string code) {

            int s = GL.CreateShader(type);
            GL.ShaderSource(s, code);
            GL.CompileShader(s);

            // shader error checking
            int compileStatus;
            GL.GetShader(s, ShaderParameter.CompileStatus, out compileStatus);
            if (compileStatus == (int)Boolean.False) {
                ShowDialog(GL.GetShaderInfoLog(s));
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
            GL.DeleteShader(vertex); // flags shader for deletion when detached
            GL.DeleteShader(fragment);

            // program error checking
            int linkStatus;
            int validationStatus;
            GL.GetProgram(p, ProgramParameter.LinkStatus, out linkStatus);
            GL.GetProgram(p, ProgramParameter.ValidateStatus, out validationStatus);
            if (linkStatus == (int)Boolean.False || validationStatus == (int)Boolean.False) {
                ShowDialog(GL.GetProgramInfoLog(p));
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
            
            // setup program and VAO for renderer
            androidGLprogram = LoadProgram(vertexCode, fragmentCode);

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
        }

        protected override void OnRenderFrame(FrameEventArgs e) {
            base.OnRenderFrame(e);

            GL.Clear(ClearBufferMask.ColorBufferBit);

            GL.UseProgram(androidGLprogram);
            GL.BindVertexArray(vao);
            GL.DrawArrays(BeginMode.Triangles, 0, 3);

            // GlErrorCheck();

            SwapBuffers();
        }

    }

}