package com.tajvid.app.plugins;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.video.FileOutputOptions;
import androidx.camera.video.Quality;
import androidx.camera.video.QualitySelector;
import androidx.camera.video.Recorder;
import androidx.camera.video.Recording;
import androidx.camera.video.VideoCapture;
import androidx.camera.video.VideoRecordEvent;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "TajVidCamera")
public class TajVidCameraPlugin extends Plugin {

    private ActivityResultLauncher<Intent> galleryLauncher;

    private static final int CAMERA_PERMISSION_REQUEST = 7001;
    private static final int GALLERY_REQUEST = 7002;

    private FrameLayout root;
    private PreviewView previewView;
    private TextView timerText;
    private TextView modePhoto;
    private TextView modeVideo;
    private TextView recordText;

    private ImageButton closeButton;
    private ImageButton flashButton;
    private ImageButton flipButton;
    private ImageButton galleryButton;

    private FrameLayout captureButton;

    private ProcessCameraProvider cameraProvider;
    private Camera camera;

    private ImageCapture imageCapture;
    private VideoCapture<Recorder> videoCapture;
    private Recording recording;

    private CameraSelector cameraSelector =
        CameraSelector.DEFAULT_BACK_CAMERA;

    private boolean photoMode = false;
    private boolean flashEnabled = false;

    private long recordingStartedAt = 0L;

    private final ExecutorService cameraExecutor =
        Executors.newSingleThreadExecutor();

    private Runnable timerRunnable;

    @PluginMethod
    public void open(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.CAMERA
            ) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED) {

                ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{
                        Manifest.permission.CAMERA,
                        Manifest.permission.RECORD_AUDIO
                    },
                    CAMERA_PERMISSION_REQUEST
                );

                pendingOpenCall = call;
                return;
            }

            openCameraScreen();
            call.resolve();
        });
    }

    private PluginCall pendingOpenCall;

    @Override
    protected void handleOnActivityResult(
        int requestCode,
        int resultCode,
        Intent data
    ) {
        super.handleOnActivityResult(
            requestCode,
            resultCode,
            data
        );

        if (requestCode != GALLERY_REQUEST) {
            return;
        }

        if (resultCode != Activity.RESULT_OK ||
            data == null ||
            data.getData() == null) {
            return;
        }

        Uri uri = data.getData();

        String type = getContext()
            .getContentResolver()
            .getType(uri);

        if (type == null) {
            type = "video/*";
        }

        String mediaType =
            type.startsWith("image/")
                ? "image"
                : "video";

        sendMediaToWeb(uri, mediaType);
    }


    @PluginMethod
    public void close(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            closeCameraView();
            call.resolve();
        });
    }

    private void openCameraScreen() {
        if (root != null) {
            return;
        }

        Activity activity = getActivity();

        activity.runOnUiThread(() -> {
            Window window = activity.getWindow();

            window.setStatusBarColor(Color.BLACK);
            window.setNavigationBarColor(Color.BLACK);

            window.addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );

            root = new FrameLayout(activity);
            root.setBackgroundColor(Color.BLACK);

            previewView = new PreviewView(activity);
            previewView.setImplementationMode(
                PreviewView.ImplementationMode.COMPATIBLE
            );
            previewView.setScaleType(
                PreviewView.ScaleType.FILL_CENTER
            );

            root.addView(
                previewView,
                new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            );

            createTopControls(activity);
            createBottomControls(activity);
            createModeSelector(activity);
            createTimer(activity);

            activity.addContentView(
                root,
                new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            );

            startCamera();
        });
    }

    private void createTopControls(Context context) {
        LinearLayout top =
            new LinearLayout(context);

        top.setOrientation(
            LinearLayout.HORIZONTAL
        );

        top.setGravity(Gravity.CENTER_VERTICAL);

        top.setPadding(
            18,
            22,
            18,
            10
        );

        top.setBackgroundColor(
            Color.TRANSPARENT
        );

        FrameLayout.LayoutParams params =
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                80
            );

        params.gravity = Gravity.TOP;

        root.addView(top, params);

        closeButton = makeButton(
            context,
            "×"
        );

        flashButton = makeButton(
            context,
            "⚡"
        );

        flipButton = makeButton(
            context,
            "↻"
        );

        TextView title =
            new TextView(context);

        title.setText("TajVid");
        title.setTextColor(Color.WHITE);
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(
            null,
            android.graphics.Typeface.BOLD
        );

        LinearLayout.LayoutParams titleParams =
            new LinearLayout.LayoutParams(
                0,
                60,
                1
            );

        top.addView(
            closeButton,
            new LinearLayout.LayoutParams(
                58,
                60
            )
        );

        top.addView(
            title,
            titleParams
        );

        top.addView(
            flashButton,
            new LinearLayout.LayoutParams(
                58,
                60
            )
        );

        top.addView(
            flipButton,
            new LinearLayout.LayoutParams(
                58,
                60
            )
        );

        closeButton.setOnClickListener(
            v -> closeCameraView()
        );

        flashButton.setOnClickListener(
            v -> toggleFlash()
        );

        flipButton.setOnClickListener(
            v -> flipCamera()
        );
    }

    private ImageButton makeButton(
        Context context,
        String text
    ) {
        ImageButton button =
            new ImageButton(context);

        button.setBackgroundColor(
            Color.TRANSPARENT
        );

        button.setColorFilter(
            Color.WHITE
        );

        button.setContentDescription(text);

        TextView label =
            new TextView(context);

        label.setText(text);
        label.setTextColor(Color.WHITE);
        label.setTextSize(28);
        label.setGravity(Gravity.CENTER);

        button.setImageDrawable(
            new TextDrawable(
                text,
                Color.WHITE,
                28
            )
        );

        return button;
    }

    private void createBottomControls(Context context) {
        LinearLayout bottom =
            new LinearLayout(context);

        bottom.setOrientation(
            LinearLayout.VERTICAL
        );

        bottom.setGravity(
            Gravity.CENTER_HORIZONTAL
        );

        bottom.setPadding(
            20,
            10,
            20,
            28
        );

        FrameLayout.LayoutParams params =
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                230
            );

        params.gravity = Gravity.BOTTOM;

        root.addView(bottom, params);

        LinearLayout actions =
            new LinearLayout(context);

        actions.setGravity(
            Gravity.CENTER_VERTICAL
        );

        actions.setOrientation(
            LinearLayout.HORIZONTAL
        );

        galleryButton = makeButton(
            context,
            "▣"
        );

        TextView galleryLabel =
            new TextView(context);

        galleryLabel.setText("Gallery");
        galleryLabel.setTextColor(Color.WHITE);
        galleryLabel.setTextSize(12);
        galleryLabel.setGravity(Gravity.CENTER);

        LinearLayout galleryBox =
            new LinearLayout(context);

        galleryBox.setOrientation(
            LinearLayout.VERTICAL
        );

        galleryBox.setGravity(Gravity.CENTER);

        galleryBox.addView(
            galleryButton,
            new LinearLayout.LayoutParams(
                60,
                60
            )
        );

        galleryBox.addView(
            galleryLabel,
            new LinearLayout.LayoutParams(
                90,
                30
            )
        );

        captureButton =
            new FrameLayout(context);

        FrameLayout outer =
            new FrameLayout(context);

        outer.setBackground(
            new CircleDrawable(
                Color.WHITE,
                78
            )
        );

        FrameLayout inner =
            new FrameLayout(context);

        inner.setBackground(
            new CircleDrawable(
                Color.BLACK,
                68
            )
        );

        outer.addView(
            inner,
            new FrameLayout.LayoutParams(
                68,
                68,
                Gravity.CENTER
            )
        );

        captureButton.addView(
            outer,
            new FrameLayout.LayoutParams(
                82,
                82,
                Gravity.CENTER
            )
        );

        LinearLayout.LayoutParams captureParams =
            new LinearLayout.LayoutParams(
                110,
                100
            );

        LinearLayout spacer =
            new LinearLayout(context);

        spacer.setLayoutParams(
            new LinearLayout.LayoutParams(
                90,
                1,
                1
            )
        );

        actions.addView(galleryBox);
        actions.addView(spacer);
        actions.addView(
            captureButton,
            captureParams
        );

        LinearLayout spacer2 =
            new LinearLayout(context);

        spacer2.setLayoutParams(
            new LinearLayout.LayoutParams(
                90,
                1,
                1
            )
        );

        actions.addView(spacer2);

        bottom.addView(
            actions,
            new LinearLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                105
            )
        );

        galleryButton.setOnClickListener(
            v -> openGallery()
        );

        captureButton.setOnClickListener(
            v -> {
                if (photoMode) {
                    takePhoto();
                } else {
                    if (recording == null) {
                        startRecording();
                    } else {
                        stopRecording();
                    }
                }
            }
        );

        recordText =
            new TextView(context);

        recordText.setText("");
        recordText.setTextColor(Color.WHITE);
        recordText.setTextSize(13);
        recordText.setGravity(Gravity.CENTER);

        bottom.addView(
            recordText,
            new LinearLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                35
            )
        );
    }

    private void createModeSelector(Context context) {
        LinearLayout modes =
            new LinearLayout(context);

        modes.setOrientation(
            LinearLayout.HORIZONTAL
        );

        modes.setGravity(Gravity.CENTER);

        modes.setPadding(
            20,
            5,
            20,
            0
        );

        FrameLayout.LayoutParams params =
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                55
            );

        params.gravity =
            Gravity.BOTTOM;

        params.bottomMargin = 245;

        root.addView(modes, params);

        modeVideo =
            new TextView(context);

        modePhoto =
            new TextView(context);

        modeVideo.setText("VIDEO");
        modePhoto.setText("PHOTO");

        modeVideo.setTextSize(14);
        modePhoto.setTextSize(14);

        modeVideo.setGravity(Gravity.CENTER);
        modePhoto.setGravity(Gravity.CENTER);

        modeVideo.setPadding(
            28,
            8,
            28,
            8
        );

        modePhoto.setPadding(
            28,
            8,
            28,
            8
        );

        modes.addView(modeVideo);
        modes.addView(modePhoto);

        updateModeUI();

        modeVideo.setOnClickListener(
            v -> {
                if (recording != null) {
                    return;
                }

                photoMode = false;
                updateModeUI();
            }
        );

        modePhoto.setOnClickListener(
            v -> {
                if (recording != null) {
                    return;
                }

                photoMode = true;
                updateModeUI();
            }
        );
    }

    private void updateModeUI() {
        if (modeVideo == null || modePhoto == null) {
            return;
        }

        modeVideo.setTextColor(
            photoMode
                ? Color.LTGRAY
                : Color.WHITE
        );

        modePhoto.setTextColor(
            photoMode
                ? Color.WHITE
                : Color.LTGRAY
        );
    }

    private void createTimer(Context context) {
        timerText =
            new TextView(context);

        timerText.setText("");
        timerText.setTextColor(Color.WHITE);
        timerText.setTextSize(17);
        timerText.setGravity(Gravity.CENTER);

        FrameLayout.LayoutParams params =
            new FrameLayout.LayoutParams(
                120,
                55
            );

        params.gravity =
            Gravity.TOP | Gravity.CENTER_HORIZONTAL;

        params.topMargin = 92;

        root.addView(timerText, params);
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future =
            ProcessCameraProvider.getInstance(
                getContext()
            );

        future.addListener(
            () -> {
                try {
                    cameraProvider =
                        future.get();

                    bindCamera();

                } catch (Exception e) {
                    e.printStackTrace();
                }
            },
            ContextCompat.getMainExecutor(
                getContext()
            )
        );
    }

    private void bindCamera() {
        if (cameraProvider == null ||
            previewView == null) {
            return;
        }

        Preview preview =
            new Preview.Builder()
                .build();

        imageCapture =
            new ImageCapture.Builder()
                .setCaptureMode(
                    ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY
                )
                .build();

        Recorder recorder =
            new Recorder.Builder()
                .setQualitySelector(
                    QualitySelector.from(
                        Quality.HIGHEST
                    )
                )
                .build();

        videoCapture =
            VideoCapture.withOutput(
                recorder
            );

        try {
            cameraProvider.unbindAll();

            camera =
                cameraProvider.bindToLifecycle(
                    getActivity(),
                    cameraSelector,
                    preview,
                    imageCapture,
                    videoCapture
                );

            preview.setSurfaceProvider(
                previewView.getSurfaceProvider()
            );

            updateFlashState();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void toggleFlash() {
        if (camera == null ||
            !camera.getCameraInfo().hasFlashUnit()) {
            return;
        }

        flashEnabled = !flashEnabled;

        camera.getCameraControl()
            .enableTorch(flashEnabled);

        flashButton.setAlpha(
            flashEnabled ? 1f : 0.5f
        );
    }

    private void updateFlashState() {
        if (camera == null ||
            flashButton == null) {
            return;
        }

        if (!camera.getCameraInfo().hasFlashUnit()) {
            flashButton.setAlpha(0.25f);
            return;
        }

        camera.getCameraControl()
            .enableTorch(flashEnabled);

        flashButton.setAlpha(
            flashEnabled ? 1f : 0.5f
        );
    }

    private void flipCamera() {
        if (recording != null) {
            return;
        }

        if (cameraSelector ==
            CameraSelector.DEFAULT_BACK_CAMERA) {

            cameraSelector =
                CameraSelector.DEFAULT_FRONT_CAMERA;

        } else {

            cameraSelector =
                CameraSelector.DEFAULT_BACK_CAMERA;
        }

        bindCamera();
    }

    private void takePhoto() {
        if (imageCapture == null) {
            return;
        }

        File file =
            createMediaFile("jpg");

        ImageCapture.OutputFileOptions options =
            new ImageCapture.OutputFileOptions.Builder(
                file
            ).build();

        imageCapture.takePicture(
            options,
            ContextCompat.getMainExecutor(
                getContext()
            ),
            new ImageCapture.OnImageSavedCallback() {

                @Override
                public void onImageSaved(
                    @NonNull ImageCapture.OutputFileResults output
                ) {
                    Uri uri =
                        Uri.fromFile(file);

                    sendMediaToWeb(
                        uri,
                        "image"
                    );
                }

                @Override
                public void onError(
                    @NonNull ImageCaptureException exception
                ) {
                    exception.printStackTrace();
                }
            }
        );
    }

    private void startRecording() {
        if (videoCapture == null ||
            recording != null) {
            return;
        }

        File file =
            createMediaFile("mp4");

        FileOutputOptions outputOptions =
            new FileOutputOptions.Builder(file)
                .build();

        recordingStartedAt =
            System.currentTimeMillis();

        recording =
            videoCapture.getOutput()
                .prepareRecording(
                    getContext(),
                    outputOptions
                )
                .withAudioEnabled()
                .start(
                    ContextCompat.getMainExecutor(
                        getContext()
                    ),
                    event -> {
                        if (event instanceof
                            VideoRecordEvent.Start) {

                            getActivity().runOnUiThread(
                                () -> {
                                    recordText.setText(
                                        "● Recording"
                                    );

                                    captureButton.setAlpha(
                                        0.65f
                                    );

                                    startTimer();
                                }
                            );

                        } else if (event instanceof
                            VideoRecordEvent.Finalize) {

                            VideoRecordEvent.Finalize finalize =
                                (VideoRecordEvent.Finalize) event;

                            Recording current =
                                recording;

                            recording = null;

                            stopTimer();

                            getActivity().runOnUiThread(
                                () -> {
                                    captureButton.setAlpha(1f);
                                    recordText.setText("");

                                    if (!finalize.hasError()) {
                                        sendMediaToWeb(
                                            Uri.fromFile(file),
                                            "video"
                                        );
                                    }
                                }
                            );
                        }
                    }
                );
    }

    private void stopRecording() {
        if (recording == null) {
            return;
        }

        recording.stop();
    }

    private void startTimer() {
        timerRunnable =
            new Runnable() {
                @Override
                public void run() {
                    if (recording == null) {
                        return;
                    }

                    long elapsed =
                        System.currentTimeMillis()
                        - recordingStartedAt;

                    long seconds =
                        elapsed / 1000;

                    long minutes =
                        seconds / 60;

                    seconds %= 60;

                    String value =
                        String.format(
                            Locale.US,
                            "%02d:%02d",
                            minutes,
                            seconds
                        );

                    timerText.setText(value);

                    timerText.postDelayed(
                        this,
                        500
                    );
                }
            };

        timerText.post(timerRunnable);
    }

    private void stopTimer() {
        if (timerText != null &&
            timerRunnable != null) {
            timerText.removeCallbacks(
                timerRunnable
            );

            timerText.setText("");
        }

        timerRunnable = null;
    }

    @Override
    public void load() {
        super.load();

        galleryLauncher =
            getActivity().registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == android.app.Activity.RESULT_OK
                            && result.getData() != null
                            && result.getData().getData() != null) {

                        Uri selectedUri =
                            result.getData().getData();

                        String mimeType =
                            getContext()
                                .getContentResolver()
                                .getType(selectedUri);

                        String mediaType =
                            mimeType != null &&
                            mimeType.startsWith("image/")
                                ? "image"
                                : "video";

                        sendMediaToWeb(
                            selectedUri,
                            mediaType
                        );

                        getActivity().runOnUiThread(() -> {
                            closeCameraView();
                        });
                    }
                }
            );
    }

    private void openGallery() {
        if (galleryLauncher == null) {
            return;
        }

        Intent intent =
            new Intent(Intent.ACTION_GET_CONTENT);

        intent.addCategory(
            Intent.CATEGORY_OPENABLE
        );

        intent.setType("*/*");

        intent.putExtra(
            Intent.EXTRA_MIME_TYPES,
            new String[]{
                "image/*",
                "video/*"
            }
        );

        galleryLauncher.launch(intent);
    }

    private File createMediaFile(
        String extension
    ) {
        File directory =
            new File(
                getContext().getCacheDir(),
                "tajvid_media"
            );

        if (!directory.exists()) {
            directory.mkdirs();
        }

        String time =
            new SimpleDateFormat(
                "yyyyMMdd_HHmmss_SSS",
                Locale.US
            ).format(new Date());

        return new File(
            directory,
            "TajVid_" + time + "." + extension
        );
    }

    private void sendMediaToWeb(
        Uri uri,
        String mediaType
    ) {
        try {
            File sourceFile;

            if ("file".equals(
                uri.getScheme()
            )) {

                sourceFile =
                    new File(
                        uri.getPath()
                    );

            } else {

                sourceFile =
                    copyUriToCache(
                        uri,
                        mediaType
                    );
            }

            JSObject result =
                new JSObject();

            result.put(
                "path",
                sourceFile.getAbsolutePath()
            );

            result.put(
                "uri",
                Uri.fromFile(
                    sourceFile
                ).toString()
            );

            result.put(
                "type",
                mediaType
            );

            notifyListeners(
                "mediaCaptured",
                result
            );

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private File copyUriToCache(
        Uri uri,
        String mediaType
    ) throws Exception {

        String extension =
            mediaType.equals("image")
                ? ".jpg"
                : ".mp4";

        File output =
            createMediaFile(
                extension.substring(1)
            );

        ContentResolver resolver =
            getContext()
                .getContentResolver();

        try (
            InputStream input =
                resolver.openInputStream(uri);

            FileOutputStream outputStream =
                new FileOutputStream(output)
        ) {

            byte[] buffer =
                new byte[8192];

            int length;

            while (
                (length = input.read(buffer))
                    != -1
            ) {
                outputStream.write(
                    buffer,
                    0,
                    length
                );
            }
        }

        return output;
    }

    private void closeCameraView() {
        Activity activity =
            getActivity();

        activity.runOnUiThread(() -> {

            if (recording != null) {
                recording.stop();
                recording = null;
            }

            stopTimer();

            if (cameraProvider != null) {
                cameraProvider.unbindAll();
                cameraProvider = null;
            }

            if (root != null) {
                View parent =
                    (View) root.getParent();

                if (parent instanceof
                    android.view.ViewGroup) {

                    ((android.view.ViewGroup) parent)
                        .removeView(root);
                }
            }

            root = null;
            previewView = null;
            camera = null;
            imageCapture = null;
            videoCapture = null;

            activity.getWindow()
                .clearFlags(
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                );
        });
    }

    private static class CircleDrawable
        extends android.graphics.drawable.Drawable {

        private final int color;
        private final float radius;

        CircleDrawable(
            int color,
            float radius
        ) {
            this.color = color;
            this.radius = radius;
        }

        @Override
        public void draw(
            @NonNull android.graphics.Canvas canvas
        ) {
            android.graphics.Paint paint =
                new android.graphics.Paint(
                    android.graphics.Paint.ANTI_ALIAS_FLAG
                );

            paint.setColor(color);

            canvas.drawCircle(
                getBounds().centerX(),
                getBounds().centerY(),
                Math.min(
                    getBounds().width(),
                    getBounds().height()
                ) / 2f,
                paint
            );
        }

        @Override
        public void setAlpha(int alpha) {}

        @Override
        public void setColorFilter(
            android.graphics.ColorFilter filter
        ) {}

        @Override
        public int getOpacity() {
            return android.graphics.PixelFormat.TRANSLUCENT;
        }
    }

    private static class TextDrawable
        extends android.graphics.drawable.Drawable {

        private final String text;
        private final int color;
        private final float size;

        TextDrawable(
            String text,
            int color,
            float size
        ) {
            this.text = text;
            this.color = color;
            this.size = size;
        }

        @Override
        public void draw(
            @NonNull android.graphics.Canvas canvas
        ) {
            android.graphics.Paint paint =
                new android.graphics.Paint(
                    android.graphics.Paint.ANTI_ALIAS_FLAG
                );

            paint.setColor(color);
            paint.setTextSize(size);
            paint.setTextAlign(
                android.graphics.Paint.Align.CENTER
            );

            android.graphics.Paint.FontMetrics metrics =
                paint.getFontMetrics();

            float y =
                getBounds().centerY()
                - (metrics.ascent + metrics.descent) / 2;

            canvas.drawText(
                text,
                getBounds().centerX(),
                y,
                paint
            );
        }

        @Override
        public void setAlpha(int alpha) {}

        @Override
        public void setColorFilter(
            android.graphics.ColorFilter filter
        ) {}

        @Override
        public int getOpacity() {
            return android.graphics.PixelFormat.TRANSLUCENT;
        }
    }
}
