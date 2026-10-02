package com.tajvid.app.plugins;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "TajVidMedia")
public class TajVidMediaPlugin extends Plugin {

    @Override
    public void load() {
        super.load();
    }

    @com.getcapacitor.PluginMethod
    public void saveVideo(PluginCall call) {
        String fileName = call.getString("fileName");
        String base64Data = call.getString("data");

        if (fileName == null || fileName.isEmpty()) {
            call.reject("fileName is required");
            return;
        }

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("data is required");
            return;
        }

        Uri videoUri = null;

        try {
            byte[] videoBytes =
                    Base64.decode(
                            base64Data,
                            Base64.DEFAULT
                    );

            Context context = getContext();
            ContentResolver resolver =
                    context.getContentResolver();

            ContentValues values =
                    new ContentValues();

            values.put(
                    MediaStore.Video.Media.DISPLAY_NAME,
                    fileName
            );

            values.put(
                    MediaStore.Video.Media.MIME_TYPE,
                    "video/mp4"
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(
                        MediaStore.Video.Media.RELATIVE_PATH,
                        Environment.DIRECTORY_MOVIES
                                + "/TajVid"
                );

                values.put(
                        MediaStore.Video.Media.IS_PENDING,
                        1
                );
            }

            Uri collection =
                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI;

            videoUri =
                    resolver.insert(
                            collection,
                            values
                    );

            if (videoUri == null) {
                call.reject(
                        "Unable to create media file"
                );
                return;
            }

            try (OutputStream outputStream =
                         resolver.openOutputStream(
                                 videoUri
                         )) {

                if (outputStream == null) {
                    throw new Exception(
                            "Unable to open media output"
                    );
                }

                outputStream.write(videoBytes);
                outputStream.flush();
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues complete =
                        new ContentValues();

                complete.put(
                        MediaStore.Video.Media.IS_PENDING,
                        0
                );

                resolver.update(
                        videoUri,
                        complete,
                        null,
                        null
                );
            }

            JSObject result =
                    new JSObject();

            result.put(
                    "uri",
                    videoUri.toString()
            );

            result.put(
                    "fileName",
                    fileName
            );

            call.resolve(result);

        } catch (Exception error) {

            if (videoUri != null) {
                try {
                    getContext()
                            .getContentResolver()
                            .delete(
                                    videoUri,
                                    null,
                                    null
                            );
                } catch (Exception ignored) {
                }
            }

            call.reject(
                    "Unable to save video: "
                            + error.getMessage(),
                    error
            );
        }
    }

    @com.getcapacitor.PluginMethod
    public void shareVideo(PluginCall call) {

        String uriString =
                call.getString("uri");

        if (uriString == null ||
                uriString.isEmpty()) {

            call.reject(
                    "uri is required"
            );

            return;
        }

        try {

            Uri videoUri =
                    Uri.parse(uriString);

            Intent shareIntent =
                    new Intent(
                            Intent.ACTION_SEND
                    );

            shareIntent.setType(
                    "video/mp4"
            );

            shareIntent.putExtra(
                    Intent.EXTRA_STREAM,
                    videoUri
            );

            shareIntent.addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
            );

            Intent chooser =
                    Intent.createChooser(
                            shareIntent,
                            "Share video"
                    );

            getActivity().startActivity(
                    chooser
            );

            JSObject result =
                    new JSObject();

            result.put(
                    "shared",
                    true
            );

            call.resolve(result);

        } catch (Exception error) {

            call.reject(
                    "Unable to share video: "
                            + error.getMessage(),
                    error
            );
        }
    }
}
