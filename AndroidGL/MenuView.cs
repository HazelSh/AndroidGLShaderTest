using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

using Android.App;
using Android.Content;
using Android.OS;
using Android.Runtime;
using Android.Views;
using Android.Widget;

namespace AndroidGL
{
    [Activity(Label = "@string/app_name", Theme = "@style/AppTheme", Icon = "@mipmap/android_gl_icon", MainLauncher = true)]
    public class MenuView : ListActivity
    {
        protected override void OnCreate(Bundle savedInstanceState)
        {
            base.OnCreate(savedInstanceState);

            string[] shaderFilenames = Assets.List("shaders");

            this.ListAdapter = new ArrayAdapter<string>(this, Android.Resource.Layout.SimpleListItem1, shaderFilenames);           
        }
        
        protected override void OnListItemClick(ListView l, View v, int position, long id)
        {
            base.OnListItemClick(l, v, position, id);

            // probably will break for more complicated list-item layouts
            string filename = ((TextView)v).Text;

            Toast.MakeText(this, "Starting renderer for " + filename, ToastLength.Short).Show();
            
            Intent intent = new Intent(this, typeof(MainActivity));
            intent.PutExtra("filename", filename);
            StartActivity(intent);
        }
    }
}