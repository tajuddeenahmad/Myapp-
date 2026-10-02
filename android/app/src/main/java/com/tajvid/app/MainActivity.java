package com.tajvid.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import com.tajvid.app.plugins.TajVidMediaPlugin;
import com.tajvid.app.plugins.TajVidCameraPlugin;
import com.tajvid.app.plugins.TajVidNativeAdPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {

        registerPlugin(TajVidMediaPlugin.class);
        registerPlugin(TajVidCameraPlugin.class);
        registerPlugin(TajVidNativeAdPlugin.class);

        super.onCreate(savedInstanceState);
    }
}
